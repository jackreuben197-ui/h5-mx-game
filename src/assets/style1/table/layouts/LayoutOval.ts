import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
import type { TableSnapshot } from '../../../../core/types.js';
import type { LayoutContentOptions } from '../../../../ui/TableLayout.js';
export class LayoutOval extends LayoutProfile {
  constructor() { super(tableLayouts.oval,{boardWidth:50.59,separateDualPot:false}); }

  private bottomArea() {
    const profile=this.profile,unit=Math.min(this.width/profile.width,this.height/profile.height);
    const local=199/profile.avatar,scale=profile.avatar*unit/199;
    // Avatar bottom touches the centre of the felt's arc.
    const emptyY=this.height-(169+profile.avatar/2)*unit;
    const menuTop=(this.viewportBottom-2)/this.unit;
    // Reserve room for both the balance row and its two-line settlement result.
    const balanceTail=8.5*local+57;
    const handBottom=(profile.heroCardsY+profile.heroCardHeight/2+2)*unit;
    const y=Math.min(emptyY,menuTop-handBottom-balanceTail*scale);
    const infoY=Math.min(profile.heroInfoY*local,(menuTop-y)/scale-balanceTail);
    return {y,emptyY,infoY,local};
  }

  override positions(state:TableSnapshot,publicCardScale=1) {
    const result=super.positions(state,publicCardScale);
    if(this.landscape)return result;
    const bottom=result.get(state.mySeat||1);
    if(bottom){
      const area=this.bottomArea();
      bottom.y=state.mySeat?area.y:area.emptyY;
      bottom.dealerY=Math.min(bottom.dealerY,((this.viewportBottom-2)/this.unit-bottom.y)/bottom.scale-44);
    }
    return result;
  }

  override content(options:LayoutContentOptions) {
    const content=super.content(options);
    if(!this.landscape){
      const area=this.bottomArea();
      content.styles['--mx-hero-info-y']=`${area.infoY}px`;
      content.styles['--mx-ring-hand-type-x']=`${80*area.local}px`;
    }
    return content;
  }
}
