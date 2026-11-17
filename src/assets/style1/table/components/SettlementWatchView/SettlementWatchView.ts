import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import type { TableSnapshot } from '../../../../../core/types.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { element } from '../../dom.js';

/** CC UIOtherBndings.view: live hand-end actions, separate from replay purchase. */
export class SettlementWatchView {
  readonly root=componentBox(element('div','mx-settlement-watch'),config);
  private peek=this.button('UITexas_payLookHandCard','偷偷看','peek');
  private reveal=this.button('UIViewAllPublicCards','发发看','reveal');
  private busy=false;
  constructor(private action:(kind:'peek'|'reveal')=>Promise<void>,private failed:(error:unknown)=>void){
    this.root.append(this.peek,this.reveal);
    this.root.hidden=true;
  }
  private button(key:string,fallback:string,kind:'peek'|'reveal'):HTMLButtonElement{
    const button=element('button','mx-settlement-watch-button') as HTMLButtonElement;
    button.type='button';
    const background=element('span','mx-settlement-watch-bg');SpriteAtlas.paint(background,config.paths.operationExtra);
    const title=element('span','mx-settlement-watch-title');
    title.textContent=i18nMgr.Get(key,[],fallback);
    const cost=element('span','mx-settlement-watch-price');
    const diamond=element('span','mx-settlement-watch-diamond');SpriteAtlas.paint(diamond,config.paths.recordDiamond);
    const amount=element('span','mx-settlement-watch-amount');cost.append(diamond,amount);
    button.append(background,title,cost);
    button.onclick=async()=>{
      if(this.busy)return;
      this.busy=true;button.disabled=true;
      try{await this.action(kind);}catch(error){this.failed(error);}finally{this.busy=false;button.disabled=false;}
    };
    return button;
  }
  render(state:TableSnapshot):void{
    const watch=state.handEnded?state.watch:undefined;
    this.peek.hidden=!watch?.peek||watch.peekCost===undefined;
    this.reveal.hidden=!watch?.reveal||watch.revealCost===undefined;
    this.root.hidden=this.peek.hidden&&this.reveal.hidden;
    const price=(button:HTMLButtonElement,cost:number|undefined,free:boolean|undefined)=>{
      const line=button.querySelector<HTMLElement>('.mx-settlement-watch-price')!;
      line.hidden=!!watch?.privateUc&&(cost??0)===0;
      const value=button.querySelector<HTMLElement>('.mx-settlement-watch-amount')!;
      value.textContent=free?i18nMgr.Get('UIMIneVIPFreeTip',[],'免费'):String(cost??0);
    };
    price(this.peek,watch?.peekCost,false);price(this.reveal,watch?.revealCost,watch?.revealFree);
  }
  resize(unit:number,navigationInset:number):void{
    this.root.style.setProperty('--mx-watch-bottom',`${Math.max(config.layout.bottom*unit,navigationInset)}px`);
  }
  destroy():void{this.root.remove();}
}
