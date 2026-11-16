import { tableLayouts } from './appearance/TableLayoutProfile.js';
import type { TableLayoutId } from '../data/TexasGamePersonalSettings.js';
import { SeatPosition, SeatPositionCaculator } from '../core/seat-layout.js';
import { landscapeLayout } from '../core/landscape-layout.js';
import type { TableSnapshot } from '../core/types.js';
import type { SeatPlacement } from './components/SeatView.js';
/** Display coordinates only. Changing this class never changes seat IDs or protocol data. */
export class TableLayout {
  profile: TableLayoutId = 'original';
  get modern() { return !this.landscape && this.profile !== 'original' ? tableLayouts[this.profile] : undefined; }
  publicCardScale=1;
  unit = 1;
  width = 1440;
  height = 2688;
  suggest = 1;
  landscape = false;
  origin = { x: 720, y: 1000 };
  private seats = new SeatPositionCaculator();
  resize(width: number, height: number, landscape: boolean): void {
    this.landscape = landscape;
    // Classic's lowest chip label reaches about y=740 in its 782-unit design.
    // Fit the whole layout above the fixed footer on short viewports, keeping cards/buttons together.
    if(!landscape&&this.profile==='classic')height=Math.min(height,(height-50)*782/740);
    this.unit = landscape ? height / 1440 : width / height > 0.75 ? height / 2688 : width / 1440;
    this.width = width / this.unit;
    this.height = height / this.unit;
    this.suggest = Math.min(1, Math.max(this.height / 2688, 0.85));
    const offset = this.suggest < 1 ? 20 : 100;
    this.seats.initWithContainer(
      this.width > this.height ? this.width * 0.8 : this.width - 40,
      this.height - (this.landscape ? 0 : 200 * this.suggest) - offset * this.suggest,
      -offset * this.suggest,
    );
    this.origin = landscape
      ? { x: this.width / 2, y: this.height * 0.43 }
      : { x: this.width / 2, y: 1000 * this.suggest };
  }
  positions(state: TableSnapshot): Map<number, SeatPlacement> {
    this.seats.arrageSeatPositions(state.seatCount);
    const positions = this.seats.getPositions(state.seatCount),
      wide = this.landscape ? landscapeLayout(this.width, this.height, state.seatCount) : null;
    const result = new Map<number, SeatPlacement>();
    for (let id = 1; id <= state.seatCount; id++) {
      const slot = (id - (state.mySeat || 1) + state.seatCount) % state.seatCount,
        position = positions[slot]!,
        p = this.seats.getPosition(position),
        landscapeSeat = wide?.[slot];
      const mine = id === state.mySeat,
        left = landscapeSeat
          ? landscapeSeat.edge === 'left'
          : [SeatPosition.BottomLeft, SeatPosition.MiddleLeft, SeatPosition.TopLeft].includes(
              position,
            );
      const face = mine || state.players.find((v) => v.seat === id)?.cards.some((v) => v > 0),
        centeredBack = landscapeSeat && !mine && ['top', 'bottom'].includes(landscapeSeat.edge);
      const dealer = mine
        ? [-320, 30]
        : landscapeSeat
          ? ['top', 'bottom'].includes(landscapeSeat.edge)
            ? [140, 0]
            : [0, 215]
          : left || position >= SeatPosition.TopRight
            ? [0, 215]
            : [65, 220];
      // SeatPlayer.onUpdatePosition coordinates, with CC's upward y converted to DOM.
      let betX = 0, betY = -180, betIconX = -25;
      if (mine) { betX = 175; betY = -360; }
      else if (left) { betX = 190; betY = 70; }
      else if (position === SeatPosition.TopMiddleLeft) { betX = -65; betY = 215; }
      else if ([SeatPosition.TopMiddle, SeatPosition.TopMiddleRight].includes(position)) { betX = -85; betY = 215; betIconX = 133; }
      else if ([SeatPosition.TopRight, SeatPosition.MiddleRight, SeatPosition.BottomRight].includes(position)) { betX = -180; betY = 70; betIconX = 133; }
      if (landscapeSeat && !mine) {
        if (landscapeSeat.edge === 'left') { betX = 190; betY = 70; betIconX = -25; }
        else if (landscapeSeat.edge === 'right') { betX = -180; betY = 70; betIconX = 133; }
        else { betX = 0; betY = landscapeSeat.edge === 'top' ? 215 : -180; betIconX = -25; }
      }
      result.set(id, {
        betX, betY, betIconX,
        x: landscapeSeat?.x ?? this.width / 2 + p.position.x,
        y: landscapeSeat?.y ?? -p.position.y + (position === SeatPosition.BottomMiddle ? 20 : 0),
        scale: landscapeSeat?.scale ?? p.scale,
        edge: landscapeSeat?.edge ?? 'portrait',
        cardsX: face ? 0 : centeredBack ? 55 : left ? 160 : -160,
        cardsY: face
          ? mine
            ? -235
            : 0
          : centeredBack
            ? landscapeSeat.edge === 'top'
              ? 250
              : -190
            : -5,
        cardScale: face && !mine ? 0.65 : 1,
        dealerX: dealer[0]!,
        dealerY: dealer[1]!,
      });
    }
    const profile=this.modern;
    if(!this.landscape&&!profile&&state.mySeat){
      const own=result.get(state.mySeat);
      // Reserve the navigation and the full chip label, including its 110% font setting.
      if(own)own.y=Math.min(own.y,this.height-54/this.unit-160*own.scale);
    }
    if(profile){
      const unit=Math.min(this.width/profile.width,this.height/profile.height);
      const height=this.height;
      for(const [id,p] of result){
        const slot=(id-(state.mySeat||1)+state.seatCount)%state.seatCount;
        const [x,y]=profile.anchors[state.seatCount]![slot]!;
        const mine=id===state.mySeat;
        const player=state.players.find(player=>player.seat===id);
        const face=mine||player?.cards.some(card=>card>0);
        const local=199/profile.avatar;
        p.x=Math.max(34*unit,Math.min(this.width-34*unit,x/profile.width*this.width));
        p.y=y/profile.height*height;
        p.scale=profile.avatar*unit/199;
        // Reserve the complete local player group above navigation, then anchor every
        // child to this adjusted avatar. Design distances scale with the existing seat unit.
        if(mine)p.y=Math.min(p.y,height-50/this.unit-(profile.heroInfoY*local+54)*p.scale);
        p.edge=x<220?'left':x>220?'right':slot===0?'bottom':'top';
        p.cardsX=face?0:(x<220?14:-14)*local;
        p.cardsY=(mine?profile.heroCardsY:face?0:14)*local;
        p.cardScale=mine?profile.heroCardWidth*local/120:face?58*local/(390-270/Math.max(2,player?.cards.length??2)):18*local/65;
        p.handSpread=mine?profile.heroHandSpread:270;
        // Both top seats bet below their own stack, rather than towards each other.
        const topSeat=!mine && x>30 && x<410;
        p.betX=(mine?68:topSeat?0:x<220?65:x>220?-65:0)*local;
        p.betY=(mine?6:topSeat?60:profile.id==='classic'?24:-10)*local;
        // Keep bets in the avatar coordinate system, outside either board's occupied band.
        if(!mine&&((state.community?.length??0)||state.secondCommunity?.length)){
          const dual=!!state.secondCommunity?.length;
          const cardWidth=(profile.id==='classic'?59.5:50.59)*unit*this.publicCardScale*(dual?.85:1);
          const cardHeight=cardWidth*71.02/50.59;
          const center=profile.boardY/profile.height*height;
          const gap=cardHeight+10*unit;
          const halfWidth=cardWidth*Math.max((state.community?.length??0),state.secondCommunity?.length??0)/2;
          const top=center-cardHeight/2-(dual?gap/2:0),bottom=center+cardHeight/2+(dual?gap/2:0);
          const bx=p.x+p.betX*p.scale,by=p.y+p.betY*p.scale,halfBet=35*p.scale;
          if(bx+120*p.scale>this.width/2-halfWidth&&bx-120*p.scale<this.width/2+halfWidth&&by+halfBet>top-6*unit&&by-halfBet<bottom+6*unit){
            const above=top-halfBet-6*unit,below=bottom+halfBet+6*unit;
            p.betY=((Math.abs(by-above)<Math.abs(by-below)?above:below)-p.y)/p.scale;
          }
        }
        p.dealerX=(mine?profile.heroDealer[0]:(x<220?1:-1)*profile.otherDealerX)*local;
        p.dealerY=(mine?profile.heroDealer[1]:profile.otherDealerY)*local;
      }
      this.origin={x:this.width/2,y:profile.boardY/profile.height*height};
    }
    return result;
  }
}
