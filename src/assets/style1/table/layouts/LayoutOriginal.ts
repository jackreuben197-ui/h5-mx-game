import { SeatPosition, SeatPositionCaculator } from './seat-layout.js';
import { landscapeLayout } from './landscape-layout.js';
import { sideBetAnchor, legacyBalanceBottom, betHalfHeight, betGap, betEdges } from './seat-bet-layout.js';
import { handCardCount } from '../../../../logic/HandCardCount.js';
import handCardsConfig from '../components/HandCardsView/config.json' with { type: 'json' };
import roomInfoConfig from '../components/RoomInfoView/config.json' with { type: 'json' };
import desktop from './desktop.json' with { type: 'json' };
import jackpotConfig from '../components/JackpotView/config.json' with { type: 'json' };
import potConfig from '../components/PotView/config.json' with { type: 'json' };
import type { TableSnapshot } from '../../../../core/types.js';
import type { SeatPlacement } from '../../../../ui/TableLayout.js';
/** Display coordinates only. Changing this class never changes seat IDs or protocol data. */
import type { TableLayout, LayoutContentOptions, LayoutContent, LayoutControls } from '../../../../ui/TableLayout.js';
export class LayoutOriginal implements TableLayout {
  readonly id: string = 'original';
  get compactRoomInfo(): boolean { return true; }
  unit = 1;
  menuScale = 1;
  protected viewportBottom = 0;
  protected viewportHeight = 0;
  protected get roomInfoWidth(): number {
    if(this.landscape)return roomInfoConfig.layout.landscapeWidth;
    // Use the visible frame so classic's shorter stage keeps the same screen width.
    const scale=Math.min(this.width*this.unit/440,this.viewportHeight/782);
    return roomInfoConfig.layout.portraitWidth*scale/this.unit;
  }
  width = 1440;
  height = 2688;
  suggest = 1;
  landscape = false;
  origin = { x: 720, y: 1000 };
  private seats = new SeatPositionCaculator();
  private landscapePositionUnit = 1;
  resize(width: number, height: number, landscape: boolean, viewportBottom=height-57): void {
    this.landscape = landscape;
    this.viewportBottom=viewportBottom;
    this.viewportHeight=height;
    this.menuScale=1;
    this.landscapePositionUnit = height / desktop.anchorDesignHeight;
    // PC artwork has a fixed Figma size; only the original seat anchors follow
    // the available viewport. Portrait retains its independent adaptation.
    this.unit = landscape ? desktop.avatarSize / desktop.avatarDesignSize : width / height > 0.75 ? height / 2688 : width / 1440;
    this.width = width / this.unit;
    this.height = height / this.unit;
    this.suggest = landscape ? desktop.suggestScale : Math.min(1, Math.max(this.height / 2688, 0.85));
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
  positions(state: TableSnapshot, publicCardScale=1): Map<number, SeatPlacement> {
    this.seats.arrageSeatPositions(state.seatCount);
    const positions = this.seats.getPositions(state.seatCount),
      wide = this.landscape ? landscapeLayout(this.width * this.unit / this.landscapePositionUnit, desktop.anchorDesignHeight, state.seatCount) : null;
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
      // Top display slots bet to the lower left, leaving the dealer at lower right.
      // Only the bottom-center slot keeps the dealer beside its nameplate.
      const dealer = this.landscape || this.id === 'original'
        ? slot === 0 ? [-145, 120]
          : !this.landscape&&[SeatPosition.TopMiddleLeft,SeatPosition.TopMiddle,SeatPosition.TopMiddleRight].includes(position)
            ? [140, 170] : [0, 230.55]
        : mine
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
      const betAnchor=mine?'center':landscapeSeat
        ? landscapeSeat.edge==='left'?'left':landscapeSeat.edge==='right'?'right':'center'
        : left?'left':[SeatPosition.TopRight,SeatPosition.MiddleRight,SeatPosition.BottomRight].includes(position)?'right':'center';
      const visualScale=landscapeSeat?1:p.scale;
      if(betAnchor!=='center')betX=(betAnchor==='left'?1:-1)*sideBetAnchor(visualScale,this.unit);
      const topBet=landscapeSeat?landscapeSeat.edge==='top':[SeatPosition.TopMiddleLeft,SeatPosition.TopMiddle,SeatPosition.TopMiddleRight].includes(position);
      if(!mine&&topBet)betY=Math.max(betY,legacyBalanceBottom+betHalfHeight+betGap(visualScale,this.unit));
      result.set(id, {
        betX, betY, betIconX, betAnchor,
        x: landscapeSeat ? landscapeSeat.x * this.landscapePositionUnit / this.unit : this.width / 2 + p.position.x,
        y: landscapeSeat ? Math.min(landscapeSeat.y,desktop.anchorDesignHeight-(dealer[1]!+desktop.dealerMarkerHeight)*landscapeSeat.scale-desktop.seatEdgeGap) * this.landscapePositionUnit / this.unit : -p.position.y + (position === SeatPosition.BottomMiddle ? 20 : 0),
        scale: landscapeSeat ? 1 : p.scale,
        edge: landscapeSeat?.edge ?? (mine?'bottom':left?'left':p.position.x>0?'right':'top'),
        microphoneSide: (landscapeSeat?landscapeSeat.x*this.landscapePositionUnit/this.unit<this.width/2-1e-6:p.position.x<0)?'left':'right',
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
    if(this.landscape){
      // Nine-seat wide tables also have two opponents on the bottom edge.
      // Reserve the dealer's full height below their nameplates.
      for(const p of result.values()){
        p.x=Math.max(desktop.seatEdgeInset,Math.min(this.width-desktop.seatEdgeInset,p.x));
        p.y=Math.max(desktop.seatEdgeInset,Math.min(p.y,this.height-(p.dealerY+desktop.dealerMarkerHeight)*p.scale-desktop.seatEdgeGap));
      }
    }
    if(!this.landscape&&this.id==='original'){
      for(const [id,p] of result){
        // Original design uses the base avatar size.
        // Original Figma leaves room above the top avatar and below the middle
        // bets. Keep the CC seat arrangement, adjusting within its design unit.
        const slot=(id-(state.mySeat||1)+state.seatCount)%state.seatCount;
        const position=positions[slot];
        const top=[SeatPosition.TopMiddle,SeatPosition.TopMiddleLeft,SeatPosition.TopMiddleRight].includes(position!);
        const topClearance=220*Math.min(1,Math.max(0,(this.height/this.width-1.5)/.66));
        p.y+=(top?topClearance:id===state.mySeat?-40:-60)*this.suggest;
        if(id!==state.mySeat&&!top&&position!==SeatPosition.BottomMiddle){const radius=99.5*p.scale;p.x=p.x<this.width/2?(p.x+radius)/2:this.width-(this.width-p.x+radius)/2;}
        if(id===state.mySeat){
          p.cardScale*=1.1;p.cardsY=-184;
          // Short screens scale the avatar below the independent action buttons.
          p.betX+=this.width*this.unit>=this.viewportHeight*.75?64:32;p.betY-=32;
        }
      }
      if(state.community?.length){
        const content=this.content({dual:!!state.secondCommunity?.length,boardSize:publicCardScale,jackpotHeight:0});
        const boards=state.secondCommunity?.length?[content.board,content.secondBoard]:[content.board];
        const scale=content.board.scale??1;
        const top=Math.min(...boards.map(board=>board.y-88*scale));
        const bottom=Math.max(...boards.map(board=>board.y+88*scale));
        for(const [id,p] of result){
          if(id===state.mySeat)continue;
          const x=p.x+p.betX*p.scale,y=p.y+p.betY*p.scale,half=betHalfHeight*p.scale;
          const [left,right]=betEdges(p);
          if(x+right*p.scale>content.board.x-365*scale&&x+left*p.scale<content.board.x+365*scale&&y+half>top-12&&y-half<bottom+12){
            const above=top-half-12,below=bottom+half+12;
            p.betY=((Math.abs(y-above)<Math.abs(y-below)?above:below)-p.y)/p.scale;
          }
        }
      }
    }
    if(!this.landscape){
      const bottomSeat=result.get(state.mySeat||1);
      // The spectator's bottom seat also shows the nickname above the balance.
      const popupBottom=state.mySeat?170:198;
      if(bottomSeat)bottomSeat.y=Math.min(bottomSeat.y,(this.viewportBottom-2)/this.unit-popupBottom*bottomSeat.scale);
      if(bottomSeat&&state.mySeat&&this.id==='original'){
        const room=(this.viewportBottom-2)/this.unit-bottomSeat.y-152.5*bottomSeat.scale;
        this.lowerHeroAvatar(bottomSeat,Math.max(0,Math.min(32*bottomSeat.scale,room)),0);
      }
    }
    return result;
  }

  protected lowerHeroAvatar(seat:SeatPlacement,drop:number,handLift=0):void {
    seat.controlsY=seat.y;
    seat.y+=drop;
    seat.cardsY-=drop/seat.scale+handLift;
    seat.betY-=drop/seat.scale;
    seat.dealerY-=drop/seat.scale;
  }

  content({dual, boardSize, jackpotHeight, textSize=1}: LayoutContentOptions): LayoutContent {
    const l=this;
    const wideScale=Math.min(1,l.width*l.unit/this.landscapePositionUnit/1900)*(dual?.85:1);
    const scale=l.landscape ? (dual?.85:1)*desktop.publicCardWidth/desktop.publicCardDesignWidth/(desktop.avatarSize/desktop.avatarDesignSize) : l.suggest*(dual?.85:1)*(this.id==='original'?1.4:1);
    const gap=l.landscape?Math.max((176*wideScale*boardSize+24)*this.landscapePositionUnit/l.unit,176*scale*boardSize+24):176*scale*boardSize+24;
    const center=l.landscape ? l.height*(dual?.48:.54) : dual ? l.height*.45 : l.height/2;
    // The original Figma places the middle group below the top player's
    // nameplate. Keep that space even when Jackpot is disabled.
    const originalMiddle=!l.landscape;
    const infoFont=l.height/l.width<1.5?28:38;
    const infoClearance=infoFont*2.2+12;
    const baseWideTotalY=l.height*(dual?.23:.385);
    const wideGap=desktop.middleGap/l.unit;
    // The total's normal line box is taller for CJK than for Latin labels.
    const totalHalfHeight=parseFloat(potConfig.layout.css['mx-pot-font-size'])*desktop.totalLineHeight*textSize/2;
    const infoHalfHeight=desktop.roomInfoFontSize*parseFloat(roomInfoConfig.layout.css['line-height'])*3*textSize/2;
    const featureHeight=jackpotHeight*l.suggest;
    const wideShift=l.landscape?Math.max(0,infoHalfHeight*2+featureHeight+totalHalfHeight+wideGap*(jackpotHeight?3:2)-baseWideTotalY):0;
    const wideTotalY=baseWideTotalY+wideShift;
    const featureBottom=wideTotalY-totalHalfHeight-wideGap;
    const featureTop=featureBottom-featureHeight;
    return {
      board:{x:l.width/2,y:center+wideShift-(dual?gap/2:0),scale:scale*boardSize},
      secondBoard:{x:l.width/2,y:center+wideShift+gap/2,scale:scale*boardSize},
      total:l.landscape?{x:l.width/2,y:wideTotalY}:{x:l.width/2,y:originalMiddle?l.height*.301:(697.8+jackpotHeight)*l.suggest},
      pool:l.landscape?{x:l.width/2,y:l.height*(dual?.29:.44)+wideShift}:{x:l.width/2,y:originalMiddle?l.height*.339:(775.6+jackpotHeight)*l.suggest},
      info:l.landscape?{x:l.width/2,y:featureTop-(jackpotHeight?wideGap:0)-infoHalfHeight}:{x:l.width/2,y:dual?center+gap/2+88*scale*boardSize+infoClearance:Math.min(l.height*.426,center-88*scale*boardSize-infoClearance)},
      styles:{'--mx-room-info-width':`${this.roomInfoWidth}px`,...(l.landscape?{'--mx-pc-menu-size':`${desktop.menuButtonSize/l.unit}px`,'--mx-pc-menu-left':`${desktop.menuLeft/l.unit}px`,'--mx-pc-menu-top':`${desktop.menuTop/l.unit}px`,'--mx-jackpot-y':`${featureTop+jackpotConfig.layout.buttonHalfHeight*l.suggest}px`,'--mx-calltime-y':`${featureBottom-jackpotConfig.layout.progressOffset*l.suggest}px`}:{}),...(originalMiddle?{'--mx-jackpot-y':`${l.height*.272}px`,'--mx-jackpot-scale':String(Math.min(l.suggest,l.height/3115)),'--mx-calltime-y':`${l.height*.367}px`,'--mx-original-info-font':`${infoFont}px`}:{})},
    };
  }
  protected handButtonOutset(state:TableSnapshot,own:SeatPlacement):number {
    const count=Math.max(handCardCount(state.gameType??0),state.players.find(player=>player.seat===state.mySeat)?.cards.length??0);
    const spread=own.handSpread??handCardsConfig.layout.faceStripWidth;
    // Keep the two-card clearance as the overlapping strip grows for Omaha.
    // Room rules reserve the same space before the cards arrive.
    return spread*(.5-1/count)*own.cardScale*own.scale*this.unit/2;
  }
  controls(state: TableSnapshot, buttonSize: number): LayoutControls {
    if(this.landscape)return {scale:.24*buttonSize,styles:{}};
    const own=this.positions(state).get(state.mySeat);
    if(!own)return {styles:{}};
    const controlsY=own.controlsY??own.y;
    const top=(controlsY-164*own.scale)*this.unit-28;
    // Original buttons use a 137px face on a 1242px-wide design, independent of avatar scaling.
    const scale=this.id==='original'?137/137*(this.width*this.unit/1242)*buttonSize:own.scale*this.unit*buttonSize;
    let sideOffset=78*this.width*this.unit/440;
    if(this.id==='original')sideOffset+=this.handButtonOutset(state,own);
    const raiseStyles:Record<string,string>={};
    if(this.id==='original'){
      // Reserve the amount bubble above the track when confirmation stays on the raise entry.
      const bubbleAboveTrack=(502.108-833/2)*scale;
      const trackBottom=top+28-(200+137*.85)*scale;
      const trackHeight=Math.min(833*scale,Math.max(1,trackBottom-bubbleAboveTrack-154*scale/2-8));
      raiseStyles['--mx-original-raise-height']=`${trackHeight}px`;
      raiseStyles['--mx-original-raise-info-offset']=`${trackHeight/2+bubbleAboveTrack}px`;
    }
    return {scale,styles:{
      ...raiseStyles,
      top:`${top}px`, '--mx-operation-row-y':`${top}px`,
      '--mx-op-fold-x':`${-sideOffset}px`,'--mx-op-main-x':`${sideOffset}px`,
      '--mx-quick-5-0-x':`${-325*scale}px`,'--mx-quick-5-4-x':`${325*scale}px`,
      '--mx-quick-5-2-y':`${380*scale}px`,
      '--mx-raise-center-y':`${(controlsY-910*own.scale)*this.unit}px`,
    }};
  }
}
