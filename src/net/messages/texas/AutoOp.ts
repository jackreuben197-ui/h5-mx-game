import type { ServerMessageAutoOp } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function AutoOp(body: ServerMessageAutoOp.AsObject, context: MessageContext): boolean {
  context.player(body.seatId).isAutoop = body.enable;
  return true;
}
