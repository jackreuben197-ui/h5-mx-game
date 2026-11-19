import {TableMedia,type VideoTrack} from '../../src/media/TableMedia.js';
import type {ProtocolRoomData} from '../../src/data/ProtocolRoomData.js';
import type {GlobalConfigStore} from '../../src/data/GlobalConfigStore.js';
import type {HttpClient} from '../../src/net/http/HttpClient.js';
/** Deterministic UI adapter; never acquires hardware, requests a token, or joins RTC. */
export class AuditMedia extends TableMedia {
 private ownUID:number;
 private tracks=new Map<number,VideoTrack>();
 constructor(data:ProtocolRoomData,global:GlobalConfigStore,signal:AbortSignal){super(data,99+(data.snapshot?.myInfo?.seatId??1),{} as HttpClient,global,signal,()=>{},0);this.ownUID=99+(data.snapshot?.myInfo?.seatId??1);this.joined=true;this.microphone=true;this.camera=data.record?.antiCheatType===3;this.speaking.add(101);}
 override get microphoneActive(){return this.microphone;}
 override get canOpCamera(){return true;}
 override get canOpMicrophone(){return true;}
 override get canSwitchMask(){return this.camera;}
 override sync(){this.emit(TableMedia.CHANGE);}
 override async prepareSeat(){}
 override videoTrack(uid:number):VideoTrack|undefined {
  if(!this.camera)return;
  if(!this.tracks.has(uid)){let node:HTMLElement|undefined;this.tracks.set(uid,{play:(host:HTMLElement)=>{node=document.createElement('span');node.textContent='模拟视频';node.style.cssText='display:grid;place-items:center;width:100%;height:100%;background:#235568;color:white;font-size:28px';host.append(node);},stop:()=>node?.remove()} as unknown as VideoTrack);}
  return this.tracks.get(uid);
 }
 override audioEnabled(uid:number){return uid===this.ownUID?this.microphone:uid%2===1;}
 override visibleMask(uid:number){return this.camera?(uid===this.ownUID?this.maskId:uid%5):0;}
 override async toggle(action:'camera'|'voice'|'effect'){if(action==='camera')this.camera=!this.camera;else if(action==='voice')this.microphone=!this.microphone;else this.maskId=(this.maskId+1)%5;this.sync();}
 private remoteBlocks=new Set<string>();
 override remoteState(kind:'audio'|'video',uid:number){return {blocked:this.remoteBlocks.has(kind+uid),available:true};}
 override async toggleRemote(kind:'audio'|'video',uid?:number){if(uid){const key=kind+uid;this.remoteBlocks.has(key)?this.remoteBlocks.delete(key):this.remoteBlocks.add(key);this.sync();return;}if(kind==='audio')this.remoteMicrophone=!this.remoteMicrophone;else this.remoteCamera=!this.remoteCamera;this.sync();}
 override destroy(){this.tracks.forEach(t=>t.stop());this.tracks.clear();super.destroy();}
}
