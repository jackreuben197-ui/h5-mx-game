import { mediaRange, type MediaRule } from '../audio/MediaRule.js';
/** HTML audio/video may seek through source seconds without decoding the whole file into a JS buffer. */
export class MediaElementSegment {
  private frame=0;private disposed=false;private start=0;private end=Infinity;
  constructor(private element:HTMLMediaElement,private rule:MediaRule={}){
    element.preload=rule.preload==='auto'?'auto':rule.preload==='none'?'none':'metadata';
    element.volume=Math.max(0,Math.min(1,rule.volume??1));
    element.loop=!!rule.loop&&!rule.start&&rule.duration===undefined;
    element.addEventListener('loadedmetadata',this.metadata);element.addEventListener('timeupdate',this.update);
    element.addEventListener('playing',this.playing);element.addEventListener('pause',this.paused);element.addEventListener('ended',this.ended);
  }
  private metadata=()=>{
    const range=mediaRange(Number.isFinite(this.element.duration)?this.element.duration:undefined,this.rule.start,this.rule.duration);
    this.start=range.start;this.end=range.duration===undefined?Infinity:this.start+range.duration;
    if(this.start)this.element.currentTime=this.start;
  };
  private ended=()=>{
    this.element.pause();if(this.rule.loop&&!this.disposed){this.element.currentTime=this.start;void this.element.play().catch(()=>{});}
  };
  private update=()=>{if(this.element.currentTime>=this.end)this.ended();};
  private playing=()=>{
    cancelAnimationFrame(this.frame);
    if(!this.rule.start&&this.rule.duration===undefined)return;
    const tick=()=>{if(this.disposed||this.element.paused)return;this.update();if(!this.element.paused)this.frame=requestAnimationFrame(tick);};this.frame=requestAnimationFrame(tick);
  };
  private paused=()=>cancelAnimationFrame(this.frame);
  destroy():void{
    this.disposed=true;cancelAnimationFrame(this.frame);
    this.element.removeEventListener('loadedmetadata',this.metadata);this.element.removeEventListener('timeupdate',this.update);
    this.element.removeEventListener('playing',this.playing);this.element.removeEventListener('pause',this.paused);this.element.removeEventListener('ended',this.ended);
  }
}
