import bet from '../components/SeatBetView/config.json' with {type:'json'};
import identity from '../components/SeatIdentityView/config.json' with {type:'json'};
import countdown from '../components/SeatCountdownView/config.json' with {type:'json'};
import type { SeatPlacement } from '../../../../ui/TableLayout.js';

const n=(value:string)=>Number.parseFloat(value);
const info=identity.layout.css;
export const betHalfHeight=Math.max(n(bet.layout.css['mx-seat-bet-height']),n(bet.layout.css['mx-seat-bet-chip-height']))/2;
const chipHalf=n(bet.layout.css['mx-seat-bet-chip-width'])/2;
const frameWidth=n(bet.layout.css['mx-seat-bet-width']);
const avatarEdge=n(info['mx-fold-cover-width'])/2+Math.abs(n(countdown.layout.css['mx-seat-timer-inset-3']));
export const betGap=(scale:number,unit:number)=>bet.layout.avatarGap/(scale*unit);
export const sideBetAnchor=(scale:number,unit:number)=>avatarEdge+chipHalf+betGap(scale,unit);
export function betEdges(p:SeatPlacement):[number,number] {
  if(p.betAnchor==='left')return[-chipHalf,frameWidth];
  if(p.betAnchor==='right')return[-frameWidth,chipHalf];
  return p.betIconX>100?[-frameWidth/2,frameWidth/2+chipHalf]:[-frameWidth/2-chipHalf,frameWidth/2];
}
export function profileBalanceBottom(id:string,local:number):number {
  const top=n(id==='classic'?info['classic-chip-top']:id==='oval'?info['oval-chip-top']:info['qa-chip-top'])*local;
  const height=id==='classic'?Math.max(n(info['mx-player-info-min-height-2'])*local,n(info['mx-stack-line-height-2'])*local+2):Math.max(n(info['mx-player-info-min-height']),14*local+2);
  return top+height;
}
export const legacyBalanceBottom=n(info['mx-player-info-top'])+Math.max(n(info['mx-player-info-min-height-3']),2*n(info['mx-player-info-padding-5'])+n(info['mx-player-line-height'])+1.1*(n(info['mx-player-name-line-height-3'])+n(info['mx-stack-line-height-3'])));
