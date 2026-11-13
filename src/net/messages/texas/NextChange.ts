import type { ServerMessageNextChange } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function NextChange(body:ServerMessageNextChange.AsObject,context:MessageContext):boolean{
 if(body.squidTotalLimit>0)context.data.squid.totalLimit=body.squidTotalLimit;
 if(!body.squidOpen)context.data.squid.showJoin=false;
 return true;
}
