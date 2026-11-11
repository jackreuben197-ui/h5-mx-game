import { GameClient } from './GameClient.js';
import type { MountOptions } from './MountOptions.js';
export { GameClient } from './GameClient.js';
export type { MountOptions } from './MountOptions.js';
export type * from './core/types.js';
export function mountGame(container: HTMLElement, options: MountOptions): GameClient {
  return new GameClient(container, options);
}
