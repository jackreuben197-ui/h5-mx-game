import { i18nLabel } from '../../i18n/i18nLabel.js';
import { ccActionText } from '../../i18n/CCActionText.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { SeatCountdownView } from './SeatCountdownView.js';
import { handValueTypeToString, type HandValueType } from '../../logic/HandValueType.js';
import { ChipFormatter } from '../../logic/ChipFormatter.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import type { SeatState } from '../../data/SeatData.js';
export class SeatIdentityView {
  readonly root = element('div', 'mx-seat-identity');
  private countdown = new SeatCountdownView();
  private avatar = element('img', 'mx-avatar');
  private fallback = element('div', 'mx-avatar-fallback');
  private border = element('div', 'mx-avatar-border');
  readonly avatarButton = element('button', 'mx-avatar-hit');
  readonly returnButton = element('button','mx-return-game');
  private playStatus=element('span','mx-seat-play-status');
  private autoStatus=element('span','mx-seat-auto-status',()=>i18nMgr.Get('MX_Trusteeship',[],'托管'));
  private handType=element('span','mx-seat-hand-type');
  private info = element('div', 'mx-player-info');
  private name = element('span', 'mx-player-name');
  private line = element('span', 'mx-player-line');
  private chips = element('strong', 'mx-stack');
  private fold = element('div', 'mx-fold-cover', () => i18nMgr.Get("UITexas_fold", [], "弃牌"));
  private win = element('div','mx-seat-win');
  private winPercent = element('div','mx-seat-win-percent');
  private winPercentTitle = element('span','mx-seat-win-percent-title');
  private winPercentValue = element('strong','mx-seat-win-percent-value');
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
    SpriteAtlas.paint(this.winPercentTitle, 'winPercentTitle');
    SpriteAtlas.paint(this.winPercentValue, 'winPercentValue');
    this.winPercent.append(this.winPercentTitle, this.winPercentValue);
    SpriteAtlas.paint(this.handType, 'cardTypeBg');
    this.avatarButton.type = 'button';
    this.avatarButton.hidden = true;
    this.returnButton.type='button';
    this.returnButton.hidden=true;
    SpriteAtlas.paint(this.returnButton,'returnGame');
    // CC prefab order: Head/Bubble precedes Head/Nick_Coin.
    this.root.append(this.fallback, this.avatar, this.border, this.countdown.root, this.fold, this.avatarButton, this.action, this.info, this.win,this.winPercent,this.handType,this.playStatus,this.autoStatus,this.returnButton);
  }
  destroy(): void { this.countdown.destroy(); }
  render(state: SeatState): void {
    const p = state.player;
    const keepDeadline=p?.keepSeatDeadline??0;
    const keeping=!!p?.keepSeatReason;
    this.countdown.render(p ? keeping && keepDeadline>Date.now()/1000 ? {seat:this.seatID,deadline:keepDeadline,totalTime:state.keepSeatDuration||Math.ceil(keepDeadline-Date.now()/1000)} : keeping ? undefined : state.countdown : undefined,keeping,p?.keepSeatReason===4);
    SpriteAtlas.paint(this.fallback, p ? (this.seatID % 2 ? 'avatar' : 'avatarAlt') : 'empty');
    this.info.hidden = !p;
    this.border.hidden = !p;
    this.avatarButton.hidden = !p;
    this.avatarButton.setAttribute('aria-label', p ? `${i18nMgr.Get('MX_PlayerStats', [], '玩家资料')}: ${p.name}` : '');
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
    const winPercent100=p?.winPercent100;
    this.winPercent.hidden=!state.mine||!p||p.folded||state.handEnded||winPercent100===undefined||winPercent100<0;
    if(!this.winPercent.hidden && winPercent100 !== undefined) {
      i18nLabel.bind(this.winPercentTitle,()=>i18nMgr.Get('MX_MyWinRate',[],'我的胜率'));
      this.winPercentValue.textContent=`${StringHelper.GetLongString(winPercent100)}%`;
    }
    this.handType.hidden=!state.mine||!state.handValueType||!!p?.folded||!!state.handEnded;
    if(!this.handType.hidden)i18nLabel.bind(this.handType,()=>handValueTypeToString(state.handValueType as HandValueType));
    this.win.hidden = !win;
    this.info.hidden = !p || !!win;
    i18nLabel.bind(this.win, () => win ? `${handValueTypeToString(win.handValueType as HandValueType) ?? ''}\n+${ChipFormatter.format(win.collectedChips,state.smallBlind,state.showBB)}` : '');
    this.fold.hidden = !p?.folded;
    i18nLabel.bind(this.action, () => p?.folded ? '' : ccActionText(p?.action ?? ''));
    this.action.hidden = !this.action.textContent;
    this.action.style.backgroundColor = p?.action === '全下' ? '#FA2B4B' : ['加注','下注'].includes(p?.action ?? '') ? '#78E4E4' : '#F9CA9F';
    // The normal Texas prefab has no Image_Trust node; CC only shows it when present (MTT).
    this.autoStatus.hidden = true;
    this.playStatus.hidden=!p||keeping||![0,2,3].includes(p.canPlayStatus??1);
    if(!this.playStatus.hidden)i18nLabel.bind(this.playStatus,()=>i18nMgr.Get('adaptation10177',[],'等待中'));
    this.returnButton.hidden=!state.mine||!(p?.keepSeatReason||p?.keepSeatDeadline);
    if(!this.returnButton.hidden)i18nLabel.bind(this.returnButton,()=>i18nMgr.Get('adaptation10011',[],'返回游戏'));
  }
}
