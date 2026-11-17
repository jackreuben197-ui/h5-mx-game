import type { SeatData } from '../data/SeatData.js';
import type { PublicCardsData } from '../data/PublicCardsData.js';
import type { PotData } from '../data/PotData.js';
import type { SeatComponent } from './Components.js';
import type { PublicCardsComponent } from './Components.js';
import type { Action, TableSnapshot } from '../core/types.js';
export interface TableComponents {
  seat?: (
    data: SeatData,
    originDelta: (group: HTMLElement) => { x: number; y: number },
  ) => SeatComponent;
  publicCards?: (data: PublicCardsData) => PublicCardsComponent;
  pot?: (data: PotData) => { total: HTMLElement; pool: HTMLElement; destroy(): void };
  actions?: (command: (action: Action, amount?: number) => Promise<void>) => {
    root: HTMLElement;
    setScale?(scale: number): void;
    render(snapshot: TableSnapshot): void;
    destroy(): void;
  };
  navigation?: (navigate?: (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => void) => {
    root: HTMLElement;
    render?(snapshot: TableSnapshot): void;
    destroy?(): void;
  };
}
