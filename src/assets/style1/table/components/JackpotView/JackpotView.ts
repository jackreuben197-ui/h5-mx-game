import { componentBox } from '../../ComponentBox.js';
import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import {i18nMgr} from '../../../../../i18n/i18nMgr.js';
import {BindingScope} from '../../../../../binding/BindingScope.js';
import {bindEvent} from '../../../../../binding/bindEvent.js';
import {JackpotData} from '../../../../../data/JackpotData.js';
import {CallTimeData} from '../../../../../data/CallTimeData.js';
import type {ProtocolRoomData} from '../../../../../data/ProtocolRoomData.js';
import {element} from '../../dom.js';
/** CC middleLayout: Jackpot, CallTime, then the existing pots/room info. */
export class JackpotView {
  readonly root=componentBox(element('div','mx-jackpot'),config);
  private button=element('button','mx-jackpot-pool');
  private amount=element('span','');
  private progress=element('div','mx-calltime');
  private icon=element('img','');
  private label=element('span','');
  private start=element('div','mx-jackpot-start');
  private bindings=new BindingScope(this);
  private animation?:Animation;private frame=0;private started=0;private shown=0;private width=1440;private height=2688;private scale=1;private destroyed=false;
  constructor(private data:ProtocolRoomData,open:()=>void,private layout:()=>void){
    this.button.type='button';this.button.setAttribute('aria-label','Jackpot');
    this.button.style.setProperty('--mx-jackpot-pool-image',`url("${resourceURL(config.paths.returnGame)}")`);
    this.start.style.backgroundImage=`url("${resourceURL(config.paths.jpt_award)}")`;
    this.icon.src=resourceURL(config.paths.icon_limit_hand);this.icon.alt='';
    this.progress.append(this.icon,this.label);this.button.append(this.amount);this.button.onclick=open;
    this.start.hidden=true;this.root.append(this.button,this.progress,this.start);this.bindings.bind({jackpot:data.jackpot,calltime:data.callTime});
  }
  @bindEvent(JackpotData.CHANGE,'jackpot')
  private changed():void{
    const j=this.data.jackpot,s=j.state,to=Math.floor(j.displayPool/100);
    this.button.hidden=!j.enabled;this.layout();
    if(!j.enabled){this.cancel();this.start.hidden=true;return;}
    if(s.start!==this.started&&s.start){
      this.started=s.start;this.cancel();this.button.hidden=true;this.start.hidden=false;
      this.animation=this.start.animate(config.layout.startAnimation.frames,{duration:config.layout.startAnimation.duration});
      this.animation.onfinish=()=>{this.start.hidden=true;this.button.hidden=false;this.roll(0,to);this.layout();};
    }else{
      this.started=s.start;this.cancel();this.start.hidden=true;
      if(s.rolling)this.roll(this.shown,to);else this.setGold(to);
    }
  }
  private setGold(value:number):void{this.shown=value;this.amount.textContent=String(Math.floor(value));}
  private roll(from:number,to:number):void{
    cancelAnimationFrame(this.frame);const begin=performance.now();
    const tick=(now:number)=>{if(this.destroyed)return;const ratio=Math.min(1,(now-begin)/3000);this.setGold(from+(to-from)*ratio);if(ratio<1)this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);
  }
  @bindEvent(CallTimeData.CHANGE,'calltime')
  private callChanged():void{
    const r=this.data.record,s=this.data.callTime.state;this.progress.hidden=!(r?.calltime===1&&s.stay);
    this.label.textContent=this.progress.hidden?'':`Profit ${r!.calltimeWinLine}BB ${s.count}/${r!.calltimeLimit} hands`;
    this.layout();
  }
  infoLines():string[]{const r=this.data.record;return r?.calltime===1?[`CallTime:${i18nMgr.Get('UIClub_GainNum')}${r.calltimeWinLine}BB ${r.calltimeLimit}${i18nMgr.Get('UIMine_RecordDetailForNormal_ss')}`]:[];}
  get extraHeight():number{return (this.data.jackpot.enabled?77:0)+(this.data.record?.calltime===1&&this.data.callTime.state.stay?70:0);}
  bounds():DOMRect[]{return [this.button,this.progress].filter(node=>!node.hidden).map(node=>node.getBoundingClientRect());}
  resize(width:number,height:number,scale:number):void{
    this.width=width;this.height=height;this.scale=scale;
    this.root.style.setProperty('--mx-jackpot-base-scale',String(scale));
    for(const e of [this.button,this.progress]){e.style.left=`${width/2}px`;e.style.transform='translate(-50%,-50%) scale(var(--mx-jackpot-scale,var(--mx-jackpot-base-scale)))';}
    this.button.style.top=`var(--mx-jackpot-y, ${(config.layout.baseY+config.layout.buttonHalfHeight)*scale}px)`;
    this.progress.style.top=`var(--mx-calltime-y, ${(config.layout.baseY+(this.data.jackpot.enabled?config.layout.buttonHeight:0)+config.layout.progressOffset)*scale}px)`;
    this.start.style.left=`${width/2}px`;this.start.style.top=`${height/2+config.layout.startOffsetY*scale}px`;this.start.style.width=`${config.layout.startWidth*scale}px`;this.start.style.height=`${config.layout.startHeight*scale}px`;
  }
  private cancel():void{this.animation?.cancel();cancelAnimationFrame(this.frame);}
  destroy():void{this.destroyed=true;this.cancel();this.bindings.destroy();this.root.remove();}
}
