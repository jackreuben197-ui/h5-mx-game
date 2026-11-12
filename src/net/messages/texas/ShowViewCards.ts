import type { ServerMessageShowViewCards } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';

/** CC ShowViewCards 1127: paid peek reveals opponents only. */
export function ShowViewCards(body: ServerMessageShowViewCards.AsObject, context: MessageContext): boolean {
  for (const card of body.playerCardsList ?? []) {
    if (!card.seatId || card.seatId === context.state.myInfo?.seatId) continue;
    const player = context.state.playersList.find(p => p.seatId === card.seatId);
    if (!player?.userRid) continue;
    player.cardsList = [...card.cardsList];
  }
  return true;
}
