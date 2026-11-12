import type { ServerMessageRoomUserSendDiamond } from '@silenthill/agreement-web';
import type { MessageContext } from '../MessageContext.js';

/** CC RoomUserSendDiamond(132): notify both seats without rebuilding the table. */
export function RoomUserSendDiamond(data: ServerMessageRoomUserSendDiamond.AsObject, context: MessageContext): boolean {
  const senderID = data.senderRid || data.senderId;
  const receiverID = data.recieveRid || data.recieveId;
  if (senderID && receiverID && data.amount > 0)
    context.data.emoji.diamondGiftEvent({senderID,receiverID,amount:data.amount});
  return false;
}
