import { chipLabel } from '../../ChipLabel.js';
import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import type { SeatState } from '../../../../../data/SeatData.js';
import { ChipFormatter } from '../../../../../logic/ChipFormatter.js';
import { element, place } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
/** UITexasTableSeat/Head/CurRoundHaveBet: 160x70, chip 60x60, centered 40px label. */
export class SeatBetView {
  readonly root = componentBox(element('div', 'mx-seat-bet'),config);
  private chip = element('span', 'mx-seat-bet-chip');
  private label = element('span', 'mx-seat-bet-value');
  constructor() {
    this.root.hidden = true; SpriteAtlas.paint(this.root, config.paths.info); SpriteAtlas.paint(this.chip, config.paths.chip);
    this.root.append(this.chip, this.label);
  }
  render(state: SeatState): void {
    const player = state.player;
    // Set the new amount before revealing a reused bet node.
    chipLabel(this.label,player?.roundBet ? ChipFormatter.format(player.roundBet, state.smallBlind, state.showBB) : '');
    this.root.hidden = !player?.roundBet || !!player.folded || !!state.handEnded;
  }
  place(x: number, y: number, iconX: number): void {
    place(this.root, x, y);
    this.root.dataset.chipSide = iconX > 100 ? 'right' : 'left';
    // CC icon's parent is at -50 relative to the bet center.
    place(this.chip, config.layout.chipOriginX - config.layout.chipInsetX + iconX, config.layout.chipY);
  }
}
