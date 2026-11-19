import { chipLabel } from '../../ChipLabel.js';
import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import type { SeatState } from '../../../../../data/SeatData.js';
import { ChipFormatter } from '../../../../../logic/ChipFormatter.js';
import { element, place } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
/** Chip artwork is cropped to its visible bounds and offset outside the rounded frame. */
export class SeatBetView {
  readonly root = componentBox(element('div', 'mx-seat-bet'),config);
  private chip = element('span', 'mx-seat-bet-chip');
  private chipImage = element('span', 'mx-seat-bet-chip-image');
  private label = element('span', 'mx-seat-bet-value');
  constructor() {
    this.root.hidden = true; SpriteAtlas.paint(this.root, config.paths.info); SpriteAtlas.paint(this.chipImage, config.paths.chip);
    const crop=config.layout.chipCrop;
    Object.assign(this.chipImage.style,{left:`${-crop.x/crop.width*100}%`,top:`${-crop.y/crop.height*100}%`,width:`${crop.sourceWidth/crop.width*100}%`,height:`${crop.sourceHeight/crop.height*100}%`});
    this.chip.append(this.chipImage);
    this.root.append(this.chip, this.label);
  }
  render(state: SeatState): void {
    const player = state.player;
    // Set the new amount before revealing a reused bet node.
    chipLabel(this.label,player?.roundBet ? ChipFormatter.format(player.roundBet, state.smallBlind, state.showBB) : '');
    this.root.hidden = !player?.roundBet || !!player.folded || !!state.handEnded;
  }
  place(x: number, y: number, iconX: number, anchor:'left'|'right'|'center'='center'): void {
    place(this.root, x, y);
    this.root.dataset.chipSide = iconX > 100 ? 'right' : 'left';
    this.root.dataset.anchor=anchor;
  }
}
