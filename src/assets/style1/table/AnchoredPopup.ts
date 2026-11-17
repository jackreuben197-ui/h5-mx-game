/** Style-owned adapter between a local control and the dialog's unclipped overlay. */
export class AnchoredPopup {
  private cleanup?:()=>void;
  constructor(private overlay:HTMLElement,private clip:HTMLElement){}
  mount(list:HTMLElement,anchor:HTMLElement,close:()=>void):void {
    this.overlay.append(list);
    const scroll=()=>{if(!this.position(list,anchor))close();};
    const outside=(event:MouseEvent)=>{const target=event.target as Node;if(!anchor.contains(target)&&!list.contains(target))close();};
    this.clip.addEventListener('scroll',scroll,{passive:true});this.overlay.addEventListener('click',outside);
    this.cleanup=()=>{this.clip.removeEventListener('scroll',scroll);this.overlay.removeEventListener('click',outside);list.remove();};
  }
  position(list:HTMLElement,anchor:HTMLElement):boolean {
    if(list.hidden)return true;
    const a=anchor.getBoundingClientRect(),clip=this.clip.getBoundingClientRect();
    if(!a.height||a.bottom<=clip.top||a.top>=clip.bottom)return false;
    const frame=this.overlay.getBoundingClientRect();
    const sx=frame.width/this.overlay.clientWidth||1,sy=frame.height/this.overlay.clientHeight||1;
    const below=(frame.bottom-a.bottom)/sy,above=(a.top-frame.top)/sy;
    list.style.left=`${(a.left-frame.left)/sx}px`;list.style.width=`${a.width/sx}px`;
    list.style.removeProperty('--mx-wallet-space');
    const opensAbove=list.offsetHeight>below&&above>below;
    list.style.setProperty('--mx-wallet-space',`${opensAbove?above:below}px`);
    list.style.top=opensAbove?'auto':`${(a.bottom-frame.top)/sy}px`;
    list.style.bottom=opensAbove?`${(frame.bottom-a.top)/sy}px`:'auto';
    return true;
  }
  destroy():void{this.cleanup?.();this.cleanup=undefined;}
}
