import type { ServerMessageStartInfo } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function StartInfo(body: ServerMessageStartInfo.AsObject, context: MessageContext): boolean {
  if (!body.handInfo) throw new Error('开局消息缺少 handInfo');
  if (body.handInfo.handNum <= (context.state.handInfo?.handNum ?? -1)) return false;
  context.clearHand();
  context.data.watch.clear();
  context.state.gameStatus = context.pb.Def.GameStatus.HAND_PREFLOP;
  context.state.handInfo = body.handInfo;
  for (const item of body.playersList) {
    const player = context.player(item.seatId);
    Object.assign(player, item);
    // CC StartInfo promotes dealt players even when the server omits a status update.
    if (body.handInfo.dealOrderList.includes(item.seatId))
      player.status = context.pb.Def.CanPlayStatus.NORMAL;
    player.roundActioned = false;
    if (body.handInfo.dealOrderList.includes(item.seatId) && !player.cardsList.length)
      player.cardsList = [0, 0];
  }
  context.operators(body.nextOperator);
  context.presentation = 'deal';
  context.data.report.applyStartInfo();
  return true;
}
