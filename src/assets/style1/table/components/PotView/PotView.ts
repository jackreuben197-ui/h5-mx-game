import { chipLabel } from '../../ChipLabel.js';
import config from './config.json';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { ChipFormatter } from '../../../../../logic/ChipFormatter.js';
import { PotData } from '../../../../../data/PotData.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
export class PotView {
  readonly total = element('div', 'mx-pot');
  readonly pool = element('div', 'mx-pool');
  private bindings = new BindingScope(this);
  constructor(private data: PotData) {
    this.pool.classList.add('mx-pools');
    this.bindings.bind({ pot: data });
  }
  @bindEvent(PotData.FORMAT, 'pot')
  private onFormat(): void { this.onAmount(this.data.amount); this.onPools(this.data.pools); }
  @bindEvent(PotData.CHANGE, 'pot')
  private onAmount(amount: number): void {
    chipLabel(this.total, () => `${i18nMgr.Get("adaptation20005")}: ${ChipFormatter.format(amount, this.data.format.smallBlind, this.data.format.showBB)}`);
  }
  @bindEvent(PotData.POOLS, 'pot')
  private onPools(pools: readonly number[]): void {
    this.pool.hidden = !pools.length;
    const items = pools.slice(0, 9).map((amount, index) => {
      const item = element('span', index === 0 ? 'mx-pool-item mx-pool-main' : 'mx-pool-item mx-pool-side');
      const value = element('span', 'mx-pool-value');
      chipLabel(value, ChipFormatter.format(amount, this.data.format.smallBlind, this.data.format.showBB));
      SpriteAtlas.paint(item, config.paths.pool);
      const chip = element('i', 'mx-pot-chip');
      SpriteAtlas.paint(chip, config.paths.chip);
      item.append(chip, value);
      return item;
    });
    const sides = element('div', 'mx-side-pools');
    sides.append(...items.slice(1));
    sides.hidden = items.length < 2;
    this.pool.replaceChildren(...items.slice(0, 1), sides);
  }
  destroy(): void {
    this.bindings.destroy();
    this.total.remove();
    this.pool.remove();
  }
}
