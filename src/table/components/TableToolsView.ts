import type { RoomRecords } from '../../core/RoomRecords.js';
import type { TableSnapshot } from '../../core/types.js';
import { element } from '../dom.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
/** CC right-side controls share the existing bring-in and H5 safety-guard entry. */
export class TableToolsView {
  readonly root=element('div','mx-table-tools');
  private add=element('button','mx-table-add-chips');
  private safety=element('button','mx-table-safety');
  constructor(private records:RoomRecords,bringIn:()=>void){
    const diamond=records.data.record?.goldType===4&&!records.config.global.isChannelDiamondFreeMode;
    this.add.style.backgroundImage=`url("${diamond?new URL('../../assets/raw/table-tools/diamond-add.png',import.meta.url).href:new URL('../../assets/raw/table-tools/chip-add.png',import.meta.url).href}")`;
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
