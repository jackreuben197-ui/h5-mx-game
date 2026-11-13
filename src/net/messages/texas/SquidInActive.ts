import type { ServerMessageSquidInActive } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function SquidInActive(body:ServerMessageSquidInActive.AsObject,context:MessageContext):boolean{
 return false;
}
