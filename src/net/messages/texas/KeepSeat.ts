import type { ServerMessageKeepSeat } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function KeepSeat(body: ServerMessageKeepSeat.AsObject, context: MessageContext): boolean {
  const player = context.player(body.seatId);
  player.keepSeatDeadline = body.keep && body.leftTime > 0 ? body.deadline : 0;
  player.keepSeatLeftTime = body.keep ? body.leftTime : 0;
  player.keepSeatReason = body.keep ? body.keepSeatReason : context.pb.Def.KeepSeatReason.KSR_NONE;
  return true;
}
