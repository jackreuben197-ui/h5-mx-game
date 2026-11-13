import type { ServerMessageSeatedOthers } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function SeatedOthers(body: ServerMessageSeatedOthers.AsObject, context: MessageContext): boolean {
  const p = new context.pb.Player().toObject();
  Object.assign(p, body, { chip: body.chips, inSquid:body.squidIn, cardsList: [], action: context.pb.Def.Action.NONE });
  context.state.playersList = [
    ...context.state.playersList.filter((p) => p.seatId !== body.seatId),
    p,
  ];
  context.data.report.applySitDown(p.userRid, body.totalBringin || body.chips, body.deposit, p.name, p.avatar, body.seatId);
  return true;
}
