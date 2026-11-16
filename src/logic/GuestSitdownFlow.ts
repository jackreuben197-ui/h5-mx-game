import type { ClientState,RoomTarget } from '../core/types.js';
import type { HostTransport } from '../host/HostTransport.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
export class SeatLoginRequired extends Error {}
/** CC GuestSitdownFlow: H5 owns authentication; resume only on a new authoritative table. */
export class GuestSitdownFlow {
  private pending?:{target:RoomTarget;seat:number;phase:'login'|'switching'|'entering'};
  constructor(private transport:HostTransport,private isGuest:()=>boolean){}
  begin(target:RoomTarget,seat:number):void {
    if(seat<=0)return;
    this.pending={target:{...target},seat,phase:'login'};
    this.transport.send('h5Navigate',{name:'login',ensureVisible:true,openLoginModal:true,loginContext:'table-sitdown'});
  }
  cancel():void{this.pending=undefined;}
  auth(state:unknown):boolean {
    if(!this.pending)return false;
    if(state==='switching'&&this.pending.phase==='login'){this.pending.phase='switching';return true;}
    if(state!=='switching')this.cancel();
    return false;
  }
  entering(roomID:number):void{
    if(!this.pending)return;
    if(roomID!==this.pending.target.roomID){this.cancel();return;}
    if(this.pending.phase==='switching')this.pending.phase='entering';
  }
  stateChanged(state:ClientState,resume:(seat:number)=>void):void{
    const p=this.pending;if(!p)return;
    if(state.phase==='error'||state.phase==='destroyed'||(state.phase==='hidden'&&p.phase!=='switching')){this.cancel();return;}
    if(state.target&&(state.target.roomID!==p.target.roomID||state.target.matchID!==p.target.matchID)){this.cancel();return;}
    if(state.phase!=='table'||p.phase!=='entering'||!state.table)return;
    this.cancel();
    if(this.isGuest()||state.table.mySeat)return;
    const seat=state.table.players.find(player=>player.seat===p.seat);
    if(seat?.userRid){this.transport.send('showToast',{message:i18nMgr.Get('adaptation10031')});return;}
    // The table component is mounted before H5EntryController receives this state.
    resume(p.seat);
  }
}
