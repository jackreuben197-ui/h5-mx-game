import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
import type { TableSnapshot } from '../../../../core/types.js';
import type { LayoutContentOptions } from '../../../../ui/TableLayout.js';
export class LayoutOval extends LayoutProfile {
  constructor() { super(tableLayouts.oval,{boardWidth:50.59,separateDualPot:false}); }

  override positions(state:TableSnapshot,publicCardScale=1) {
    const result=super.positions(state,publicCardScale);
    if(this.landscape)return result;
    const bottom=result.get(state.mySeat||1);
    if(bottom){
      const area=this.ringHeroArea(this.profile.avatar/2);
      bottom.y=state.mySeat?area.y:area.emptyY;
      if(state.mySeat)bottom.cardsY=area.cardsY;
      bottom.dealerY=Math.min(bottom.dealerY,((this.viewportBottom-2)/this.unit-bottom.y)/bottom.scale-44);
    }
    return result;
  }

  override content(options:LayoutContentOptions) {
    const content=super.content(options);
    if(!this.landscape){
      const area=this.ringHeroArea(this.profile.avatar/2);
      content.styles['--mx-hero-info-y']=`${area.infoY}px`;
      content.styles['--mx-ring-hand-type-y']=`${area.typeY}px`;
      content.styles['--mx-ring-result-rise']=`${area.resultRise}px`;
    }
    return content;
  }
}
