import config from './config.json';
import { element } from '../../dom.js';
export class ActionButton {
  static readonly config=config;
  static create(action:string,label:(()=>string)|undefined,paint:(node:HTMLElement,path:string)=>void):HTMLButtonElement {
    const root=element('button',`mx-operation-button mx-operation-${action}`,label);
    root.type='button';root.style.setProperty('--mx-button-anchor-x',`${-config.anchor.x*100}%`);root.style.setProperty('--mx-button-anchor-y',`${-config.anchor.y*100}%`);root.style.transformOrigin=`${config.anchor.x*100}% ${config.anchor.y*100}%`;
    const key=action==='fold'?'fold':action==='check'||action==='call'?'call':'raise';
    paint(root,config.paths[key]);
    return root;
  }
}
