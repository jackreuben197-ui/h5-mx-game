import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
import type { TableSnapshot } from '../../../../core/types.js';
export class LayoutClassic extends LayoutProfile {
  readonly elevatedBets = true;
  constructor(){super(tableLayouts.classic,{boardWidth:50.59,separateDualPot:true});}
  override positions(state:TableSnapshot,publicCardScale=1) {
    const result=super.positions(state,publicCardScale);
    const own=result.get(state.mySeat);
    if(!this.landscape&&own)this.lowerHeroAvatar(own,8*Math.min(this.width/440,this.height/782));
    return result;
  }
  override resize(width:number,height:number,landscape:boolean,viewportBottom=height-57):void {
    const originalUnit=landscape?height/1440:width/height>.75?height/2688:width/1440;
    super.resize(width,landscape?height:Math.min(height,(height-44)*782/738),landscape,viewportBottom);
    this.viewportHeight=height;
    this.menuScale=landscape?1:originalUnit/this.unit;
  }
}
