import type { ServerMessageHandClear } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function HandClear(_body: ServerMessageHandClear.AsObject, context: MessageContext): boolean {
  context.clearHand();
  context.data.watch.clear();
  context.state.gameStatus = context.pb.Def.GameStatus.HAND_END;
  return true;
}
