import type { ServerMessageAgreeSecondPcsTrigged } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function AgreeSecondPcsTrigged(body:ServerMessageAgreeSecondPcsTrigged.AsObject,context:MessageContext):boolean {
 const mine=context.state.myInfo?.seatId;const operator=body.operatorList.find(op=>op.seatId===mine&&op.isAgreeSecondPc);if(!operator)return false;
 context.state.operatorList=body.operatorList;
 context.data.secondPcs.start(body.operatorList.filter(op=>op.isAgreeSecondPc).map(op=>op.seatId),operator.opDeadline>0?operator.opDeadline:Date.now()/1000+operator.leftOpTime);return true;
}
