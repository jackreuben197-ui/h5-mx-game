import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { CriticalHitData } from '../../../../../data/CriticalHitData.js';
import type { ProtocolRoomData } from '../../../../../data/ProtocolRoomData.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { element } from '../../dom.js';
import { GameplayGuideDialog } from '../GameplayGuideDialog/GameplayGuideDialog.js';
import { MushroomView } from '../MushroomView/MushroomView.js';
const mushroom=resourceURL(config.paths.mushroom);
const critical=resourceURL(config.paths.criticalhit);
export class MushroomBoomView {
  readonly guide=new GameplayGuideDialog();
  readonly mushroom:MushroomView;
  readonly start=element('img','mx-critical-start');
  private bindings=new BindingScope(this);private started=0;private animation?:Animation;private destroyed=false;
  constructor(private data:ProtocolRoomData,stage:HTMLElement){
    this.mushroom=new MushroomView(data.mushroom,stage);
    this.start.src=resourceURL(config.paths.critical_start);this.start.hidden=true;
    stage.append(this.mushroom.root,this.start);this.bindings.bind({critical:data.criticalHit});
    queueMicrotask(()=>{if(!this.destroyed&&this.start.isConnected)this.introduce();});
  }
  @bindEvent(CriticalHitData.CHANGE,'critical')
  private changed():void {
    const s=this.data.criticalHit.state;if(s.start===this.started)return;this.started=s.start;
    this.animation?.cancel();this.start.hidden=!s.enabled||!s.start;if(!s.enabled||!s.start)return;
    this.animation=this.start.animate(config.layout.startAnimation.frames,{duration:config.layout.startAnimation.duration});
    this.animation.onfinish=()=>{this.start.hidden=true;};
  }
  private criticalConfig(){const r=this.data.record;if(!r)return;const sub=r.subConfigsList.find(v=>v.criticalHit>0);return sub?{ante:sub.ante,rounds:sub.rounds,wait:r.rounds}:r.criticalHit>0?{ante:r.ante,rounds:r.rounds,wait:r.subConfigsList[0]?.rounds??0}:undefined;}
  private introduce():void {
    const r=this.data.record;if(!r)return;
    const boom=()=>{if(this.destroyed)return;const c=this.criticalConfig();if(c&&localStorage.getItem('mx-critical-hit-intro-hidden')!=='true')this.guide.show('critical-hit',()=>i18nMgr.Get('UIHitGameTitle'),critical,()=>StringHelper.Format(i18nMgr.Get('UICriticalHit_StartGameTips'),[`<color=#FFC706>${c.wait}</color>`])+`<color=#FFC706>${c.ante/100}(${c.ante/((this.data.snapshot?.roomInfo?.smallBlind??0)*2)}BB)</color>`,()=>{});};
    if(r.mushroomBase>0&&localStorage.getItem('mx-mushroom-intro-hidden')!=='true')this.guide.show('mushroom',()=>i18nMgr.Get('UIMushroomGameTitle'),mushroom,()=>StringHelper.Format(i18nMgr.Get('UIMushroom_StartGameTips'),[`<color=#FFC706>${StringHelper.GetLongString(r.mushroomBase)}</color>`]),boom);else boom();
  }
  infoLines():string[]{
    const r=this.data.record;if(!r)return [];const lines:string[]=[];
    if(r.mushroomBase>0)lines.push(`1${i18nMgr.Get('UIMush')} = ${StringHelper.GetLongString(r.mushroomBase)}`,`${i18nMgr.Get('UIMushYaJin')}: ${StringHelper.GetLongString(r.mushroomBase*(r.mushroomMode||1))}`);
    const c=this.criticalConfig();if(c){lines.push(`${i18nMgr.Get('UIHitGamePlayTips4')}:${c.ante/((this.data.snapshot?.roomInfo?.smallBlind??0)*2)}BB`);const s=this.data.criticalHit.state;if(s.enabled)lines.push(`${i18nMgr.Get('UIHitGamePlayOpen')}:${s.round+1}/${c.rounds}`);}
    return lines;
  }
  destroy():void {this.destroyed=true;this.animation?.cancel();this.bindings.destroy();this.mushroom.destroy();this.start.remove();this.guide.destroy();}
}
