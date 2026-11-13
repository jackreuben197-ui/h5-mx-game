import type { ServerMessageStandup } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function Standup(body: ServerMessageStandup.AsObject, context: MessageContext): boolean {
  const player = context.state.playersList.find(p => p.seatId === body.seatId);
  if (player?.userRid) context.data.report.applyStandUp(player.userRid, body.bringOut || 0, player.name, player.avatar);
  context.state.playersList = context.state.playersList.filter((p) => p.seatId !== body.seatId);
  context.state.operatorList = context.state.operatorList.filter((p) => p.seatId !== body.seatId);
  if (context.state.myInfo?.seatId === body.seatId) {
    Object.assign(context.state.myInfo,{seatId:0,callTimeCount:0,callTimeStay:false});
    context.data.callTime.clear();
  }
  return true;
}
