import type { ServerMessageShowcards } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function Showcards(body: ServerMessageShowcards.AsObject, context: MessageContext): boolean {
  for (const p of body.playerCardsList) {
    if (p.seatId === context.state.myInfo?.seatId && !body.isAll) continue;
    context.player(p.seatId).cardsList = [...p.cardsList];
  }
  return true;
}
