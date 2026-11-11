import type { ServerMessageGetMsg } from '@silenthill/agreement-web';
import type { MessageContext } from '../MessageContext.js';
import { handleBroadcastExtra } from './BroadcastMsg.js';
export function GetMsg(data: ServerMessageGetMsg.AsObject, context: MessageContext): false {
    handleBroadcastExtra(data.extra, context);
    return false;
}
