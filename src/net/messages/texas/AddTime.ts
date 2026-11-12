import type { ServerMessageAddTime } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
import { AddTimeOthers } from './AddTimeOthers.js';
export function AddTime(body: ServerMessageAddTime.AsObject, context: MessageContext): boolean {
  if(body.status !== 0 || !context.state.myInfo?.seatId)return false;
  return AddTimeOthers({...body,seatId:context.state.myInfo.seatId},context);
}
