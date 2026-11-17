import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { element } from '../../dom.js';
/** CC DanmuManager: eight reusable lanes and queued text; cleared on room teardown. */
export class DanmuView {
  readonly root=componentBox(element('div','mx-danmu'),config);
  private queue:string[]=[];private lanes=new Map<number,{node:HTMLElement;animation:Animation}>();private dead=false;
  play(text:string):void{if(!text||this.dead)return;this.queue.push(text);this.schedule();}
  private schedule():void{
    for(let lane=0;lane<config.layout.lanes&&this.queue.length;lane++){
      if(this.lanes.has(lane))continue;
      const node=element('span','mx-danmu-item',this.queue.shift()!);this.root.append(node);
      const box=this.root.getBoundingClientRect(),unit=box.width/config.layout.designWidth;
      node.style.top=`${box.height*config.layout.topRatio+lane*config.layout.laneHeight*unit}px`;
      const distance=box.width+node.getBoundingClientRect().width,speed=(config.layout.speedMin+Math.random()*config.layout.speedSpread)*unit;
      const animation=node.animate([{transform:`translateX(${box.width}px)`},{transform:`translateX(${-node.getBoundingClientRect().width}px)`}],{duration:distance/Math.max(speed,1)*1000,easing:'linear'});
      this.lanes.set(lane,{node,animation});animation.onfinish=()=>{node.remove();this.lanes.delete(lane);if(!this.dead)this.schedule();};
    }
  }
  destroy():void{this.dead=true;this.queue=[];for(const {node,animation}of this.lanes.values()){animation.cancel();node.remove();}this.lanes.clear();this.root.remove();}
}
