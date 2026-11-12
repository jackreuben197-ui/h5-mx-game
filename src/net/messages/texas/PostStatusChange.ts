import type { ServerMessagePostStatusChange } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function PostStatusChange(body: ServerMessagePostStatusChange.AsObject, context: MessageContext): boolean {
  for(const change of body.changesList)context.player(change.seatId).status=change.currentPostStatus;
  return body.changesList.length>0;
}
