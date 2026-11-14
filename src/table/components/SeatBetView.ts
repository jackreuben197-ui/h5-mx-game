import type { SeatState } from '../../data/SeatData.js';
import { ChipFormatter } from '../../logic/ChipFormatter.js';
import { element, place } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
/** UITexasTableSeat/Head/CurRoundHaveBet: 160x70, chip 60x60, centered 40px label. */
export class SeatBetView {
  readonly root = element('div', 'mx-seat-bet');
  private chip = element('span', 'mx-seat-bet-chip');
  private label = element('span', 'mx-seat-bet-value');
  constructor() {
    this.root.hidden = true; SpriteAtlas.paint(this.root, 'info'); SpriteAtlas.paint(this.chip, 'chip');
    this.root.append(this.chip, this.label);
  }
  render(state: SeatState): void {
    const player = state.player;
    // Set the new amount before revealing a reused bet node.
    this.label.textContent = player?.roundBet ? ChipFormatter.format(player.roundBet, state.smallBlind, state.showBB) : '';
    this.root.hidden = !player?.roundBet || !!player.folded;
  }
  place(x: number, y: number, iconX: number): void {
    place(this.root, x, y);
    // CC icon's parent is at -50 relative to the bet center.
    place(this.chip, 80 - 50 + iconX, 35);
  }
}
