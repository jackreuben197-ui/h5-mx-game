import type { ServerMessageStartInfo } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
import { handCardCount } from '../../../logic/HandCardCount.js';
export function StartInfo(body: ServerMessageStartInfo.AsObject, context: MessageContext): boolean {
  if (!body.handInfo) throw new Error('开局消息缺少 handInfo');
  if (body.handInfo.handNum <= (context.state.handInfo?.handNum ?? -1)) return false;
  context.data.secondPcs.finish();
  context.data.insurance.clear();
  context.clearHand();
  context.data.watch.clear();
  context.state.gameStatus = context.pb.Def.GameStatus.HAND_PREFLOP;
  context.state.handInfo = body.handInfo;
  context.data.mushroom.update(body.handInfo,context.data.record?.mushroomBase??0,true);
  context.data.criticalHit.update(body.handInfo,true);
  for (const item of body.playersList) {
    const player = context.player(item.seatId);
    Object.assign(player, item);
    // CC StartInfo promotes dealt players even when the server omits a status update.
    if (body.handInfo.dealOrderList.includes(item.seatId))
      player.status = context.pb.Def.CanPlayStatus.NORMAL;
    player.roundActioned = false;
    if (body.handInfo.dealOrderList.includes(item.seatId) && !player.cardsList.length)
      player.cardsList = Array(handCardCount(context.data.record?.gameType ?? 0)).fill(0);
  }
  const squid=context.data.squid,mine=context.state.playersList.find(p=>p.seatId===context.state.myInfo?.seatId);
  squid.start(body.handInfo.inSquid);
  if(mine)squid.showJoin=body.handInfo.inSquid&&!mine.keepSeatReason&&!mine.inSquid&&(!body.handInfo.dealOrderList.includes(mine.seatId)||squid.showJoin);
  context.operators(body.nextOperator);
  context.presentation = 'deal';
  context.data.report.applyStartInfo();
  context.data.mtt?.handleHandStart();
  return true;
}
