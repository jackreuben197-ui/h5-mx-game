import { componentBox } from '../../ComponentBox.js';
import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import './layout.css';
import type { RoomRecords } from '../../../../../core/RoomRecords.js';
import type { TableSnapshot } from '../../../../../core/types.js';
import { element } from '../../dom.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
/** CC right-side controls share the existing bring-in and H5 safety-guard entry. */
export class TableToolsView {
  readonly root=componentBox(element('div','mx-table-tools'),config);
  private add=element('button','mx-table-add-chips mx-table-tool-button');
  private safety=element('button','mx-table-safety');
  constructor(records:RoomRecords,bringIn:()=>void){
    const diamond=records.data.record?.goldType===4&&!records.config.global.isChannelDiamondFreeMode;
    this.add.type=this.safety.type='button';
    this.add.style.setProperty('--mx-tool-background',`url("${resourceURL(config.paths.toolBackground)}")`);
    const background=element('span','mx-table-tool-background');background.setAttribute('aria-hidden','true');
    const currency=element('img',`mx-table-tool-icon mx-table-tool-${diamond?'diamond':'chip'}`);
    currency.alt='';currency.draggable=false;
    currency.src=diamond?resourceURL(config.paths.diamond):resourceURL(config.paths.chip);
    const plus=element('img','mx-table-tool-icon mx-table-tool-plus');plus.alt='';plus.draggable=false;
    plus.src=resourceURL(config.paths.plus);
    this.add.append(background,currency,plus);
    this.safety.style.backgroundImage=`url("${resourceURL(config.paths.safety)}")`;
    i18nLabel.bind(this.add,()=>i18nMgr.Get('UITexas_AddChipsMenu'),'aria-label');
    i18nLabel.bind(this.safety,()=>i18nMgr.Get('Safe',[],'安全卫士'),'aria-label');
    this.add.onclick=bringIn;this.safety.onclick=()=>records.safetyGuard?.();
    this.root.append(this.add,this.safety);this.add.hidden=true;
    this.safety.hidden=!(records.data.record?.tribeId);
  }
  render(state:TableSnapshot):void{this.add.hidden=!state.mySeat||!!state.matchID;}
  avoidNicknames(table:HTMLElement):void {
    this.safety.style.translate='';
    if(this.safety.hidden || table.dataset.tableLayout!=='classic' || table.dataset.orientation!=='portrait')return;
    const shield=this.safety.getBoundingClientRect();
    let left=shield.left;
    for(const name of table.querySelectorAll<HTMLElement>('.mx-seat[data-edge=right] .mx-player-name')){
      const nick=name.getBoundingClientRect();
      if(nick.width && nick.top<shield.bottom+2 && nick.bottom>shield.top-2 && nick.left<shield.right+2 && nick.right>shield.left-2)
        left=Math.min(left,nick.left-shield.width-2);
    }
    if(left!==shield.left)this.safety.style.translate=`${left-shield.left}px 0`;
  }
  destroy():void{this.root.remove();}
}
