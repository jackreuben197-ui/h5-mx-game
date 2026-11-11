import type { ServerMessageStoreChips } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function StoreChips(body: ServerMessageStoreChips.AsObject, context: MessageContext): boolean {
  if(body.status!==0)return false;
  const seat=context.state.myInfo?.seatId;if(seat)context.player(seat).chip=body.chips;
  return true;
}
