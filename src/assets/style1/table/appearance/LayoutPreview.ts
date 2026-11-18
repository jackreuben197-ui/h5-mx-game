import type { TableLayoutId } from '../../../../data/TexasGamePersonalSettings.js';
import { element } from '../dom.js';
import { tableLayouts } from '../layouts/TableLayoutProfile.js';
/** Small layout diagrams use the same seat anchors as the live table. */
export class LayoutPreview {
  readonly root=element('span','mx-layout-preview');
  constructor(id:TableLayoutId){
    this.root.setAttribute('aria-hidden','true');this.root.dataset.layout=id;
    const profile=tableLayouts[id==='original'?'classic':id];
    for(const [x,y] of profile.anchors[9]!){const dot=element('i','');dot.style.left=`${x/440*100}%`;dot.style.top=`${y/782*100}%`;this.root.append(dot);}
    const board=element('span','mx-layout-preview-board');board.style.top=`${profile.boardY/782*100}%`;
    for(const rank of ['A','K','Q','J','10'])board.append(element('b','',rank));this.root.append(board);
    const hand=element('span','mx-layout-preview-hand');hand.append(element('b','','A'),element('b','','K'));this.root.append(hand);
  }
}
