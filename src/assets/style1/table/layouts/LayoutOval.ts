import { LayoutProfile } from './LayoutProfile.js';
import { tableLayouts } from './TableLayoutProfile.js';
import type { TableSnapshot } from '../../../../core/types.js';
import type { LayoutContentOptions } from '../../../../ui/TableLayout.js';
export class LayoutOval extends LayoutProfile {
  constructor() { super(tableLayouts.oval,{boardWidth:50.59,separateDualPot:false}); }
  get elevatedActionBubbles():boolean { return !this.landscape; }

  private heroUpperArea() {
    const area=this.ringHeroArea(this.profile.avatar/2);
    const unit=Math.min(this.width/this.profile.width,this.height/this.profile.height);
    const scale=this.profile.avatar*unit/199;
    const clearance=(area.cardsY-199/2)*scale-this.profile.heroCardHeight/2*unit;
    // Lower the upper group by 6 design pixels, retaining a 7px hand gap on short screens.
    const drop=Math.min(6*unit,Math.max(0,clearance-7*unit));
    return {...area,drop,localDrop:drop/scale};
  }

  override controls(state:TableSnapshot,buttonSize:number) {
    const controls=super.controls(state,buttonSize);
    if(this.landscape)return controls;
    const unit=Math.min(this.width/this.profile.width,this.height/this.profile.height)*this.unit;
    const drop=this.heroUpperArea().drop*this.unit;
    Object.assign(controls.styles,{
      '--mx-oval-op-side-drop':`${6*unit}px`,
      '--mx-op-upper-y':`${this.profile.heroRaiseLift*unit-drop}px`,
      '--mx-quick-lift':`${16*unit-drop}px`,
    });
    return controls;
  }

  override positions(state:TableSnapshot,publicCardScale=1) {
    const result=super.positions(state,publicCardScale);
    if(this.landscape)return result;
    const bottom=result.get(state.mySeat||1);
    if(bottom){
      const area=this.heroUpperArea();
      bottom.y=state.mySeat?area.y+area.drop:area.emptyY;
      if(state.mySeat){
        bottom.controlsY=area.y;
        bottom.cardsY=area.cardsY-area.localDrop;
        bottom.dealerY-=area.localDrop;
      }
      if(state.mySeat && !state.players.find(player=>player.seat===state.mySeat)?.cards.length)
        bottom.dealerY=(this.profile.avatar/2+5+7)*199/this.profile.avatar;
      bottom.dealerY=Math.min(bottom.dealerY,((this.viewportBottom-2)/this.unit-bottom.y)/bottom.scale-44);
    }
    return result;
  }

  override content(options:LayoutContentOptions) {
    const content=super.content(options);
    if(!this.landscape){
      const area=this.heroUpperArea();
      content.styles['--mx-hero-info-y']=`${area.infoY-area.localDrop}px`;
      content.styles['--mx-ring-hand-type-y']=`${area.typeY-area.localDrop}px`;
      content.styles['--mx-ring-result-rise']=`${area.resultRise}px`;
      content.styles['--mx-ring-empty-info-y']=`${(this.profile.avatar/2+5)*199/this.profile.avatar}px`;
    }
    return content;
  }
}
