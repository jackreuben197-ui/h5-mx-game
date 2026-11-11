import type { ServerMessageWinner } from '@silenthill/agreement-web';
import { SettlementMapper } from '../../../logic/SettlementMapper.js';
import { MessageContext } from '../MessageContext.js';
export function Winner(body: ServerMessageWinner.AsObject, context: MessageContext): boolean {
  if (body.handNum !== context.state.handInfo?.handNum) return false;
  context.state.gameStatus = context.pb.Def.GameStatus.HAND_END;
  context.state.operatorList = [];
  for (const result of body.resultsList) {
    const player = context.state.playersList.find((p) => p.seatId === result.seatId);
    if (!player || result.standUp) continue;
    player.action = context.pb.Def.Action.NONE;
    player.chip = result.chip;
    player.deposit = result.deposit;
    player.cardsList = [...result.myCardsList];
  }
  context.state.settlement = new SettlementMapper().map(body.handNum, body.resultsList,
    context.state.myInfo?.seatId ?? 0, new Set(context.state.playersList.map(p => p.seatId)));
  context.data.report.applyWinnerResult(body, context.pb.Def.EHCType.EHC_MUSHROOM);
  return true;
}
