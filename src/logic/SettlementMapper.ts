import type { Result } from '@silenthill/agreement-web';
import type { Settlement } from '../core/Settlement.js';
/** CC net/messages/texas/Winner.ts: preserve winner selection and winCardsList branches. */
export class SettlementMapper {
  map(handNum: number, results: Result.AsObject[], mySeat: number, occupied: Set<number>): Settlement {
    const state: Settlement = {handNum, seats:{}, community:{}};
    let maxHv = 0;
    let maxResult: Result.AsObject | undefined;
    for (const result of results) {
      if (!occupied.has(result.seatId) || result.standUp) continue;
      const seat = state.seats[result.seatId] = {cards:{}} as Settlement['seats'][number];
      if (result.win - result.handBet > 0) {
        const collectedChips = result.win + result.insuranceWin - result.insurance - result.handBet - result.fee;
        seat.win = {handValueType:result.handValueType,collectedChips};
        if (result.handValueType > maxHv) {maxHv=result.handValueType;maxResult=result;}
      }
      if (result.seatId === mySeat) {
        const pubH: number[] = [], myCardsH: number[] = [];
        result.winCardsList.forEach(v => {if(v.isPublic) pubH.push(v.card);else myCardsH.push(v.card);});
        seat.cards.highlight = myCardsH;
        state.community.highlight = pubH;
      }
    }
    if (maxResult) {
      const pubH: number[] = [], myCardsH: number[] = [];
      maxResult.winCardsList.forEach(v => {if(v.isPublic) pubH.push(v.card);else myCardsH.push(v.card);});
      state.seats[maxResult.seatId]!.cards.popup = myCardsH;
      state.community.popup = pubH;
      results.forEach(result => {
        if (!occupied.has(result.seatId) || result.standUp) return;
        if (result.handValueType > 0 && maxResult!.seatId !== result.seatId) state.seats[result.seatId]!.cards.popup = [];
      });
    }
    return state;
  }
}
