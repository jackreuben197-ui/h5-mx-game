import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { CardEmphasis } from '../core/Settlement.js';
import type { TableSnapshot } from '../core/types.js';
export interface PublicCardsState {
  cards: readonly number[];
  emphasis?: CardEmphasis;
  handNum: number;
  presentation: TableSnapshot['presentation'];
}
export class PublicCardsData extends EventSource {
  static readonly CHANGE = 'board:change';
  @observable(PublicCardsData.CHANGE) state: PublicCardsState = {
    cards: [],
    handNum: 0,
    presentation: 'sync',
  };
  replace(table: TableSnapshot): void {
    this.state = {
      cards: table.community,
      emphasis: table.communityEmphasis,
      handNum: table.handNum,
      presentation: table.presentation,
    };
  }
}
