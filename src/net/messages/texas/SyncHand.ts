import type { ServerMessageSyncHand } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function SyncHand(body: ServerMessageSyncHand.AsObject, context: MessageContext): boolean {
  context.data.mtt?.setBubbleWaiting(true); return !!context.data.mtt;
}
