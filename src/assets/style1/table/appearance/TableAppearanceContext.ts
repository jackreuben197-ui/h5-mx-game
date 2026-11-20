import type { TexasGamePersonalSettings } from '../../../../data/TexasGamePersonalSettings.js';
/** PC modes share the saved table appearance; portrait keeps its legacy defaults. */
export function renderedTableAppearance(node:HTMLElement,settings:TexasGamePersonalSettings) {
  return node.closest<HTMLElement>('.mx-table')?.dataset.orientation==='landscape'
    ? settings.appearance : settings.tableAppearance;
}
const contexts=new WeakMap<HTMLElement,TexasGamePersonalSettings>();
export function bindTableAppearance(root:HTMLElement,settings:TexasGamePersonalSettings):void {contexts.set(root,settings);}
export function tableAppearanceFor(node:HTMLElement):TexasGamePersonalSettings|undefined {
  for(let p:HTMLElement|null=node;p;p=p.parentElement){const value=contexts.get(p);if(value)return value;}
}
