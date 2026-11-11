import type { ServerMessagePublicReplay } from '@silenthill/agreement-web';
import type { ReplayHandData } from '../../../data/ReplayHandData.js';
import type { MessageContext } from '../MessageContext.js';
export function PublicReplay(body: ServerMessagePublicReplay.AsObject, context: MessageContext): boolean {
  const replay = context.data.replay;
  if (replay.pendingHandNum < 0) return false;
  if (!body.data?.length) { replay.applyEmpty(); return false; }
  try {
    const bytes = typeof body.data === 'string' ? Uint8Array.from(atob(body.data), c => c.charCodeAt(0)) : body.data;
    const data = JSON.parse(new TextDecoder().decode(bytes)) as ReplayHandData;
    if (data.s?.hand !== replay.pendingHandNum) return false;
    replay.applyReplay(data);
  } catch { replay.applyEmpty(); }
  return false;
}
