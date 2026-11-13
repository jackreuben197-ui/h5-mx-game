import type { ServerMessageInsuranceOutsCards } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function InsuranceOutsCards(body:ServerMessageInsuranceOutsCards.AsObject,context:MessageContext):boolean {
 return false; // CC reserves this message; outs come from InsuranceTrigged.
}
