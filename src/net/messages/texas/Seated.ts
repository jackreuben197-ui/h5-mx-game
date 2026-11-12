import type { ServerMessageSeated } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function Seated(body: ServerMessageSeated.AsObject, context: MessageContext): boolean {
  if (body.status !== 0) throw new Error(`坐下失败（${body.status}）`);
  const mine = context.state.myInfo ?? new context.pb.MyGameInfo().toObject();
  mine.seatId = body.recvSeatId;
  mine.chip = body.chips;
  // CC Seated initializes the own-seat amount and clears the previous auto-op.
  mine.totalChips = body.chips;
  mine.isAutoop = false;
  mine.willStandup = false;
  mine.alreadySeated = body.alreadySeated;
  mine.squidRoundSeated = body.squidRoundSeated;
  mine.storeChips = body.storeChips;
  context.state.myInfo = mine;
  const p = new context.pb.Player().toObject();
  Object.assign(p, {
    seatId: body.recvSeatId,
    userRid: context.session.userRID,
    name: context.session.nickname || mine.name,
    avatar: context.session.avatar || mine.avatar,
    chip: body.chips,
    status: body.postStatus,
    deposit: body.deposit,
    keepSeatDeadline: body.keepSeatDeadline,
    keepSeatLeftTime: body.keepSeatLeftTime,
    keepSeatReason: body.keepSeatDeadline>0?context.pb.Def.KeepSeatReason.KSR_TAKE_SEAT:context.pb.Def.KeepSeatReason.KSR_NONE,
    inSquid: body.squidIn,
  });
  context.state.playersList = [
    ...context.state.playersList.filter((p) => p.seatId !== body.recvSeatId),
    p,
  ];
  context.data.report.applySitDown(p.userRid, body.totalBringin || body.chips, body.deposit, p.name, p.avatar, body.recvSeatId);
  return true;
}
