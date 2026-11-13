import type { ServerMessageRoomInsurance } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function RoomInsurance(body:ServerMessageRoomInsurance.AsObject,context:MessageContext):boolean {
 return false; // CC reserves this message.
}
