import { MxGameClient, type MxMountOptions } from './MxGameClient.js';
import type { RoomHost } from '../core/types.js';
import type { HostTransport } from './HostTransport.js';
export type { HostMessage, HostTransport } from './HostTransport.js';
export type { MxMountOptions } from './MxGameClient.js';
/** No custom host is required for CC-protocol entry. The factory form remains for demos. */
export function mountMxGame(
  container: HTMLElement,
  optionsOrFactory: MxMountOptions | ((transport: HostTransport) => RoomHost) = {},
): MxGameClient {
  return typeof optionsOrFactory === 'function'
    ? new MxGameClient(container, {}, optionsOrFactory)
    : new MxGameClient(container, optionsOrFactory);
}
