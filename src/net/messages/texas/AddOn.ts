import type { ServerMessageAddOn } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function AddOn(body: ServerMessageAddOn.AsObject, context: MessageContext): boolean {
  context.data.mtt?.completeAddOn(body.status,body.chips); return !!context.data.mtt;
}
