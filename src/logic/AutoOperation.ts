import type { Action, Player, TableSnapshot } from '../core/types.js';
export type AutoChoice='fold'|'check'|'call'|'allin';
/** CC TexasGameRoomDataPlayerMine.caculateValidAutoOperationType. */
export function validAutoRight(roundBet:number,player:Player):{choice:Exclude<AutoChoice,'fold'>;amount:number}{
  const due=Math.max(0,roundBet-(player.roundBet??0));
  if(roundBet===0||(!player.roundActioned&&due===0))return {choice:'check',amount:0};
  if(player.chips>due)return {choice:'call',amount:due};
  return {choice:'allin',amount:player.chips};
}
export function resolveAutoChoice(choice:AutoChoice,table:TableSnapshot):{action:Action;amount?:number}|undefined{
  const action=choice==='fold'&&table.actions.includes('check')?'check':choice;
  if(!table.actions.includes(action))return;
  return {action,amount:action==='allin'?table.betting?.allIn:undefined};
}
