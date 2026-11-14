import { uniqueId } from '../core/uniqueId.js';
import { CPErrorCode } from '../i18n/CPErrorCode.js';
import type { ServerMessageLeaveNotification } from '@silenthill/agreement-web';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import Mtt from '../data/TexasGameRoomDataMtt.js';
import type { RoomTarget } from '../core/types.js';
import type { ProtocolClient } from '../net/ProtocolClient.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
import type { Packet } from '../net/PacketCodec.js';
import type { HostTransport } from '../host/HostTransport.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
/** CC MttRoomLifecycle: the original table remains mounted while resubscribing. */
export class MttRoomLifecycle {
  private off: (()=>void)[]=[];
  private panel=''; private props?:Record<string,unknown>; private watching=false; private pending=false;
  private transferring=false;
  private closed=false; private disposed=false; private timer?:ReturnType<typeof setTimeout>;
  constructor(private data:ProtocolRoomData,private target:RoomTarget,private client:ProtocolClient,private pb:HoldemRuntime,
    private transport:HostTransport,private signal:AbortSignal,private active:()=>boolean,
    private enter:(roomID:number,observer:boolean)=>Promise<void>,private publish:()=>void,private exit:()=>void){
    const m=data.mtt!;
    const on=(name:string,fn:(...args:any[])=>void)=>this.off.push(m.on(name,fn));
    on(Mtt.ROOM_READY,(id:number)=>{if(this.transferring)return;this.transferring=true;void this.enter(id,false).catch(e=>this.error(e)).finally(()=>{this.transferring=false;});});
    on('registration',()=>this.navigate('mtt-detail',{id:String(target.matchID)}));
    on(Mtt.NOTICE,(key:string)=>this.toast(i18nMgr.Get(key)));
    on(Mtt.ADDON_RESULT,(status:number)=>this.toast(status===0?i18nMgr.Get('AddGcg'):CPErrorCode.ServerErrorDescription(status)));
    on(Mtt.AUTO_OP_RESULT,(status:number)=>this.toast(status===0?i18nMgr.Get('Hosting_surre'):CPErrorCode.ServerErrorDescription(status)));
    on(Mtt.BREAK_REMINDER,(minutes:number,duration:number)=>this.toast(i18nMgr.Get('timeBeforeBreakNotice').replace('{time}',`${minutes}${i18nMgr.Get('UIClubData_Text_time')}`).replace('{duration}',String(duration))));
    on('presentationCleared',publish);
    this.off.push(transport.subscribe(message=>{
      if(!this.active()||this.disposed||message.action!=='panelEvent'||!this.panel)return;
      const p=message.payload as {panelRequestId?:string;event?:string}|undefined;
      if(p?.panelRequestId!==this.panel)return;
      if(p.event==='continueWatching'){
        if(!this.watching||this.closed)return;
        this.panel='';this.props=undefined;this.transport.send('h5Hide');return;
      }
      if(p.event==='rebuy')this.navigate('mtt-detail',{id:String(target.matchID)});
      else if(['returnLobby','confirm','done','close'].includes(p.event??''))this.navigate('lobby');
    }));
  }
  global(packet:Packet):boolean{
    if(!this.active()||this.disposed)return false;
    const m=this.data.mtt!;
    if(packet.code===101){
      const b=this.pb.ServerMessageNotificationRoomReady.deserializeBinary(packet.body).toObject();
      if(b.room?.matchId===this.target.matchID&&b.room.roomId>0){
        if(m.observer)this.dissolved();else if(m.tableTransferWaiting)m.roomReady(b.room.roomId);
      }
      return true;
    }
    if(packet.code===107){
      const b=this.pb.ServerMessageNotificationMttWillStart.deserializeBinary(packet.body).toObject();
      if(b.matchId===this.target.matchID&&b.startTime>0)m.applyWillStart(b.startTime);
      return true;
    }
    if(packet.code===154){
      const b=this.pb.ServerMessageMttBreak.deserializeBinary(packet.body).toObject();
      if(b.matchId===this.target.matchID)m.applyBreak(b);
      return true;
    }
    return false;
  }
  leave(body:ServerMessageLeaveNotification.AsObject):boolean{
    const m=this.data.mtt!,reason=this.pb.Def.LeaveReason;
    if([reason.LR_EXCHANGE,reason.LR_GAME_END,reason.LR_NOCHIP].some(r=>r===body.reason)&&this.data.snapshot){this.data.snapshot.operatorList=[];this.publish();}
    if(body.reason===reason.LR_EXCHANGE){if(m.observer)this.dissolved();else m.setTableTransferWaiting(true);return true;}
    if(body.reason===reason.LR_GAME_END){if(m.observer)this.dissolved();else {this.closed=true;void this.settlement(false);}return true;}
    if(body.reason===reason.LR_NOCHIP){
      if(m.eliminatedObserver)return true;
      m.updateLeaveState(body.storeChips,body.rebuyTimes);
      if(body.storeChips>0)void this.enter(0,false).catch(e=>this.error(e));
      else void this.settlement(m.canRebuy(body.accountChips));
      return true;
    }
    return false;
  }
  private async settlement(rebuy:boolean):Promise<void>{
    if(this.props||this.data.mtt!.eliminatedObserver)return;
    const m=this.data.mtt!,s=this.data.snapshot!;
    this.props={matchId:this.target.matchID,matchName:m.matchName,startTime:m.startTime,isRebuy:rebuy,
      currentBlindLevel:m.blindLevel,maxRebuyBlindLevel:m.maxRebuyBlindLevel,remainRebuyTimes:m.remainRebuyTimes,
      clubId:this.data.record?.clubId,inTable:true};
    const seat=s.myInfo?.seatId;
    s.playersList=s.playersList.filter(p=>p.seatId!==seat);
    if(s.myInfo)s.myInfo.seatId=0;
    s.operatorList=[];this.pending=!this.closed;this.watching=false;
    if(!this.closed){m.observer=true;m.eliminatedObserver=true;}
    m.refresh();this.publish();this.showPanel();
    if(this.closed)return;
    try{
      await this.enter(this.target.roomID,true);
      if(!this.active()||this.disposed)return;
      this.pending=false;this.watching=true;this.showPanel();
    }catch(e){if(this.active()&&!this.disposed){this.pending=false;this.closed=true;this.error(e);this.showPanel();}}
  }
  private showPanel():void{
    if(!this.props||this.disposed)return;
    this.panel=`mx-mtt-${uniqueId()}`;
    this.transport.send('showPanel',{panelType:'mttSettlement',props:{...this.props,canContinueWatching:this.watching,watchingPending:this.pending},closeOnClickOverlay:false,ensureVisible:false,showH5Bg:false},1,this.panel);
  }
  private dissolved():void{
    if(this.closed)return;this.closed=true;
    if(this.panel)this.transport.send('closePanel',{requestId:this.panel,panelType:'mttSettlement'});
    this.panel='';this.props=undefined;
    this.toast(i18nMgr.Get('UIMTT_ObservedRoomDissolved'));
    this.timer=setTimeout(()=>{if(this.active()&&!this.disposed)this.navigate('mtt-list');},2000);
  }
  private navigate(name:string,query?:Record<string,string>):void{
    if(!this.closed&&this.data.mtt?.eliminatedObserver){const room=new this.pb.Room();room.setRoomId(this.target.roomID);room.setMatchId(this.target.matchID);const body=new this.pb.ClientMessageLeave();body.setRoom(room);this.client.send(this.pb.Code.MSG_D_LEAVE,this.target.roomID,this.target.matchID,body,this.signal);}
    this.exit();this.transport.send('h5Navigate',{name,query,replace:true,ensureVisible:true});
  }
  private toast(message:string):void{this.transport.send('showToast',{message});}
  private error(error:unknown):void{if(this.active()&&!this.disposed)this.toast(error instanceof Error?error.message:String(error));}
  destroy():void{
    if(this.disposed)return;this.disposed=true;clearTimeout(this.timer);
    for(const off of this.off)off();this.off=[];
    if(this.panel)this.transport.send('closePanel',{requestId:this.panel,panelType:'mttSettlement'});
    this.panel='';
  }
}
