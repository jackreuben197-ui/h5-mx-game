import type { ServerMessageActionAll } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function ActionAll(body: ServerMessageActionAll.AsObject, context: MessageContext): boolean {
  const player = context.player(body.operatorSeatId);
  player.action = body.action;
  player.roundActioned = true;
  player.chip = body.leftChips;
  player.roundBet += body.amount;
  if (context.state.handInfo) {
    context.state.handInfo.allBet = body.allBet;
    context.state.handInfo.roundBet = body.roundBet;
  }
  context.operators(body.nextOperator);
  return true;
}
