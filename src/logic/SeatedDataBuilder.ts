import type { ClientMessageSeated, RoomInfo } from '@silenthill/agreement-web';
import type { RoomTarget } from '../core/types.js';
import type { BuyInQuote, BuyInSelection } from '../core/Seating.js';
export class SeatedDataBuilder {
  build(target: RoomTarget, info: RoomInfo.AsObject, quote: BuyInQuote, selection: BuyInSelection): ClientMessageSeated.AsObject {
    const seatedData: ClientMessageSeated.AsObject = {
      room:{roomId:target.roomID,matchId:target.matchID}, seatId:quote.seat, bringIn:0,
      autoOnTable:0, autoUseWallet:false, returnOrNew:quote.returnOrNew,
      store:0, clubId:0, applyBringIn:false, autoOnTableNoStore:false,
      autoOnTableFix:0, depositAdvance:0, autoOnTableMax:0,
    };
    // CC initializes automatic retention for both direct returns and new buy-ins.
    if(info.retainType === 1) {
      seatedData.autoOnTable = info.limitRetainMinRate * info.smallBlind * 2;
      seatedData.autoOnTableFix = info.limitRetainMinRate * info.smallBlind * 2;
      seatedData.autoOnTableMax = info.limitRetainMaxRate * info.smallBlind * 2;
    }
    seatedData.bringIn = selection.amount;
    seatedData.clubId = selection.clubID;
    if(selection.autoAmount > 0) {
      seatedData.autoOnTableNoStore = true;
      seatedData.autoUseWallet = true;
      seatedData.autoOnTable = selection.autoAmount;
    } else if(info.retainType === 2) {
      // CC BringInProviderTexas.commit: manual retained chips.
      const store = selection.amount - (quote.autoReturn ? info.deposit : 0) - info.limitRetainMinRate * info.smallBlind * 2;
      seatedData.store = quote.autoReturn ? Math.max(0, store) : store;
    }
    return seatedData;
  }
}
