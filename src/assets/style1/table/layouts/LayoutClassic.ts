import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
export class LayoutClassic extends LayoutProfile {
  constructor(){super(tableLayouts.classic,{boardWidth:50.59,separateDualPot:true});}
  override resize(width:number,height:number,landscape:boolean,viewportBottom=height-57):void {
    const originalUnit=landscape?height/1440:width/height>.75?height/2688:width/1440;
    super.resize(width,landscape?height:Math.min(height,(height-44)*782/738),landscape,viewportBottom);
    this.menuScale=originalUnit/this.unit;
  }
}
