import { componentBox } from '../../ComponentBox.js';
import { resourceURL } from '../../ResourcePath.js';
import viewConfig from './config.json';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import type { SpecialOperations } from '../../../../../core/RoomRecords.js';
import type { SeatingActions } from '../../../../../core/Seating.js';
import { SquidData } from '../../../../../data/SquidData.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { element } from '../../dom.js';
import { dialogConfirmButton } from '../DialogConfirmButton/DialogConfirmButton.js';
import { DialogSurface } from '../DialogSurface/DialogSurface.js';
import { RoundCheckbox } from '../RoundCheckbox/RoundCheckbox.js';
import { TableConfirmDialog } from '../TableConfirmDialog/TableConfirmDialog.js';
const url=(name:string)=>resourceURL((viewConfig.paths as Record<string,string>)[name]!);
export class SquidView {
 readonly root=componentBox(element('div','mx-squid'),viewConfig);
 readonly result=new DialogSurface('mx-squid-result',430);
 readonly intro=new DialogSurface('mx-squid-intro',390);
 private bindings=new BindingScope(this);
 private count=element('button','mx-squid-count');
 private join=element('button','mx-squid-join');
 private stand=element('button','mx-squid-stand');
 private start=element('img','mx-squid-start');
 private started=0;private resultSerial=0;private noticeSerial=0;
 private closeTimer?:ReturnType<typeof setTimeout>;private loop?:ReturnType<typeof setInterval>;
 private animation?:Animation;private pending=false;
 constructor(private records:SpecialOperations,private actions:SeatingActions,private confirm:TableConfirmDialog,private failed:(error:unknown)=>void){
  for(const name of ['squid_bg_red','squid_end_bg','squid_reward_bg']){this.root.style.setProperty(`--${name}`,`url("${url(name)}")`);this.result.root.style.setProperty(`--${name}`,`url("${url(name)}")`);}
  this.count.style.backgroundImage=`url("${url('table_icon_squid')}")`;
  this.start.src=url('squid_start');this.start.hidden=true;
  i18nLabel.bind(this.join,()=>i18nMgr.Get('UICowboy_JoinGame'));
  i18nLabel.bind(this.stand,()=>i18nMgr.Get('MX_SquidStand'));
  this.join.style.backgroundImage=`url("${url('table_bg_jkp_pool')}")`;
  this.stand.style.backgroundImage=`url("${url('table_bg_stand_up')}")`;
  this.join.onclick=()=>{if(this.pending)return;this.pending=true;this.join.disabled=true;void this.actions.joinSquid?.().catch(this.failed).finally(()=>{this.pending=false;this.join.disabled=false;});};
  this.result.root.onclick=(event)=>{if(event.target===this.result.root){clearTimeout(this.closeTimer);this.result.show(false);}};
  this.count.onclick=()=>this.showIntro();this.stand.onclick=()=>this.standup();
  this.root.append(this.count,this.join,this.stand,this.start);
  this.bindings.bind({squid:records.data.squid});
  const room=records.data.record;if(room&&(room.squidBase>0||room.subConfigsList.some(c=>c.squidBase>0))&&localStorage.getItem('mx-squid-intro-hidden')!=='true')queueMicrotask(()=>{if(this.root.isConnected)this.showIntro();});
 }
 @bindEvent(SquidData.CHANGE,'squid')
 private render():void {
  const s=this.records.data.squid.state;
  this.count.hidden=!s.enabled;this.count.textContent=String(s.remaining);this.count.dataset.count=String(s.remaining);this.count.setAttribute('aria-label',`${i18nMgr.Get('UISquid')} ${s.remaining}`);
  this.join.hidden=!s.showJoin;this.stand.hidden=!s.enabled||!s.seat;
  if(s.notice&&s.noticeSerial!==this.noticeSerial)this.failed(i18nMgr.Get(s.notice));this.noticeSerial=s.noticeSerial;
  if(s.start!==this.started){this.started=s.start;if(s.start){this.animation?.cancel();this.start.hidden=false;this.animation=this.start.animate(viewConfig.layout.startAnimation.frames,{duration:viewConfig.layout.startAnimation.duration});this.animation.onfinish=()=>{this.start.hidden=true;};}}
  if(s.resultSerial!==this.resultSerial){this.resultSerial=s.resultSerial;clearTimeout(this.closeTimer);this.result.content.replaceChildren();
   if(s.results.length){this.result.content.append(element('h2','mx-squid-result-title',()=>i18nMgr.Get('MX_SquidSettlement',[],'鱿鱼结算')));const title=element('img','mx-squid-over');title.src=url('squid_over');this.result.content.append(title);
    s.results.forEach((v,index)=>{const row=element('div','mx-squid-result-row'),avatar=element('img',''),identity=element('div',''),score=element('strong','');
     avatar.src=v.avatar;identity.append(element('div','',()=>StringHelper.LengthNick(v.nick||'-')),element('small','',()=>`ID:${v.userID}`));score.textContent=StringHelper.GetSignedLongString(v.money);score.style.color=v.money>0?'#B0FFAE':v.money<0?'#FF7C7C':'#EEF5FF';row.append(avatar,identity,score);
     if(v.money<0){const lose=element('img','mx-squid-lose');lose.src=url('squid_lose');row.append(lose);}
     if(!v.isPunish&&v.rate>0)row.append(element('span','mx-squid-reward',()=>`${v.rate}x ${i18nMgr.Get('UISquidEndReward')}`));
     row.animate([{opacity:0},{opacity:1}],{duration:66,delay:index*66,fill:'both'});this.result.content.append(row);});
    this.result.show(true);this.closeTimer=setTimeout(()=>this.result.show(false),5000);
   }else this.result.show(false);
  }
 }
 resize(suggest:number):void {
  // MorePlayTypeInfo.onFrameResize: bottom-anchored children in 390/450-high container.
  const offset=suggest<1?0:60;
  this.count.style.top=`${viewConfig.layout.countY+offset}px`;
  this.stand.style.top=`${viewConfig.layout.standY+offset}px`;
  this.join.style.bottom=`${suggest<1?640*suggest:200*suggest+520}px`;
 }
 infoLines():string[]{
  const data=this.records.data,room=data.record,s=data.squid.state;if(!room)return [];
  const config=room.subConfigsList.find(c=>c.squidBase>0);if(!config&&!room.squidBase)return [];
  const base=config?.squidBase??room.squidBase,count=config?.playingPlayerCountLimit??room.squidPlayerCount;
  return [`${i18nMgr.Get(s.enabled?'UISquidOpen':'UISquidWaitOpen')}:${s.enabled?'1/1':`${s.round}/${config?room.rounds:(room.subConfigsList[0]?.rounds??room.rounds)}`}`,`${i18nMgr.Get('UIGameTableSquidShow')}:${StringHelper.GetLongString(base)}`,`${i18nMgr.Get('UISquidOpenPeopleNumber')}:${count}/${room.seatCount}`];
 }
 standup():void {
  const s=this.records.data.squid.state,mine=this.records.data.snapshot?.playersList.find(p=>p.seatId===s.seat);
  const perform=()=>{void (mine?.keepSeatReason?this.actions.keepSeat?.(false):this.actions.standup())?.catch(this.failed);};
  if(s.enabled&&mine?.inSquid&&s.mode===1){this.confirm.open({owner:'squid-standup',title:()=>mine.squidCount<=0?i18nMgr.Get('UIGuild_TipsTitle'):'',message:()=>i18nMgr.Get(mine.squidCount<=0?'UISquid_Tips3':'UIDelayLeaveTips'),cancel:()=>i18nMgr.Get(mine.squidCount<=0?'adaptation10013':'UIPause_sdXLZk7S'),commit:()=>i18nMgr.Get(mine.squidCount<=0?'adaptation10012':'UILeave'),onCancel:()=>{},onCommit:perform});}else perform();
 }
 showIntro():void {
  clearInterval(this.loop);
  let page=0;
  const mode=this.records.data.squid.state.mode;
  const title=element('h2','',()=>`${i18nMgr.Get('UIDialogSquid_BloodyTip')} ${i18nMgr.Get('UIDialogSquid_SoonStartTip')}`);
  const picture=element('img','mx-squid-page');
  const text=element('p','');
  const bar=element('div','mx-squid-pages');
  const left=element('button','mx-squid-prev');
  const right=element('button','mx-squid-next');
  left.type=right.type='button';
  i18nLabel.bind(left,()=>i18nMgr.Get('MX_PreviousPage'),'aria-label');
  i18nLabel.bind(right,()=>i18nMgr.Get('UITableSetting_nextPage'),'aria-label');
  left.style.backgroundImage=`url("${url('icon_lelft_arrow')}")`;
  right.style.backgroundImage=`url("${url('icon_right_arrow')}")`;
  const toggle=new RoundCheckbox(()=>i18nMgr.Get('UIGuild_NoticeNoShow'),true);
  const footer=element('div','mx-squid-intro-footer');
  const commit=dialogConfirmButton(()=>i18nMgr.Get('adaptation10012'),()=>{
   clearInterval(this.loop);
   localStorage.setItem('mx-squid-intro-hidden',String(toggle.input.checked));
   this.intro.show(false);
  });
  footer.append(commit);
  const render=()=>{picture.src=url(`squid_dialog_page_${page+1}`);i18nLabel.bind(text,()=>i18nMgr.Get(page===0?(mode===1?'UIDialogSquid_BloodyPage1':'UIDialogSquid_NormalPage1'):page===1?(mode===1?'UIDialogSquid_Tips1':'UIDialogSquid_Tips2'):'UIDialogSquid_BloodyPage3'));bar.replaceChildren(...[0,1,2].map(i=>{const dot=element('span','');dot.classList.toggle('selected',i===page);return dot;}));};
  left.onclick=()=>{clearInterval(this.loop);page=(page+2)%3;render();};right.onclick=()=>{clearInterval(this.loop);page=(page+1)%3;render();};
  this.intro.content.replaceChildren(title,bar,picture,text,left,right,toggle.root,footer);render();this.intro.show(true);this.loop=setInterval(()=>{page=(page+1)%3;render();},2000);
 }
 destroy():void{clearTimeout(this.closeTimer);clearInterval(this.loop);this.animation?.cancel();this.bindings.destroy();this.result.destroy();this.intro.destroy();this.root.remove();}
}
