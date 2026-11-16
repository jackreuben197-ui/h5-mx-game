import type { RoomRecords } from '../../core/RoomRecords.js';
import type { TableSnapshot } from '../../core/types.js';
import { element } from '../dom.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
/** CC right-side controls share the existing bring-in and H5 safety-guard entry. */
export class TableToolsView {
  readonly root=element('div','mx-table-tools');
  private add=element('button','mx-table-add-chips mx-table-tool-button');
  private safety=element('button','mx-table-safety');
  constructor(records:RoomRecords,bringIn:()=>void){
    const diamond=records.data.record?.goldType===4&&!records.config.global.isChannelDiamondFreeMode;
    this.add.type=this.safety.type='button';
    const background=element('span','mx-table-tool-background');background.setAttribute('aria-hidden','true');
    const currency=element('img',`mx-table-tool-icon mx-table-tool-${diamond?'diamond':'chip'}`);
    currency.alt='';currency.draggable=false;
    currency.src=diamond?new URL('../../assets/raw/table-tools/diamond.png',import.meta.url).href:new URL('../../assets/raw/table-tools/chip.png',import.meta.url).href;
    const plus=element('img','mx-table-tool-icon mx-table-tool-plus');plus.alt='';plus.draggable=false;
    plus.src=new URL('../../assets/raw/table-tools/plus.png',import.meta.url).href;
    this.add.append(background,currency,plus);
    this.safety.style.backgroundImage=`url("${new URL('../../assets/raw/table-tools/safety.png',import.meta.url).href}")`;
    i18nLabel.bind(this.add,()=>i18nMgr.Get('UITexas_AddChipsMenu'),'aria-label');
    i18nLabel.bind(this.safety,()=>i18nMgr.Get('Safe',[],'安全卫士'),'aria-label');
    this.add.onclick=bringIn;this.safety.onclick=()=>records.safetyGuard?.();
    this.root.append(this.add,this.safety);this.add.hidden=true;
    this.safety.hidden=!(records.data.record?.tribeId);
  }
  render(state:TableSnapshot):void{this.add.hidden=!state.mySeat||!!state.matchID;}
  destroy():void{this.root.remove();}
}
