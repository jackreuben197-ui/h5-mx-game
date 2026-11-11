import type { TableSnapshot } from '../../core/types.js';
import { BringOutRules } from '../../logic/BringOutRules.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { element } from '../dom.js';
/** CC UIBringOut slider and amount limits; submit never updates chips optimistically. */
export class BringOutView {
  readonly root=element('div','mx-settings-overlay mx-dialog-overlay');
  private panel=element('section','mx-settings-panel mx-dialog-glass');
  private amount=element('output','mx-settings-ratio');
  private slider=element('input','mx-settings-range');
  private commit=element('button','mx-bringout-confirm',()=>i18nMgr.Get('adaptation10012'));
  private closeButton=element('button','mx-settings-close','×');
  private error=element('p','mx-settings-status');
  private rules?:BringOutRules;
  private busy=false;
  private disposed=false;
  private focus?:HTMLElement;
  constructor(private submit:(amount:number)=>Promise<void>){
    this.root.hidden=true;this.slider.type='range';this.slider.min='0';this.slider.max='10000';this.slider.step='1';
    i18nLabel.bind(this.slider,()=>i18nMgr.Get('UITexas_BringOutChipsMenu'),'aria-label');
    this.slider.oninput=()=>this.refreshAmount();
    this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-modal','true');
    i18nLabel.bind(this.panel,()=>i18nMgr.Get('UITexas_BringOutChipsMenu'),'aria-label');
    this.closeButton.type='button';this.closeButton.onclick=()=>this.close();
    i18nLabel.bind(this.closeButton,()=>i18nMgr.Get('UIBackDialog_ticketsbtnClose'),'aria-label');
    this.commit.type='button';this.commit.onclick=()=>void this.commitAmount();
    this.panel.append(element('h2','',()=>i18nMgr.Get('UITexas_BringOutChipsMenu')),this.closeButton,this.amount,this.slider,this.error,this.commit);this.root.append(this.panel);
    this.root.onclick=e=>{if(e.target===this.root)this.close();};this.root.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();this.close();}if(e.key==='Tab'){const items=[this.closeButton,this.slider,this.commit].filter(b=>!b.disabled);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}};
  }
  onFrameResize(width:number,height:number):void{
    const unit=Math.min(width/1440,600/1100);
    this.root.dataset.short=String(height<800*unit);
    this.root.style.setProperty('--settings-unit',`${unit}px`);
    this.root.style.setProperty('--dialog-width',`${Math.min(width-16,1100*unit)}px`);
  }
  open(state:TableSnapshot):void{
    if(this.busy)return;
    this.focus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    this.rules=new BringOutRules(state.players.find(p=>p.seat===state.mySeat)?.chips??0,state.menu?.retainMinRate??0,state.smallBlind??0);
    this.slider.value='0';this.error.textContent='';this.root.hidden=false;this.refreshAmount();this.slider.focus();
  }
  private refreshAmount():void{const value=this.rules?.amount(Number(this.slider.value)/10000)??0;this.amount.textContent=StringHelper.GetLongString(value);this.slider.setAttribute('aria-valuetext',this.amount.textContent);this.commit.disabled=this.busy||!this.rules?.valid(value);}
  private async commitAmount():Promise<void>{
    const value=this.rules?.amount(Number(this.slider.value)/10000)??0;if(this.busy||!this.rules?.valid(value))return;
    this.busy=true;this.slider.disabled=true;this.closeButton.disabled=true;this.refreshAmount();
    try{await this.submit(value);if(!this.disposed)this.root.hidden=true;}
    catch(e){if(!this.disposed)this.error.textContent=e instanceof Error?e.message:String(e);}
    finally{this.busy=false;this.slider.disabled=false;this.closeButton.disabled=false;this.refreshAmount();if(!this.disposed&&this.root.hidden)this.focus?.focus();}
  }
  close():void{if(!this.busy){this.root.hidden=true;this.focus?.focus();}}
  destroy():void{this.disposed=true;this.root.remove();}
}
