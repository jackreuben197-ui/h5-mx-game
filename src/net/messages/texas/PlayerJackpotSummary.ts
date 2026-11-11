import type { ServerMessagePlayerJackpotSummary } from '@silenthill/agreement-web';
import type { MessageContext } from '../MessageContext.js';
export function PlayerJackpotSummary(body: ServerMessagePlayerJackpotSummary.AsObject, context: MessageContext): boolean {
  context.data.report.applyJackpotSummary(body);
  return false; // Panel data has its own instance events; no table redraw.
}
