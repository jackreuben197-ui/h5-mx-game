import type { ServerMessageBuyInsuranceActive } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function BuyInsuranceActive(body:ServerMessageBuyInsuranceActive.AsObject,context:MessageContext):boolean {
 if(body.status!==0){context.data.insurance.finish(body.status);context.state.operatorList=context.state.operatorList.filter(op=>op.seatId!==context.state.myInfo?.seatId||!op.isInsurance);}return body.status!==0;
}
