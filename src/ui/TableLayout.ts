import type { TableSnapshot } from '../core/types.js';
export interface SeatPlacement {
  x: number;
  y: number;
  scale: number;
  edge: string;
  cardsX: number;
  cardsY: number;
  cardScale: number;
  handSpread?: number;
  betX: number;
  betY: number;
  betIconX: number;
  dealerX: number;
  dealerY: number;
}
export interface LayoutPoint { x: number; y: number; scale?: number; }
export interface LayoutContentOptions { dual: boolean; boardSize: number; jackpotHeight: number; }
export interface LayoutContent {
  board: LayoutPoint; secondBoard: LayoutPoint; total: LayoutPoint; pool: LayoutPoint; info: LayoutPoint;
  styles: Record<string, string>;
}
export interface LayoutControls { scale?: number; styles: Record<string, string>; }
/** UI geometry only. Implementations have no DOM, requests, subscriptions or game mutations.
 * Stage coordinates use unit scaling; control coordinates/styles use CSS pixels.
 */
export interface TableLayout {
  readonly id: string;
  readonly compactRoomInfo: boolean;
  readonly unit: number;
  readonly width: number;
  readonly height: number;
  readonly suggest: number;
  readonly menuScale: number;
  readonly landscape: boolean;
  readonly origin: { x: number; y: number };
  resize(width: number, height: number, landscape: boolean, viewportBottom?: number): void;
  positions(state: TableSnapshot, publicCardScale?: number): Map<number, SeatPlacement>;
  content(options: LayoutContentOptions): LayoutContent;
  controls(state: TableSnapshot, buttonSize: number): LayoutControls;
}
