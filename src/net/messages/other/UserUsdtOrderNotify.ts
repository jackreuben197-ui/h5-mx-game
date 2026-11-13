import type { ServerMessageUserUsdtOrderNotify } from '@silenthill/agreement-web';
import type { DiamondPurchaseService } from '../../../logic/DiamondPurchaseService.js';
/** Global 145: use the existing H5 bridge packet; it is not scoped to a poker room. */
export function UserUsdtOrderNotify(data:ServerMessageUserUsdtOrderNotify.AsObject,service:DiamondPurchaseService):boolean {
  return service.notifyOrder({orderNo:data.orderNo.trim(),status:data.status});
}
