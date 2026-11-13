import type { ServerMessageUpBlind } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function UpBlind(body: ServerMessageUpBlind.AsObject, context: MessageContext): boolean {
  if (!context.data.mtt) return false;
  if (body.mttProgress) context.data.mtt.applyProgress(body.mttProgress);
  if (context.state.roomInfo) { context.state.roomInfo.smallBlind = body.smallBlind; context.state.roomInfo.ante = body.ante; }
  context.state.mttProgress = body.mttProgress;
  return true;
}
