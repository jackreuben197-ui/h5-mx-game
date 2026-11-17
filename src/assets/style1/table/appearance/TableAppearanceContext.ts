import type { TexasGamePersonalSettings } from '../../../../data/TexasGamePersonalSettings.js';
const contexts=new WeakMap<HTMLElement,TexasGamePersonalSettings>();
export function bindTableAppearance(root:HTMLElement,settings:TexasGamePersonalSettings):void {contexts.set(root,settings);}
export function tableAppearanceFor(node:HTMLElement):TexasGamePersonalSettings|undefined {
  for(let p:HTMLElement|null=node;p;p=p.parentElement){const value=contexts.get(p);if(value)return value;}
}
