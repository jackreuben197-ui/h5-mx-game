import type { ServerMessageShowcards } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function Showcards(body: ServerMessageShowcards.AsObject, context: MessageContext): boolean {
  if (import.meta.env?.DEV) console.info('[MX Showcards 1101 apply]', {
    isAll: body.isAll,
    seats: body.playerCardsList.map(p => ({
      seatId: p.seatId, cardCount: p.cardsList.length,
      found: context.state.playersList.some(player => player.seatId === p.seatId),
      skipMine: p.seatId === context.state.myInfo?.seatId && !body.isAll,
    })),
  });
  for (const p of body.playerCardsList) {
    if (p.seatId === context.state.myInfo?.seatId && !body.isAll) continue;
    // CC addresses stable seat slots; a player may have stood up before this broadcast.
    const player = context.state.playersList.find(player => player.seatId === p.seatId);
    if (player) player.cardsList = [...p.cardsList];
  }
  context.allInWinPercent(body.allinUsersList);
  return true;
}
