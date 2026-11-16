import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import type { TableSettingRow } from '../../logic/GameplayTableSetting.js';
/** Stable row nodes retain scroll position when bound room data changes. */
export class TableSettingRowView {
  readonly root=element('div','mx-room-setting-row');
  private newMark=element('span','mx-room-setting-new','NEW');
  private title=element('span','mx-room-setting-label');
  private value=element('span','mx-room-setting-value');
  private tip=element('button','mx-room-setting-info');
  private detail=element('p','mx-room-setting-detail');
  private description='';
  constructor(showTip:(title:string,description:string)=>void) {
    this.tip.type='button';SpriteAtlas.paintWarning(this.tip);
    this.tip.onclick=()=>showTip(this.title.textContent??'',this.description);
    const heading=element('div','mx-room-setting-heading');heading.append(this.title,this.newMark,this.tip);
    this.root.append(heading,this.value,this.detail);
  }
  update(row:TableSettingRow):void {
    this.root.dataset.id=row.id;
    this.newMark.hidden=!row.isNew;
    if(this.title.textContent!==row.title)this.title.textContent=row.title;
    if(this.value.textContent!==row.value)this.value.textContent=row.value;
    this.value.style.color=row.color;
    this.tip.hidden=!row.tips;this.description=row.tips??'';this.tip.setAttribute('aria-label',row.title);
    this.detail.hidden=!row.detail; if(this.detail.textContent!==(row.detail??''))this.detail.textContent=row.detail??'';
  }
}
