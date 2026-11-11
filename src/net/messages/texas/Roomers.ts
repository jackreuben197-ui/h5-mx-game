import type { ServerMessageRoomers } from '@silenthill/agreement-web';
import type { MessageContext } from '../MessageContext.js';
export function Roomers(body: ServerMessageRoomers.AsObject, context: MessageContext): boolean {
  context.data.report.roomersLoading = false;
  if (body.status === 0) context.data.report.applyRoomers(body);
  return false; // Panel data has its own instance events; no table redraw.
}
