import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
import type { TableSnapshot } from '../../../../core/types.js';
import type { LayoutContentOptions } from '../../../../ui/TableLayout.js';
export class LayoutBalanced extends LayoutProfile {
  constructor() { super(tableLayouts.balanced,{boardWidth:50.59,separateDualPot:false}); }

  private bottomArea() {
    const profile=this.profile,unit=Math.min(this.width/profile.width,this.height/profile.height);
    const local=199/profile.avatar,scale=profile.avatar*unit/199;
    const groupBottom=Math.max(profile.heroInfoY*local+76,profile.heroDealer[1]*local+38.5)*scale;
    const previousY=(this.viewportBottom-2)/this.unit-groupBottom;
    // Both felt textures put the centre of the arc 169 design pixels above the bottom.
    const emptyY=this.height-(169+profile.avatar/4)*unit;
    const maxDrop=(profile.heroInfoY-profile.heroCardsY-profile.heroCardHeight/2-2)*unit;
    const drop=Math.max(0,Math.min(maxDrop,emptyY-previousY));
    return {y:previousY+drop,emptyY,drop,local,scale};
  }

  override positions(state:TableSnapshot,publicCardScale=1) {
    const result=super.positions(state,publicCardScale);
    if(this.landscape)return result;
    const bottom=result.get(state.mySeat||1);
    if(bottom){
      const area=this.bottomArea();
      bottom.y=state.mySeat?area.y:area.emptyY;
      // The dealer follows the group until it reaches the navigation's top edge.
      bottom.dealerY=Math.min(bottom.dealerY,((this.viewportBottom-2)/this.unit-bottom.y)/bottom.scale-44);
    }
    return result;
  }

  override content(options:LayoutContentOptions) {
    const content=super.content(options);
    if(!this.landscape){
      const area=this.bottomArea();
      // Compensate only the balance while avatar, hand and controls move together.
      content.styles['--mx-hero-info-y']=`${this.profile.heroInfoY*area.local-area.drop/area.scale}px`;
      content.styles['--mx-ring-hand-type-x']=`${80*area.local}px`;
    }
    return content;
  }
}
