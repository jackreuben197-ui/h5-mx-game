import type { SeatPlacement } from './TableLayout.js';
export type SeatPositionMode = 'static' | 'seat' | 'update';
export interface PublicCardsComponent { root: HTMLElement; cancel(): void; destroy(): void; }
export interface SeatComponent extends PublicCardsComponent {
  place(layout: SeatPlacement, mode?: SeatPositionMode): void;
  setActionLayer?(layer:HTMLElement|null,unit:number):void;
  setBetLayer?(layer:HTMLElement|null):void;
  entryActionsBounds?(): {avatarTop:number;returnVisible:boolean;scale:number};
}
