import type { MountOptions } from '../MountOptions.js';
import type { TableData } from '../data/TableData.js';
import type { ClientState, RoomTarget } from '../core/types.js';
import type { TableLayoutId } from '../data/TexasGamePersonalSettings.js';
import type { CanvasRenderer } from '../effects/canvas-surface.js';
export interface GameSurface {
  readonly element: HTMLElement;
  readonly tableData: TableData | undefined;
  enter(target: RoomTarget): Promise<void>;
  leave(): void;
  requestSeat(seat:number): void;
  getState(): ClientState;
  attachEffects(position:'above'|'below', create:(canvas:HTMLCanvasElement)=>CanvasRenderer): Promise<()=>void>;
  destroy(): void;
}
export interface UiBrand { id: string; layouts: readonly TableLayoutId[]; accent: string; defaultFelt: string; }
export interface UiSkin {
  createClient(container: HTMLElement, options: MountOptions): GameSurface;
  getBrand(id?: string): UiBrand;
}
