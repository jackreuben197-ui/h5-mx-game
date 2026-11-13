import type { ServerMessageAgreeSecondPcs } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function AgreeSecondPcs(body:ServerMessageAgreeSecondPcs.AsObject,context:MessageContext):boolean {
 context.data.secondPcs.vote(body.seatId,body.result);return false;
}
