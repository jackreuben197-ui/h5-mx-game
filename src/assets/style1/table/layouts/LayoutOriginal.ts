import { SeatPosition, SeatPositionCaculator } from './seat-layout.js';
import { landscapeLayout } from './landscape-layout.js';
import type { TableSnapshot } from '../../../../core/types.js';
import type { SeatPlacement } from '../../../../ui/TableLayout.js';
/** Display coordinates only. Changing this class never changes seat IDs or protocol data. */
import type { TableLayout, LayoutContentOptions, LayoutContent, LayoutControls } from '../../../../ui/TableLayout.js';
export class LayoutOriginal implements TableLayout {
  readonly id: string = 'original';
  get compactRoomInfo(): boolean { return false; }
  unit = 1;
  menuScale = 1;
  protected viewportBottom = 0;
  width = 1440;
  height = 2688;
  suggest = 1;
  landscape = false;
  origin = { x: 720, y: 1000 };
  private seats = new SeatPositionCaculator();
  resize(width: number, height: number, landscape: boolean, viewportBottom=height-57): void {
    this.landscape = landscape;
    this.viewportBottom=viewportBottom;
    this.menuScale=1;
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
    if(!this.landscape&&state.mySeat){
      const own=result.get(state.mySeat);
      if(own)own.y=Math.min(own.y,this.height-54/this.unit-160*own.scale);
    }
    return result;
  }

  content({dual, boardSize, jackpotHeight}: LayoutContentOptions): LayoutContent {
    const l=this;
    const scale=l.landscape ? Math.min(1,l.width/1900)*(dual?.85:1) : l.suggest*(dual?.85:1);
    const gap=176*scale*boardSize+24;
    const center=l.landscape ? l.height*(dual?.48:.54) : dual ? l.height*.45 : l.height/2-(l.suggest===1?176:0);
    return {
      board:{x:l.width/2,y:center-(dual?gap/2:0),scale:scale*boardSize},
      secondBoard:{x:l.width/2,y:center+gap/2,scale:scale*boardSize},
      total:l.landscape?{x:l.width/2,y:l.height*(dual?.23:.385)}:{x:l.width/2,y:(697.8+jackpotHeight)*l.suggest},
      pool:l.landscape?{x:l.width/2,y:l.height*(dual?.29:.44)}:{x:l.width/2,y:(775.6+jackpotHeight)*l.suggest},
      info:l.landscape?{x:l.width/2-650*scale,y:l.height*.44}:{x:l.width/2,y:((dual?517.8:1000)+jackpotHeight)*l.suggest},
      styles:{},
    };
  }
  controls(state: TableSnapshot, buttonSize: number): LayoutControls {
    if(this.landscape)return {scale:.24*buttonSize,styles:{}};
    const own=this.positions(state).get(state.mySeat);
    if(!own)return {styles:{}};
    const top=(own.y-210*own.scale)*this.unit-28;
    return {scale:own.scale*this.unit*buttonSize,styles:{
      top:`${top}px`, '--mx-operation-row-y':`${top}px`,
      '--mx-raise-center-y':`${(own.y-910*own.scale)*this.unit}px`,
    }};
  }
}
