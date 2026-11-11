import type { TableSnapshot } from '../core/types.js';
import { TableInfoData } from './TableInfoData.js';
import { SeatsData } from './SeatsData.js';
import { PublicCardsData } from './PublicCardsData.js';
import { PotData } from './PotData.js';
/** No DOM, protocol decoding or animation work in the data layer. */
export class TableData {
  readonly info = new TableInfoData();
  readonly seats = new SeatsData();
  readonly publicCards = new PublicCardsData();
  readonly pot = new PotData();
  replace(snapshot: TableSnapshot): void {
    this.info.snapshot = snapshot; // Prepare composition/layout before component notifications.
    this.seats.replace(snapshot);
    this.publicCards.replace(snapshot);
    this.pot.format = { smallBlind: snapshot.smallBlind ?? 0, showBB: snapshot.showBB ?? false };
    this.pot.amount = snapshot.pot;
    this.pot.pools = snapshot.pots ?? [];
  }
  destroy(): void {
    this.info.clear();
    this.seats.destroy();
    this.publicCards.clear();
    this.pot.clear();
  }
}
