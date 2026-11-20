import desktop from './desktop.json' with {type:'json'};
import {desktopScale,landscapeLayout} from './landscape-layout.js';
import {sideBetAnchor} from './seat-bet-layout.js';
import {handCardCount} from '../../../../logic/HandCardCount.js';
import type {TableSnapshot} from '../../../../core/types.js';
import type {LayoutContent,LayoutContentOptions,LayoutControls,SeatPlacement,TableLayout} from '../../../../ui/TableLayout.js';

const baseUnit=desktop.avatarSize/desktop.avatarDesignSize;
const heroCardScale=desktop.heroCardWidth/120/baseUnit;
const heroSpread=2*desktop.heroCardPitch/(desktop.heroCardWidth/120);
type Viewport=Pick<TableLayout,'width'|'height'|'unit'>;
const frame=(layout:Viewport)=>({width:layout.width*layout.unit,height:layout.height*layout.unit});

export function desktopPositions(layout:Viewport,state:TableSnapshot):Map<number,SeatPlacement> {
 const {width,height}=frame(layout),points=landscapeLayout(width,height,state.seatCount);
 const result=new Map<number,SeatPlacement>();
 for(let id=1;id<=state.seatCount;id++){
  const slot=(id-(state.mySeat||1)+state.seatCount)%state.seatCount,point=points[slot]!;
  const mine=id===state.mySeat,player=state.players.find(player=>player.seat===id);
  const face=mine||!!player?.cards.some(card=>card>0),left=point.edge==='left';
  const count=Math.max(2,player?.cards.length??2);
  const backWidth=(65+(count-1)*desktop.backHandSpread/count)*desktop.backCardWidth/65;
  const betAnchor=mine||point.edge==='top'||point.edge==='bottom'?'center':left?'left':'right';
  result.set(id,{
   x:point.x/layout.unit,y:point.y/layout.unit,scale:1,edge:point.edge,
   microphoneSide:point.x<width/2?'left':'right',
   cardsX:face?(mine?(desktop.heroHand[0]!-desktop.hero[0]!)/baseUnit:0)
    :(left?desktop.avatarSize/2+desktop.backHandGap+backWidth:-desktop.avatarSize/2-desktop.backHandGap)/baseUnit,
   cardsY:(face?(mine?desktop.heroHand[1]!-desktop.hero[1]!:0):desktop.backHandY+43.5*desktop.backCardWidth/65)/baseUnit,
   cardScale:face?(mine?heroCardScale:Math.min(desktop.opponentCardWidth/120,desktop.avatarSize/(120+270*(1-1/count)))/baseUnit):desktop.backCardWidth/65/baseUnit,
   handSpread:mine?heroSpread:270,backHandSpread:desktop.backHandSpread,
   betAnchor,betIconX:left||betAnchor==='center'?-25:133,
   betX:mine?175:betAnchor==='center'?0:(left?1:-1)*sideBetAnchor(1,layout.unit),
   betY:mine?-360:(point.edge==='top'?desktop.topBetY:point.edge==='bottom'?-80:desktop.sideBetY)/baseUnit,
   dealerX:mine?desktop.heroDealer[0]!/baseUnit:0,
   dealerY:(mine?desktop.heroDealer[1]!:desktop.otherDealerY)/baseUnit,
  });
 }
 return result;
}

export function desktopContent(layout:Viewport,{dual,boardSize,jackpotHeight,textSize=1}:LayoutContentOptions):LayoutContent {
 const {width,height}=frame(layout),scale=desktopScale(width,height);
 const x=desktop.board[0]!/desktop.designWidth*width;
 let y=desktop.board[1]!/desktop.designHeight*height;
 const potY=desktop.pot[1]!/desktop.designHeight*height;
 const heroY=desktop.hero[1]!/desktop.designHeight*height;
 const quickTop=heroY+(desktop.quickCenters[2]![1]!-desktop.hero[1]!)*scale-desktop.quickButtonSize*1.1*scale/2;
 const infoTop=potY+60*baseUnit*scale*textSize*.75+8*scale;
 // Both board rows must fit between the total and the quick-bet arc, including
 // the largest independent card/text/button preferences.
 const dualScale=dual?Math.min(.85,(quickTop-8*scale-infoTop-12*scale)/(2*desktop.publicCardHeight*boardSize*scale)):1;
 const cardScale=desktop.publicCardWidth/120/baseUnit*boardSize*dualScale;
 const gap=(desktop.publicCardHeight*boardSize*dualScale+12)*scale;
 const halfCard=desktop.publicCardHeight*boardSize*dualScale*scale/2;
 if(dual){
  y=Math.min(y,quickTop-8*scale-gap/2-halfCard);
 }
 const poolY=desktop.pool[1]!/desktop.designHeight*height;
 const boardTop=y-(dual?gap/2:0)-halfCard;
 const infoHalf=38*baseUnit*scale*1.15*3*textSize/2;
 // Keep the original pot/board slots. Live room text uses their empty interval.
 const infoHeight=Math.min(infoHalf*2,Math.max(0,boardTop-infoTop-8*scale));
 const infoY=dual?y:boardTop-8*scale-infoHeight/2;
 const infoX=dual?x+(334.4*boardSize*dualScale/2+360*baseUnit/2+12)*scale:x;
 const combined=jackpotHeight>77;
 const featureHeight=(combined?77:jackpotHeight)*baseUnit*scale;
 const featureBottom=poolY-74*baseUnit*scale/2-2*scale;
 const featureTop=featureBottom-featureHeight;
 return {
  board:{x:x/layout.unit,y:(y-(dual?gap/2:0))/layout.unit,scale:cardScale},
  secondBoard:{x:x/layout.unit,y:(y+gap/2)/layout.unit,scale:cardScale},
  total:{x:desktop.pot[0]!/desktop.designWidth*width/layout.unit,y:potY/layout.unit},
  pool:{x:x/layout.unit,y:(poolY+74*layout.unit/2)/layout.unit},info:{x:infoX/layout.unit,y:infoY/layout.unit},
  styles:{
   '--mx-room-info-width':'360px','--mx-room-info-max-font':`${dual?38*textSize:Math.max(12,infoHeight/(3*1.15)/layout.unit)}px`,
   '--mx-pc-menu-size':`${desktop.menuButtonSize/baseUnit}px`,
   '--mx-pc-menu-left':`${desktop.menuLeft/baseUnit}px`,'--mx-pc-menu-top':`${desktop.menuTop/baseUnit}px`,
   '--mx-pc-card-pitch':`${(desktop.publicCardWidth+desktop.publicCardGap)/desktop.publicCardWidth*120}px`,
   '--mx-pc-dealer-width':`${desktop.dealerSize[0]!/baseUnit}px`,'--mx-pc-dealer-height':`${desktop.dealerSize[1]!/baseUnit}px`,
   '--mx-pc-menu-top-y':`${(height-desktop.navigationHeight*scale)/layout.unit}px`,
   '--mx-pc-menu-clearance':`${8/baseUnit}px`,
   '--mx-jackpot-y':`${(featureTop+38.5*layout.unit)/layout.unit}px`,
   '--mx-calltime-y':`${(featureBottom-35*layout.unit)/layout.unit}px`,
   '--mx-pc-jackpot-x':`${x/layout.unit}px`,
   '--mx-pc-calltime-x':`${(combined?x-295*layout.unit/2-12*scale:x)/layout.unit}px`,
   '--mx-pc-calltime-translate':combined?'-100%':'-50%',
  },
 };
}

export function desktopControls(layout:Viewport,state:TableSnapshot,buttonSize:number):LayoutControls {
 const {width,height}=frame(layout),scale=desktopScale(width,height),buttons=scale*buttonSize;
 const heroX=desktop.hero[0]!/desktop.designWidth*width,heroY=desktop.hero[1]!/desktop.designHeight*height;
 const x=heroX+(desktop.actionCenter[0]!-desktop.hero[0]!)*scale;
 const y=heroY+(desktop.actionCenter[1]!-desktop.hero[1]!)*scale;
 const count=Math.max(2,handCardCount(state.gameType??0),state.players.find(player=>player.seat===state.mySeat)?.cards.length??0);
 const outset=heroSpread*(.5-1/count)*desktop.heroCardWidth/120*scale/2;
 const styles:Record<string,string>={
  left:'0px',right:'0px',top:'0px',bottom:'0px',height:'100%',
  '--mx-pc-action-x':`${x}px`,'--mx-pc-action-y':`${y}px`,
  '--mx-pc-fold-y':`${(desktop.foldCenter[1]!-desktop.actionCenter[1]!)*scale}px`,
  '--mx-op-fold-x':`${(desktop.foldCenter[0]!-desktop.actionCenter[0]!)*scale-outset}px`,
  '--mx-op-main-x':`${(desktop.callCenter[0]!-desktop.actionCenter[0]!)*scale+outset}px`,
  '--mx-op-upper-y':`${(desktop.actionCenter[1]!-desktop.raiseCenter[1]!)*scale}px`,
  '--mx-op-raise-size':`${desktop.raiseButtonSize*buttons}px`,
  '--mx-op-quick-width':`${desktop.quickButtonSize*buttons}px`,'--mx-op-quick-height':`${desktop.quickButtonSize*buttons}px`,
  '--mx-pc-add-left':`${desktop.addTime[0]!*scale}px`,
  '--mx-pc-add-top':`${desktop.addTime[1]!/desktop.designHeight*height}px`,
  '--mx-op-add-width':`${desktop.addTime[2]!*scale}px`,'--mx-op-add-height':`${desktop.addTime[3]!*scale}px`,
 };
 for(const length of [3,5]){
  const points=length===3?desktop.quickCenters.slice(1,4):desktop.quickCenters;
  points.forEach((point,index)=>{
   styles[`--mx-quick-${length}-${index}-x`]=`${(point[0]!-desktop.actionCenter[0]!)*scale}px`;
   styles[`--mx-quick-${length}-${index}-y`]=`${(desktop.actionCenter[1]!-point[1]!)*scale}px`;
  });
 }
 return {scale:desktop.sideButtonSize/137*buttons,styles};
}
