import { resources } from '../resources.js';
import { element } from '../dom.js';
/** Original full-size art in dev; high-DPI thumbnail atlas only when built. */
export class DeskPreview {
  readonly root:HTMLElement;
  constructor(type:number){
    if(resources.mode==='raw'){
      const img=element('img','mx-settings-desk-thumb');img.loading='lazy';img.decoding='async';img.alt='';img.src=resources.desks[String(type)]!;this.root=img;
    }else{
      const span=element('span','mx-settings-desk-thumb');span.style.backgroundImage=`url("${resources.deskThumbs}")`;
      span.style.backgroundSize='400% 400%';span.style.backgroundPosition=`${((type-1)%4)*100/3}% ${Math.floor((type-1)/4)*100/3}%`;this.root=span;
    }
  }
}
