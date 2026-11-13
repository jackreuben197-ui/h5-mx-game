import type { ServerMessageHandClear } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function HandClear(_body: ServerMessageHandClear.AsObject, context: MessageContext): boolean {
  context.data.secondPcs.finish();
  context.data.insurance.clear();
  context.clearHand();
  context.data.watch.clear();
  context.state.gameStatus = context.pb.Def.GameStatus.HAND_END;
  context.data.mtt?.handleHandClear(!!context.state.myInfo?.seatId && context.state.playersList.filter(p=>p.seatId!==context.state.myInfo?.seatId).length===0);
  return true;
}
