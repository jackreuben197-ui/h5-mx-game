import type { ComponentFrame } from '../../../ui/ComponentFrame.js';
/** Explicit local box. Parent places the anchor; descendants use this component's own space. */
export function localFrame(root: HTMLElement, width: number, height: number, x=.5, y=.5): ComponentFrame {
  const frame={width,height,anchor:{x,y}};
  root.style.width=`${width}px`;root.style.height=`${height}px`;
  root.style.marginLeft=`${-width*x}px`;root.style.marginTop=`${-height*y}px`;
  root.style.transformOrigin=`${width*x}px ${height*y}px`;
  root.dataset.frameWidth=String(width);root.dataset.frameHeight=String(height);
  root.dataset.anchorX=String(x);root.dataset.anchorY=String(y);
  return frame;
}

/** Convert the component's declared anchor to viewport space for effect adapters. */
export function viewportAnchor(root: HTMLElement): {x:number;y:number} {
  const rect=root.getBoundingClientRect();
  return {x:rect.left+rect.width*Number(root.dataset.anchorX??0),y:rect.top+rect.height*Number(root.dataset.anchorY??0)};
}
