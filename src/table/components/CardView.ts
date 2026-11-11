import settings from '../../data/TexasGamePersonalSettings.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import type { CardEmphasis } from '../../core/Settlement.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import atlas from '../../assets/atlas.json';
import { resources } from '../resources.js';
import { element } from '../dom.js';
export class CardView {
  readonly root = element('span', 'mx-card');
  constructor(value: number, smallBack = false) { CardView.paint(this.root, value, smallBack); }
  static emphasize(root: HTMLElement, value: number, emphasis: CardEmphasis | undefined, lift: number): void {
    const selected = emphasis?.popup?.includes(value) ?? false;
    root.classList.toggle('mx-card-dimmed', emphasis?.popup !== undefined && !selected);
    root.classList.toggle('mx-card-popped', selected);
    root.style.setProperty('--card-lift', `${-lift}px`);
    let glow = root.querySelector<HTMLElement>('.mx-card-highlight');
    if (!glow) { glow=element('span','mx-card-highlight');SpriteAtlas.paint(glow,'cardHighlight');root.append(glow); }
    glow.hidden = !emphasis?.highlight?.includes(value);
  }
  static paint(root: HTMLElement, value: number, smallBack = false, type = settings.pokerCardType): void {
    root.dataset.smallBack = String(smallBack);
    root.dataset.cardValue = String(value);
    if (value === 0) {
      SpriteAtlas.paint(root, smallBack ? 'tableBack' : 'cardBack');
      i18nLabel.bind(root, () => i18nMgr.Get("MX_CardBack", [], "牌背"), 'aria-label');
      return;
    }
    const rank = value % 15,
      id = value === 0 ? 88 : Math.floor(value / 15) * 13 + (rank === 14 ? 0 : rank - 1),
      index = atlas.ids.indexOf(id);
    if (index < 0) return;
    if (resources.mode === 'raw') {
      root.style.backgroundImage = `url("${(type === 2 ? resources.rawCards1 : resources.rawCards)[String(id)]}")`;
      root.style.backgroundSize = '100% 100%'; root.style.backgroundPosition = 'center';
    } else {
    root.style.backgroundImage = `url("${type === 2 ? resources.cards1 : resources.cards}")`;
    root.style.backgroundSize = `${atlas.columns * 100}% ${atlas.rows * 100}%`;
    root.style.backgroundPosition = `${((index % atlas.columns) * 100) / (atlas.columns - 1)}% ${(Math.floor(index / atlas.columns) * 100) / (atlas.rows - 1)}%`;
    }
    i18nLabel.bind(root, () => value === 0 ? i18nMgr.Get("MX_CardBack", [], "牌背") : `${[i18nMgr.Get("UIIcon_Text", [], "黑桃"), i18nMgr.Get("MX_Hearts", [], "红桃"), i18nMgr.Get("UIIcon_Text3", [], "梅花"), i18nMgr.Get("MX_Diamonds", [], "方块")][Math.floor(value / 15)]}${rank}`, 'aria-label');
  }
}
