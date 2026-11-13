import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ILocalAudioTrack, ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { EventSource } from '../binding/EventSource.js';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { HttpClient } from '../net/http/HttpClient.js';
import { VideoAntiCheatConfig, VideoModel } from '../logic/VideoModel.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import { AgoraConfig } from './AgoraConfig.js';
export type VideoTrack = ILocalVideoTrack | IRemoteVideoTrack;
/** One RTC client per room. Poker messages still travel exclusively through the H5 bridge. */
export class TableMedia extends EventSource {
  static readonly CHANGE = 'media-change';
  readonly config: VideoAntiCheatConfig;
  camera = false;
  microphone = false;
  remoteCamera = true;
  remoteMicrophone = true;
  joined = false;
  busy = false;
  maskId = 0;
  speaking = new Set<number>();
  private client?: IAgoraRTCClient;
  private video?: ILocalVideoTrack;
  private audio?: ILocalAudioTrack;
  private disposed = false;
  private generation = 0;
  private identity = '';
  private queue: Promise<unknown> = Promise.resolve();
  private randomActivated = false;
  get canOpCamera(){return this.setting.canOpCamera||this.randomActivated;}
  get canOpMicrophone(){return this.setting.canOpMicrophone||this.randomActivated;}
  get canSwitchMask(){return this.camera&&(this.setting.canSwitchPowerSaving||(this.randomActivated&&this.config.shouldShowVideoMask));}
  private randomStart = 0;
  private randomEnd = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private blockedVideo = new Set<number>();
  private blockedAudio = new Set<number>();
  private lastOrder = false;
  private volumeTimer?: ReturnType<typeof setInterval>;
  private resumeAudio=()=>{for(const user of this.client?.remoteUsers??[])if(user.audioTrack&&!user.audioTrack.isPlaying)user.audioTrack.play();};
  constructor(readonly data: ProtocolRoomData, readonly uid: number, private http: HttpClient,
    private global: GlobalConfigStore, private signal: AbortSignal, private notify: (message: string) => void,
    private matchID: number) {
    super();
    const r = data.record!;
    this.config = new VideoAntiCheatConfig(r.antiCheatType,r.antiCheatTimelimit,r.antiCheatVideoType,
      r.micSeatSwitch===1,r.micMiddleSwitch===1,r.videoSeatSwitch===1,r.videoMiddleSwitch===1,
      r.powerSaving===1,r.powerSavingSeatSwitch===1,r.powerSavingMiddleSwitch===1,r.antiCheatOrderType,r.videoVerifyType);
    if(typeof document!=='undefined')document.addEventListener('pointerdown',this.resumeAudio);
    signal.addEventListener('abort',()=>this.destroy(),{once:true});
  }
  get setting() { return this.config.getSeatedSetting(); }
  get seated() { return !!this.data.snapshot?.playersList.some(p=>p.userRid===this.uid&&p.seatId===this.data.snapshot?.myInfo?.seatId); }
  private changed() { if(!this.disposed)this.emit(TableMedia.CHANGE); }
  private fail(error: unknown) { if(!this.disposed&&!this.signal.aborted)this.notify(error instanceof Error?error.message:String(error)); }
  private run(task:()=>Promise<void>) { const result=this.queue.then(task);this.queue=result.catch(error=>this.fail(error));return result; }
  /** Permission check before Seated, as in CC. Never keep this temporary stream alive. */
  async prepareSeat():Promise<void> {
    if(!this.config.isInVideoRoom)return;
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('当前浏览器不支持摄像头或麦克风，请使用 HTTPS 或本机地址');
    const stream=await navigator.mediaDevices.getUserMedia({video:this.setting.enableCamera,audio:true});
    stream.getTracks().forEach(track=>track.stop());
    this.signal.throwIfAborted();
  }
  private async token(channel:string):Promise<string> {
    const result=await this.http.request<string|{data?:string}>('/api/misc/agora/token',{channel_name:channel,role:1,uid:this.uid},{signal:this.signal});
    const token=typeof result==='string'?result:result?.data;
    if(!token)throw new Error('获取音视频令牌失败');
    return token;
  }
  sync():void {
    if(this.disposed)return;
    const identity=this.config.isInVideoRoom&&this.seated?`${this.data.record?.rid}:${this.matchID}:${this.data.snapshot?.myInfo?.seatId}`:'';
    if(identity!==this.identity){
      this.video?.stop();this.video?.close();this.audio?.stop();this.audio?.close();
      this.identity=identity;const generation=++this.generation;
      this.cancelRandom();this.randomActivated=false;this.camera=false;this.microphone=false;this.joined=false;this.changed();
      void this.run(async()=>{await this.leave();if(identity&&generation===this.generation&&!this.disposed)await this.join(generation);}).catch(()=>{});
    }
    const ids=new Set(this.data.snapshot?.playersList.map(p=>p.userRid));
    for(const id of this.blockedVideo)if(!ids.has(id))this.blockedVideo.delete(id);
    for(const id of this.blockedAudio)if(!ids.has(id))this.blockedAudio.delete(id);
    for(const user of this.client?.remoteUsers??[])if(!ids.has(Number(user.uid))){
      user.videoTrack?.stop();user.audioTrack?.stop();
      if(user.videoTrack)void this.client?.unsubscribe(user,'video').catch(()=>{});
      if(user.audioTrack)void this.client?.unsubscribe(user,'audio').catch(()=>{});
    }
    if(this.joined){
      const own=this.data.snapshot?.operatorList.some(op=>op.seatId===this.data.snapshot?.myInfo?.seatId&&!op.isInsurance&&!op.isAgreeSecondPc)??false;
      if(this.config.isOrderMode&&own!==this.lastOrder){this.lastOrder=own;void this.setLocal(own,own).catch(()=>{});}
      for(const user of this.client?.remoteUsers??[])if(ids.has(Number(user.uid)))void this.subscribe(user).catch(error=>this.fail(error));
    }
    this.changed();
  }
  private async join(generation:number):Promise<void> {
    this.busy=true;this.changed();
    const valid=()=>!this.disposed&&generation===this.generation&&this.seated;
    try {
      const {default:AgoraRTC}=await import('agora-rtc-sdk-ng');
      if(!valid())return;
      AgoraRTC.setLogLevel(3);
      const client=this.client=AgoraRTC.createClient({mode:'rtc',codec:'vp8'});
      const channel=`rtc_d_1-${this.matchID}-${this.data.record!.rid}`;
      client.on('token-privilege-will-expire',()=>{void this.token(channel).then(token=>{if(valid())return client.renewToken(token);}).catch(error=>this.fail(error));});
      client.on('user-published',user=>{if(valid())void this.subscribe(user).catch(error=>this.fail(error));});
      client.on('user-unpublished',(user,kind)=>{if(kind==='video')user.videoTrack?.stop();else user.audioTrack?.stop();this.changed();});
      client.on('user-left',user=>{user.videoTrack?.stop();user.audioTrack?.stop();this.speaking.delete(Number(user.uid));this.changed();});
      client.on('connection-state-change',()=>this.changed());

      await client.join(AgoraConfig.appId,channel,await this.token(channel),this.uid);
      if(!valid()){await this.leave();return;}
      // Sequential creation ensures a failed camera cannot leak a concurrently acquired microphone.
      this.audio=await AgoraRTC.createMicrophoneAudioTrack();
      if(!valid()){await this.leave();return;}
      if(this.setting.enableCamera)this.video=await AgoraRTC.createCameraVideoTrack({encoderConfig:{...AgoraConfig.encoder}});
      if(!valid()){await this.leave();return;}
      const setting=this.setting;
      await this.audio.setMuted(!setting.openMicrophone);
      await this.video?.setMuted(!setting.openCamera);
      await client.publish([this.audio,...(this.video?[this.video]:[])]);
      if(!valid()){await this.leave();return;}
      this.joined=true;this.camera=setting.openCamera;this.microphone=setting.openMicrophone;
      this.remoteCamera=setting.enableCamera;this.remoteMicrophone=true;
      const mine=this.data.snapshot!.playersList.find(p=>p.userRid===this.uid)!;
      this.maskId=setting.openPowerSaving?this.config.getVisibleVideoMaskId(mine.videoMaskId||1):0;
      if(this.config.isOptionalVideoMaskMode&&mine.videoMaskId!==this.maskId)await this.saveMask(this.maskId);
      this.volumeTimer=setInterval(()=>{
        let uid=0,volume=0;
        for(const user of client.remoteUsers){const level=user.audioTrack?.getVolumeLevel()??0;if(level>volume){volume=level;uid=Number(user.uid);}}
        if(this.audio?.enabled&&!this.audio.muted){const level=this.audio.getVolumeLevel();if(level>volume){volume=level;uid=this.uid;}}
        if(volume<0.6)uid=0;
        const previous=this.speaking.values().next().value??0;
        if(previous!==uid){this.speaking=new Set(uid?[uid]:[]);this.changed();}
      },300);
      this.config.start();this.lastOrder=false;this.sync();
    } catch(error){await this.leave();if(valid())throw error;}
    finally{this.busy=false;this.changed();}
  }
  private subscribing=new Map<string,Promise<void>>();
  private subscribe(user:IAgoraRTCRemoteUser):Promise<void> {
    const uid=Number(user.uid),client=this.client,generation=this.generation;
    if(!client||!this.data.snapshot?.playersList.some(p=>p.userRid===uid))return Promise.resolve();
    const key=`${generation}:${uid}`;
    const existing=this.subscribing.get(key);if(existing)return existing;
    const valid=()=>!this.disposed&&this.client===client&&generation===this.generation&&this.data.snapshot?.playersList.some(p=>p.userRid===uid);
    const task=(async()=>{
      if(user.hasVideo&&this.remoteCamera&&!this.blockedVideo.has(uid)&&!user.videoTrack)await client.subscribe(user,'video');
      if(!valid()){user.videoTrack?.stop();return;}
      if(user.hasAudio&&!user.audioTrack)await client.subscribe(user,'audio');
      if(!valid()){user.audioTrack?.stop();return;}
      if(user.audioTrack){user.audioTrack.setVolume(this.remoteMicrophone&&!this.blockedAudio.has(uid)?100:0);if(!user.audioTrack.isPlaying)user.audioTrack.play();}
      this.changed();
    })().finally(()=>this.subscribing.delete(key));
    this.subscribing.set(key,task);return task;
  }
  videoTrack(uid:number):VideoTrack|undefined {
    if(!this.joined||!this.data.snapshot?.playersList.some(p=>p.userRid===uid))return;
    return uid===this.uid?(this.camera?this.video:undefined):(this.remoteCamera&&!this.blockedVideo.has(uid)?this.client?.remoteUsers.find(u=>Number(u.uid)===uid&&u.hasVideo)?.videoTrack:undefined);
  }
  visibleMask(uid:number):number {
    if(!this.videoTrack(uid))return 0;
    if(uid===this.uid)return this.maskId;
    return this.config.shouldShowVideoMask?this.config.getVisibleVideoMaskId(this.data.snapshot?.playersList.find(p=>p.userRid===uid)?.videoMaskId??0):0;
  }
  audioEnabled(uid:number):boolean {
    return uid===this.uid?this.microphone:!!(this.remoteMicrophone&&!this.blockedAudio.has(uid)&&this.client?.remoteUsers.find(u=>Number(u.uid)===uid)?.hasAudio);
  }
  private async setLocal(camera:boolean,microphone:boolean):Promise<void> {
    const generation=this.generation;
    return this.run(async()=>{
      if(!this.joined||generation!==this.generation)return;
      await this.video?.setMuted(!camera);await this.audio?.setMuted(!microphone);
      if(generation!==this.generation)return;
      this.camera=camera;this.microphone=microphone;this.changed();
    });
  }
  async toggle(action:'camera'|'voice'|'effect'):Promise<void> {
    if(!this.joined||this.busy)return;
    const left=Math.ceil((this.randomEnd-Date.now())/1000);
    if(action!=='effect'&&this.randomStart>0&&Date.now()>=this.randomStart&&left>0){this.notify(i18nMgr.Get('UIVideoModelverifyRandom01').replace('{0}',String(left)));return;}
    if(action==='camera'&&this.canOpCamera)await this.setLocal(!this.camera,this.microphone);
    if(action==='voice'&&this.canOpMicrophone)await this.setLocal(this.camera,!this.microphone);
    if(action==='effect'&&this.canSwitchMask){
      const next=this.maskId>=4?(this.setting.canDisablePowerSaving?0:1):this.maskId+1;
      await this.saveMask(next);
    }
  }
  private async saveMask(mask:number):Promise<void> {
    await this.http.request('/api/user/set_video_mask',{video_mask_id:mask},{signal:this.signal});
    if(!this.seated||this.disposed)return;
    this.maskId=mask;
    const mine=this.data.snapshot?.playersList.find(p=>p.userRid===this.uid);if(mine)mine.videoMaskId=mask;
    this.changed();
  }
  remoteState(kind:'video'|'audio',uid:number) {
    const blocked=(kind==='video'?this.blockedVideo:this.blockedAudio).has(uid);
    const user=this.client?.remoteUsers.find(u=>Number(u.uid)===uid);
    return {blocked,available:this.joined&&(blocked||!!(kind==='video'?user?.hasVideo:user?.hasAudio))};
  }
  async toggleRemote(kind:'video'|'audio',uid?:number):Promise<void> {
    if(!this.joined)return;
    if(uid){const set=kind==='video'?this.blockedVideo:this.blockedAudio;if(set.has(uid))set.delete(uid);else set.add(uid);}
    else if(kind==='video')this.remoteCamera=!this.remoteCamera;else this.remoteMicrophone=!this.remoteMicrophone;
    this.changed();
    const client=this.client,generation=this.generation;
    await this.run(async()=>{
      if(!client||this.client!==client||generation!==this.generation)return;
      for(const user of client.remoteUsers){
        if(uid&&Number(user.uid)!==uid)continue;
        if(kind==='video'&&(!this.remoteCamera||this.blockedVideo.has(Number(user.uid)))){
          user.videoTrack?.stop();if(user.videoTrack)await client.unsubscribe(user,'video');
        } else await this.subscribe(user);
        if(this.client!==client||generation!==this.generation)return;
      }
      this.changed();
    });
  }
  /** CC 902 random verification; 1132 remains the old empty ForceVideo message. */
  randomVerify():void {
    if(this.config.mode!==VideoModel.RANDOM||!this.seated||this.randomStart)return;
    let raw=this.global.get<unknown>(this.matchID?'anti_cheat_video_config_mtt':'anti_cheat_video_config')??this.global.get('anti_cheat_video_config');
    if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{raw={};}}
    const value=(raw??{}) as {random_countdown?:number;time_limit?:number};
    const countdown=Number(value.random_countdown)||5,duration=Number(value.time_limit)||30;
    this.randomStart=Date.now()+countdown*1000;this.randomEnd=this.randomStart+duration*1000;
    this.notify(i18nMgr.Get('UIVideoModelverifyRandomCountDown').replace('{0}',String(countdown)));
    this.timers.push(setTimeout(()=>{if(!this.seated||this.disposed)return;this.randomActivated=true;void this.setLocal(true,true).catch(()=>{});this.notify(i18nMgr.Get('UIVideoModelverifyRandom01').replace('{0}',String(duration)));},countdown*1000));
    this.timers.push(setTimeout(()=>this.cancelRandom(),(countdown+duration)*1000));
  }
  private cancelRandom(){this.timers.forEach(clearTimeout);this.timers=[];this.randomStart=0;this.randomEnd=0;}
  private async leave():Promise<void> {
    clearInterval(this.volumeTimer);this.volumeTimer=undefined;
    this.joined=false;this.camera=false;this.microphone=false;this.maskId=0;this.speaking.clear();this.blockedAudio.clear();this.blockedVideo.clear();
    this.video?.stop();this.video?.close();this.video=undefined;this.audio?.stop();this.audio?.close();this.audio=undefined;
    const client=this.client;this.client=undefined;
    client?.remoteUsers.forEach(user=>{user.videoTrack?.stop();user.audioTrack?.stop();});
    client?.removeAllListeners();if(client)await client.leave();this.changed();
  }
  destroy():void {if(this.disposed)return;this.disposed=true;if(typeof document!=='undefined')document.removeEventListener('pointerdown',this.resumeAudio);++this.generation;this.cancelRandom();this.video?.close();this.audio?.close();void this.run(()=>this.leave()).catch(()=>{});this.clear();}
}
