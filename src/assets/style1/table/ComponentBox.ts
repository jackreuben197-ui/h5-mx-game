/** An auto axis retains the component's responsive CSS; a numeric axis is local design pixels. */
export interface ComponentBoxConfig {w:number|string;h:number|string;anchor:{x:number;y:number}}
export function componentBox<T extends HTMLElement>(root:T,config:ComponentBoxConfig):T {
  for(const [dimension,margin,anchor] of [['w','marginLeft','x'],['h','marginTop','y']] as const){
    const value=config[dimension];
    if(value==='auto')continue;
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Invalid component size');
    root.style[dimension==='w'?'width':'height']=value+'px';
    root.style[margin]=-value*config.anchor[anchor]+'px';
  }
  if(config.w!=='auto'||config.h!=='auto')root.style.transformOrigin=config.anchor.x*100+'% '+config.anchor.y*100+'%';
  return root;
}
