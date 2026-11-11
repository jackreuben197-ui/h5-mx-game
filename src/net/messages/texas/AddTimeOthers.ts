import type { ServerMessageAddTimeOthers } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
import { Operator, updateOperatorAfterAddTime } from '../../../logic/Operator.js';
export function AddTimeOthers(body: ServerMessageAddTimeOthers.AsObject, context: MessageContext): boolean {
  const operator = context.state.operatorList.find((o) => o.seatId === body.seatId);
  if (!operator) return false;
  const timed = operator as typeof operator & { totalOpDuration?: number };
  const previous = new Operator();
  previous.deadlineTImestamp = operator.opDeadline;
  previous.leftOpDuration = operator.leftOpTime;
  previous.totalOpDuration = timed.totalOpDuration ?? context.state.roomInfo?.opDuration ?? 0;
  const next = updateOperatorAfterAddTime(previous, body);
  operator.delayTimes = next.alreadyDelayTImes;
  operator.opDeadline = next.deadlineTImestamp;
  operator.leftOpTime = next.leftOpDuration;
  timed.totalOpDuration = next.totalOpDuration;
  return true;
}
