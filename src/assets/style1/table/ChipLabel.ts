import { element } from './dom.js';
import { i18nLabel } from '../../../i18n/i18nLabel.js';
/** Preserve the shared formatter's output; only style its unit separately. */
export function chipLabel(node:HTMLElement,value:string|(()=>string)):void{
  const text=typeof value==='function'?value():value;
  const match=text.match(/^(.*?)(\s*BB)$/s);
  if(match){
    const amount=element('span','',match[1]!);
    if(typeof value==='function')i18nLabel.bind(amount,()=>value().replace(/\s*BB$/,''));
    node.replaceChildren(amount,element('small','mx-chip-unit',match[2]!));
  }
  else if(typeof value==='function')i18nLabel.bind(node,value);
  else node.textContent=text;
}
