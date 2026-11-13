import type { ServerMessageAgreeSecondPcsActive } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function AgreeSecondPcsActive(body:ServerMessageAgreeSecondPcsActive.AsObject,context:MessageContext):boolean {
 context.data.secondPcs.requestResult(body.status);return false;
}
