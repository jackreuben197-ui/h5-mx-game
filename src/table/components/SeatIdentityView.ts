import { i18nLabel } from '../../i18n/i18nLabel.js';
import { ccActionText } from '../../i18n/CCActionText.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { SeatCountdownView } from './SeatCountdownView.js';
import { handValueTypeToString, type HandValueType } from '../../logic/HandValueType.js';
import { ChipFormatter } from '../../logic/ChipFormatter.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import type { SeatState } from '../../data/SeatData.js';
export class SeatIdentityView {
  readonly root = element('div', 'mx-seat-identity');
  private countdown = new SeatCountdownView();
  private avatar = element('img', 'mx-avatar');
  private fallback = element('div', 'mx-avatar-fallback');
  private border = element('div', 'mx-avatar-border');
  private info = element('div', 'mx-player-info');
  private name = element('span', 'mx-player-name');
  private line = element('span', 'mx-player-line');
  private chips = element('strong', 'mx-stack');
  private fold = element('div', 'mx-fold-cover', () => i18nMgr.Get("UITexas_fold", [], "弃牌"));
  private win = element('div','mx-seat-win');
  private action = element('span', 'mx-player-action');
  constructor(private seatID: number) {
    this.avatar.alt = i18nMgr.Get("MX_PlayerAvatar", [], "玩家头像");
    this.avatar.hidden = true;
    this.avatar.onerror = () => {
      this.avatar.hidden = true;
    };
    SpriteAtlas.paint(this.border, 'border');
    SpriteAtlas.paint(this.info, 'info');
    SpriteAtlas.paint(this.line, 'line');
    this.info.append(this.name, this.line, this.chips);
    SpriteAtlas.paint(this.action, 'actionBubble');
    SpriteAtlas.paint(this.win, 'winBoard');
    // CC prefab order: Head/Bubble precedes Head/Nick_Coin.
    this.root.append(this.fallback, this.avatar, this.border, this.countdown.root, this.fold, this.action, this.info, this.win);
  }
  destroy(): void { this.countdown.destroy(); }
  render(state: SeatState): void {
    const p = state.player;
    this.countdown.render(p ? state.countdown : undefined);
    SpriteAtlas.paint(this.fallback, p ? (this.seatID % 2 ? 'avatar' : 'avatarAlt') : 'empty');
    this.info.hidden = !p;
    this.border.hidden = !p;
    this.name.hidden = state.mine;
    this.line.hidden = state.mine;
    this.name.textContent = p?.name ?? '';
    this.chips.textContent = p ? new ChipFormatter(state.smallBlind, state.showBB).showPlayerBalanceWithShowBB(p.chips) : '';
    if (p?.avatar) {
      if (this.avatar.getAttribute('src') !== p.avatar) {
        this.avatar.src = p.avatar;
        this.avatar.hidden = false;
      }
    } else {
      this.avatar.removeAttribute('src');
      this.avatar.hidden = true;
    }
    const win = p?.settlement?.win;
    this.win.hidden = !win;
    this.info.hidden = !p || !!win;
    i18nLabel.bind(this.win, () => win ? `${handValueTypeToString(win.handValueType as HandValueType) ?? ''}\n+${ChipFormatter.format(win.collectedChips,state.smallBlind,state.showBB)}` : '');
    this.fold.hidden = !p?.folded;
    i18nLabel.bind(this.action, () => p?.folded ? '' : ccActionText(p?.action ?? ''));
    this.action.hidden = !this.action.textContent;
    this.action.style.backgroundColor = p?.action === '全下' ? '#FA2B4B' : ['加注','下注'].includes(p?.action ?? '') ? '#78E4E4' : '#F9CA9F';
  }
}
