import type { RoomRecords } from '../../core/RoomRecords.js';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import Mtt from '../../data/TexasGameRoomDataMtt.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { element } from '../dom.js';
/** CC MttTableStateView / UIRoomTexas: one shared start/break surface. */
export class MttTableStateView {
  readonly root=element('div','mx-mtt');
  private countdown=element('div','mx-mtt-countdown');
  private bubble=element('div','mx-mtt-tip');
  private transfer=element('div','mx-mtt-tip');
  private addOn=element('button','mx-mtt-addon','ADD-ON');
  private cancel=element('button','mx-mtt-cancel');
  private bindings=new BindingScope(this);private timer:ReturnType<typeof setInterval>;private tick=0;
  constructor(private records:RoomRecords,private error:(e:unknown)=>void,private refreshInfo:()=>void=()=>{}){
    this.countdown.style.backgroundImage=`url("${new URL('../../assets/raw/mtt/waitStart.png',import.meta.url).href}")`;
    for(const node of [this.bubble,this.transfer])node.style.backgroundImage=`url("${new URL('../../assets/raw/mtt/wait.png',import.meta.url).href}")`;
    this.cancel.style.backgroundImage=`url("${new URL('../../assets/raw/mtt/return.png',import.meta.url).href}")`;
    this.addOn.type=this.cancel.type='button';
    this.addOn.onclick=()=>void records.mttAddOn?.().catch(error);
    this.cancel.onclick=()=>void records.mttAutoOp?.(false).catch(error);
    this.root.append(this.countdown,this.bubble,this.transfer,this.addOn,this.cancel);
    this.bindings.bind({mtt:records.data.mtt!});
    this.timer=setInterval(()=>{this.tick++;records.data.mtt?.updateBreakPresentation();this.render();},1000);
  }
  @bindEvent(Mtt.STATE_CHANGED,'mtt')
  render():void{
    const m=this.records.data.mtt;if(!m)return;
    this.refreshInfo();
    const s=this.records.data.snapshot,p=s?.playersList.find(p=>p.seatId===s.myInfo?.seatId);
    this.addOn.hidden=m.displayAddOnMode===0;this.addOn.disabled=m.currentAddOnMode===0||m.addOnPending;
    this.cancel.hidden=!p?.isAutoop;this.cancel.textContent=i18nMgr.Get('adaptation10011');
    const start=m.getStartRemainingSeconds(),rest=m.getBreakRemainingSeconds(),show=m.shouldShowBreak();
    const duration=(v:number)=>`${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
    this.countdown.hidden=!show&&(m.gameStarted||start<=0);
    this.countdown.textContent=show?(!p?`${i18nMgr.Get('playerInBreakState')}\n${duration(rest)}`:m.breakType===Mtt.BREAK_TYPE_FINAL?`${i18nMgr.Get('adjustStateBeforeFinal')}\n${duration(rest)}`:i18nMgr.Get('timeAfterMatchResume').replace('{time}',duration(rest))):`${m.matchName}\n${duration(start)}`;
    this.bubble.hidden=!m.bubbleWaiting||m.breakWindowActive;
    this.transfer.hidden=m.breakWindowActive||!(m.redistributionWaiting||m.tableTransferWaiting);
    this.bubble.textContent=i18nMgr.Get(`UIBathTip00${Math.floor(this.tick/4)%3+1}`);
    this.transfer.textContent=i18nMgr.Get(`MTTroomNum_00${Math.floor(this.tick/4)%7+1}`);
  }
  resize(width:number,height:number,scale:number):void{
    this.root.style.setProperty('--mtt-scale',String(scale));
    for(const n of [this.countdown,this.bubble,this.transfer]){n.style.left=`${width/2}px`;n.style.top=`${1193*scale}px`;n.style.width=`${(width/scale)-(n===this.countdown?377:0)}px`;}
    this.cancel.style.left=`${width/2}px`;this.cancel.style.top=`${Math.min(1581*scale,height-450*scale)}px`;
    this.addOn.style.left=`${width-100*scale}px`;this.addOn.style.top=`${400*scale}px`;
  }
  destroy():void{clearInterval(this.timer);this.bindings.destroy();this.root.remove();}
}
