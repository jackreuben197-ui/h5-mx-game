import type { Action, TableSnapshot } from '../core/types.js';
import type { ShortCut } from '../data/TexasGamePersonalSettings.js';
/** CC BetButtonContainer.caculatePotsBet, adapted to the normalized snapshot. */
export class ShortcutBet {
  static calculate(shortcuts: readonly ShortCut[], state: TableSnapshot): {label:string;amount:number;action:Action}[] {
    const b=state.betting,player=state.players.find(p=>p.seat===state.mySeat);
    if(!b||!player)return [];
    const hasRaise=state.actions.includes('raise'),hasAllIn=state.actions.includes('allin');
    const onlyAllInRaise=!hasRaise&&hasAllIn&&(state.actions.includes('call')||state.actions.includes('check'));
    if(!hasRaise&&!onlyAllInRaise)return [];
    const myCall=b.call,pot=state.pot+myCall,myChip=player.chips;
    const minAmount=onlyAllInRaise?myChip:b.min;
    const maxAmount=onlyAllInRaise?myChip:b.max>0?Math.min(b.max,myChip):myChip;
    if(minAmount>maxAmount)return [];
    return shortcuts.map(v=>{
      const amount=Math.min(maxAmount,Math.max(minAmount,Math.floor(pot*v.percent+myCall)));
      return {label:v.name,amount,action:hasAllIn&&amount===myChip?'allin':'raise'};
    });
  }
}
