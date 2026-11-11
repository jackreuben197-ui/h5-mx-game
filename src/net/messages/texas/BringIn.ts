import type { ServerMessageBringIn } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function BringIn(body: ServerMessageBringIn.AsObject, context: MessageContext): boolean {
  if(body.status!==0)return false;
  if(context.state.myInfo)context.state.myInfo.totalChips=body.totalChips;
  return true;
}
