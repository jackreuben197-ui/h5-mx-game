import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import { MushroomData } from '../../data/MushroomData.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { element } from '../dom.js';
/** One pool moves between dealer seats, as CC SeatManager/SeatPlayer do. */
export class MushroomView {
  readonly root=element('div','mx-mushroom-pool');
  private icon=element('span','mx-mushroom-icon');
  private amount=element('span','mx-mushroom-amount');
  private count=element('span','mx-mushroom-count');
  private bindings=new BindingScope(this);
  private motion?:Animation;private mirror?:Animation;private serial=-1;private destroyed=false;
  constructor(private data:MushroomData,private stage:HTMLElement){
    this.icon.style.backgroundImage=`url("${new URL('../../assets/raw/mushroom/table_icon_mushroom.png',import.meta.url).href}")`;
    this.amount.style.backgroundImage=`url("${new URL('../../assets/raw/mushroom/pool_bg.png',import.meta.url).href}")`;
    this.count.style.backgroundImage=`url("${new URL('../../assets/raw/squid/squid_bg_red.png',import.meta.url).href}")`;
    this.root.append(this.amount,this.icon,this.count);this.bindings.bind({mushroom:data});
  }
  @bindEvent(MushroomData.CHANGE,'mushroom')
  private changed():void {queueMicrotask(()=>{if(!this.destroyed)this.resize();});}
  resize():void {
    if(this.destroyed)return;
    const s=this.data.state,seat=this.position(s.seat);this.root.hidden=!seat||!s.pool;if(!seat)return;
    const first=s.serial!==this.serial;this.serial=s.serial;
    const transform=`scale(${seat.scale})`;Object.assign(this.root.style,{left:`${seat.x}px`,top:`${seat.y}px`,transform});
    this.root.dataset.side=seat.side<0?'right':'left';this.root.style.setProperty('--mushroom-side',String(seat.side));
    this.amount.textContent=StringHelper.GetLongString(s.pool);this.count.textContent=String(s.count);
    if(!first)return;
    this.motion?.cancel();this.mirror?.cancel();this.amount.style.opacity=this.count.style.opacity='1';
    const previous=s.animate&&s.previousSeat?this.position(s.previousSeat):undefined;
    if(previous){
      this.amount.style.opacity=this.count.style.opacity='0';
      this.mirror=this.icon.animate([{transform:`scaleX(${previous.side})`},{transform:`scaleX(${seat.side})`}],{duration:600,easing:'cubic-bezier(.215,.61,.355,1)'});
      this.motion=this.root.animate([{transform:`translate(${previous.x-seat.x}px,${previous.y-seat.y}px) scale(${previous.scale})`},{transform}],{duration:600,easing:'cubic-bezier(.215,.61,.355,1)'});
      this.motion.onfinish=()=>{this.amount.style.opacity=this.count.style.opacity='1';};
    }
  }
  private position(id:number):{x:number;y:number;scale:number;side:number}|undefined {
    const node=this.stage.querySelector<HTMLElement>(`.mx-seat[data-seat="${id}"]`);if(!node)return;
    const r=node.getBoundingClientRect(),stage=this.stage.getBoundingClientRect(),unit=stage.width/this.stage.offsetWidth;
    if(!unit)return;const scale=Number(node.dataset.scale??1),side=node.dataset.edge==='right'?-1:1;
    return {x:(r.left-stage.left)/unit+75*scale*side,y:(r.top-stage.top)/unit-74*scale,scale,side};
  }
  destroy():void {this.destroyed=true;this.motion?.cancel();this.mirror?.cancel();this.bindings.destroy();this.root.remove();}
}
