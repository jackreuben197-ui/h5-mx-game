import type { SeatData } from '../data/SeatData.js';
import type { PublicCardsData } from '../data/PublicCardsData.js';
import type { PotData } from '../data/PotData.js';
import type { SeatComponent } from './components/SeatView.js';
import type { PublicCardsComponent } from './components/PublicCardsView.js';
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
    render(snapshot: TableSnapshot): void;
    destroy(): void;
  };
  navigation?: (navigate?: (action: 'report' | 'replay' | 'emoji' | 'voice') => void) => {
    root: HTMLElement;
    destroy?(): void;
  };
}
