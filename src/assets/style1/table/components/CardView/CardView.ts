import config from './config.json';
import { tableAppearanceFor } from '../../appearance/TableAppearanceContext.js';
import { cardBacks } from '../../appearance/TableSkin.js';
import settings from '../../../../../data/TexasGamePersonalSettings.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import type { CardEmphasis } from '../../../../../core/Settlement.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { element } from '../../dom.js';
export class CardView {
  readonly root = element('span', 'mx-card');
  constructor(value: number, smallBack = false) { this.root.style.setProperty('--card-width',`${config.w}px`); this.root.style.setProperty('--card-height',`${config.h}px`); this.root.style.aspectRatio=`${config.w}/${config.h}`; CardView.paint(this.root, value, smallBack); }
  static readonly config=config;
  static emphasize(root: HTMLElement, value: number, emphasis: CardEmphasis | undefined, lift: number): void {
    const selected = emphasis?.popup?.includes(value) ?? false;
    root.classList.toggle('mx-card-dimmed', emphasis?.popup !== undefined && !selected);
    root.classList.toggle('mx-card-popped', selected);
    root.style.setProperty('--card-lift', `${-lift}px`);
    let glow = root.querySelector<HTMLElement>('.mx-card-highlight');
    if (!glow) { glow=element('span','mx-card-highlight');SpriteAtlas.paint(glow,config.paths.highlight);root.append(glow); }
    glow.hidden = !emphasis?.highlight?.includes(value);
  }
  static paint(root: HTMLElement, value: number, smallBack = false, type?: number): void {
    if(type!==undefined)root.dataset.cardPreview=String(type);
    const preferences=tableAppearanceFor(root)??settings;
    type=Number(root.dataset.cardPreview)||preferences.tableCardType;
    root.dataset.smallBack = String(smallBack);
    root.dataset.cardValue = String(value);
    if (value === 0) {
      const back=preferences.tableAppearance.cardBack;
      if(back==='original')SpriteAtlas.paint(root, smallBack ? config.paths.smallBack : config.paths.back);
      else {root.style.backgroundImage=`url("${cardBacks[back]}")`;root.style.backgroundSize='100% 100%';root.style.backgroundPosition='center';}
      i18nLabel.bind(root, () => i18nMgr.Get("MX_CardBack", [], "牌背"), 'aria-label');
      return;
    }
    const rank = value % 15;
    const id = Math.floor(value / 15) * 13 + (rank === 14 ? 0 : rank - 1);
    const faces: Record<string,string> = type === 2 ? config.paths.facesAlt : config.paths.faces;
    const path = faces[String(id)];
    if (!path) return;
    SpriteAtlas.paint(root, path);
    i18nLabel.bind(root, () => value === 0 ? i18nMgr.Get("MX_CardBack", [], "牌背") : `${[i18nMgr.Get("UIIcon_Text", [], "黑桃"), i18nMgr.Get("MX_Hearts", [], "红桃"), i18nMgr.Get("UIIcon_Text3", [], "梅花"), i18nMgr.Get("MX_Diamonds", [], "方块")][Math.floor(value / 15)]}${rank}`, 'aria-label');
  }
}
