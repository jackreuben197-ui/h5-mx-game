import { activeUi } from './config/UiConfig.js';
import type { MountOptions } from './MountOptions.js';
import type { GameSurface } from './ui/UiSkin.js';
import type { RoomTarget } from './core/types.js';
/** Stable public facade. All DOM, positioning, styling and assets belong to the selected UI. */
export class GameClient implements GameSurface {
  private readonly surface: GameSurface;
  constructor(container: HTMLElement, options: MountOptions) { this.surface=activeUi.createClient(container,options); }
  get element() { return this.surface.element; }
  get tableData() { return this.surface.tableData; }
  enter(target: RoomTarget) { return this.surface.enter(target); }
  requestSeat(seat:number) { this.surface.requestSeat(seat); }
  leave() { this.surface.leave(); }
  getState() { return this.surface.getState(); }
  attachEffects(...args: Parameters<GameSurface['attachEffects']>) { return this.surface.attachEffects(...args); }
  destroy() { this.surface.destroy(); }
}
