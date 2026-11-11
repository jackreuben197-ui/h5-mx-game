import type { ServerMessageSidePots } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function SidePots(body: ServerMessageSidePots.AsObject, context: MessageContext): boolean {
  if (context.state.handInfo) context.state.handInfo.potsList = body.potsList;
  return true;
}
