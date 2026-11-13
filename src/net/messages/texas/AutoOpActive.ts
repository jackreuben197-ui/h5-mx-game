import type { ServerMessageAutoOpActive } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function AutoOpActive(body: ServerMessageAutoOpActive.AsObject, context: MessageContext): boolean {
  context.data.mtt?.autoOpResult(body.status); return !!context.data.mtt;
}
