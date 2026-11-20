import { chipLabel } from '../../ChipLabel.js';
import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import { localFrame } from '../../LocalFrame.js';
import { AsyncImage } from '../../AsyncImage.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { ccActionText } from '../../../../../i18n/CCActionText.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { SeatCountdownView } from '../SeatCountdownView/SeatCountdownView.js';
import { handValueTypeToString, type HandValueType } from '../../../../../logic/HandValueType.js';
import { ChipFormatter } from '../../../../../logic/ChipFormatter.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import type { SeatState } from '../../../../../data/SeatData.js';
import { SeatInfoTicker } from './SeatInfoTicker.js';
import './layout.css';
export class SeatIdentityView {
  readonly root = element('div', 'mx-seat-identity');
  readonly frame=localFrame(this.root,config.w,config.h,config.anchor.x,config.anchor.y);
  private squid=element('span','mx-seat-squid');
  private squidMask=element('span','mx-seat-squid-mask');
  private readonly classicBorderStyle=this.root.style.setProperty('--mx-classic-avatar-border',`url("${resourceURL(config.paths.classicBorder)}")`);
  private countdown = new SeatCountdownView();
  private avatar = element('img', 'mx-avatar');
  private avatarImage = new AsyncImage(this.avatar);
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
  private nameTicker = new SeatInfoTicker(this.name);
  private chipsTicker = new SeatInfoTicker(this.chips);
  private fold = element('div', 'mx-fold-cover', () => i18nMgr.Get("UITexas_fold", [], "弃牌"));
  private win = element('div','mx-seat-win');
  private winHandType = element('span','mx-seat-win-hand-type');
  private winHandTypeText = element('span','mx-seat-win-hand-type-text');
  private winHandTypeResize = new ResizeObserver(() => this.fitWinHandType());
  private winAmount = element('span','mx-seat-win-amount');
  private winPercent = element('div','mx-seat-win-percent');
  private winPercentTitle = element('span','mx-seat-win-percent-title');
  private winPercentValue = element('strong','mx-seat-win-percent-value');
  private insuranceDeadline = 0;
  private insuranceTimer?: ReturnType<typeof setInterval>;
  private actionText = '';
  private action = element('span', 'mx-player-action');
  constructor(private seatID: number) {
    this.root.style.setProperty('--identity-origin-x',`${config.w*config.anchor.x}px`);
    this.root.style.setProperty('--identity-origin-y',`${config.h*config.anchor.y}px`);
    this.squid.style.setProperty('--squid_bg_red',`url("${resourceURL(config.paths.squid_bg_red)}")`);
    this.squid.style.backgroundImage=`url("${resourceURL(config.paths.table_icon_squid_sm)}")`;
    this.squidMask.style.backgroundImage=`url("${resourceURL(config.paths.squid_mask)}")`;
    this.avatar.alt = i18nMgr.Get("MX_PlayerAvatar", [], "玩家头像");
    this.avatar.hidden = true;
    SpriteAtlas.paint(this.border, config.paths.border);
    SpriteAtlas.paint(this.info, config.paths.info);
    SpriteAtlas.paint(this.line, config.paths.line);
    const stackSlot = element('div', 'mx-stack-slot');
    stackSlot.append(this.chips, this.win);
    this.info.append(this.name, this.line, stackSlot);
    SpriteAtlas.paint(this.action, config.paths.actionBubble);
    SpriteAtlas.paint(this.win, config.paths.winBoard);
    this.win.hidden = true;
    this.winHandType.append(this.winHandTypeText);
    this.win.append(this.winHandType, this.winAmount);
    this.winHandTypeResize.observe(this.winHandType);
    this.winHandTypeResize.observe(this.winHandTypeText);
    SpriteAtlas.paint(this.winPercentTitle, config.paths.winPercentTitle);
    SpriteAtlas.paint(this.winPercentValue, config.paths.winPercentValue);
    this.winPercent.append(this.winPercentTitle, this.winPercentValue);
    SpriteAtlas.paint(this.handType, config.paths.cardTypeBg);
    this.avatarButton.type = 'button';
    this.avatarButton.hidden = true;
    this.returnButton.type='button';
    this.returnButton.hidden=true;
    SpriteAtlas.paint(this.returnButton,config.paths.returnGame);
    // CC prefab order: Head/Bubble precedes Head/Nick_Coin.
    this.root.append(this.squid,this.squidMask,this.fallback, this.avatar, this.border, this.countdown.root, this.fold, this.avatarButton, this.action, this.info,this.winPercent,this.handType,this.playStatus,this.autoStatus,this.returnButton);
  }
  getAvatarBounds():DOMRect { return this.fallback.getBoundingClientRect(); }
  setActionLayer(layer:HTMLElement|null):void {
    const parent=layer??this.root;
    if(layer)layer.classList.toggle('mx-insurance-buying',this.root.classList.contains('mx-insurance-buying'));
    if(this.action.parentElement!==parent)parent.append(this.action);
  }
  refreshInfoLayout(): void { this.nameTicker.refresh(); this.chipsTicker.refresh(); }
  destroy(): void { this.nameTicker.destroy(); this.chipsTicker.destroy(); this.winHandTypeResize.disconnect(); this.avatarImage.destroy(); clearInterval(this.insuranceTimer); this.countdown.destroy(); }
  private fitWinHandType(): void {
    const width = this.winHandType.clientWidth;
    const textWidth = this.winHandTypeText.scrollWidth;
    // Measure in local units so every seat scale and live language change fits the same row.
    if (width > 0 && textWidth > 0) this.winHandTypeText.style.transform = `scale(${Math.min(1, width / textWidth)})`;
  }
  render(state: SeatState): void {
    const p = state.player;
    this.squid.hidden=!(p?.squidIn||p?.squidCount);this.squid.replaceChildren(element('span','',String(p?.squidCount??0)));
    // Product feedback #53 replaces the tied overlay with an explicit zero badge.
    this.squidMask.hidden=true;
    this.squid.dataset.zero=String(!!p?.squidIn&&!p.squidCount);
    const keepDeadline=p?.keepSeatDeadline??0;
    const keeping=!!p?.keepSeatReason;
    this.countdown.render(p ? keeping && keepDeadline>Date.now()/1000 ? {seat:this.seatID,deadline:keepDeadline,totalTime:state.keepSeatDuration||Math.ceil(keepDeadline-Date.now()/1000)} : keeping || state.foldCountdown ? undefined : state.countdown : undefined,keeping,p?.keepSeatReason===4);
    SpriteAtlas.paint(this.fallback, p ? (this.seatID % 2 ? config.paths.avatar : config.paths.avatarAlt) : config.paths.empty);
    this.info.hidden = !p;
    this.border.hidden = !p;
    this.avatarButton.hidden = !p;
    this.avatarButton.setAttribute('aria-label', p ? `${i18nMgr.Get('MX_PlayerStats', [], '玩家资料')}: ${p.name}` : '');
    this.name.hidden = state.mine;
    this.line.hidden = state.mine;
    const owner = String(p?.userRid ?? '');
    this.nameTicker.render(p?.name ?? '', owner);
    this.chipsTicker.render(p ? new ChipFormatter(state.smallBlind, state.showBB,state.isMtt).showPlayerBalanceWithShowBB(p.chips) : '', owner, chipLabel);
    this.avatarImage.set(p?.avatar ?? '', String(p?.userRid ?? ''));
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
    if (win) {
      this.winHandType.hidden = !win.handValueType;
      if (!this.winHandType.hidden) {
        i18nLabel.bind(this.winHandTypeText, () => handValueTypeToString(win.handValueType as HandValueType) ?? '');
      }
      chipLabel(this.winAmount, `+${ChipFormatter.tableAmount(win.collectedChips, state.smallBlind, state.showBB)}`);
    }
    this.fold.hidden = !p?.folded;
    i18nLabel.bind(this.action, () => p?.folded ? '' : ccActionText(p?.action ?? ''));
    this.actionText = this.action.textContent ?? '';
    this.insuranceDeadline = p?.insuranceDeadline ?? 0;
    clearInterval(this.insuranceTimer);
    const refreshInsurance = () => {
      const left = Math.max(0, Math.ceil(this.insuranceDeadline - Date.now() / 1000));
      this.root.classList.toggle('mx-insurance-buying', left > 0);
      if(this.action.parentElement!==this.root)this.action.parentElement?.classList.toggle('mx-insurance-buying',left>0);
      this.action.style.backgroundColor = left ? '#00B88B' : p?.action === '全下' ? '#FA2B4B' : ['加注','下注'].includes(p?.action ?? '') ? '#78E4E4' : 'var(--mx-passive-action-color, #F9CA9F)';
      this.action.textContent = left ? i18nMgr.Get('adaptation20062').replace('##', String(left)) : this.actionText;
      this.action.hidden = !this.action.textContent;
      if (!left) clearInterval(this.insuranceTimer);
    };
    if (this.insuranceDeadline > Date.now() / 1000) this.insuranceTimer = setInterval(refreshInsurance, 200);
    refreshInsurance();
    // The normal Texas prefab has no Image_Trust node; CC only shows it when present (MTT).
    this.autoStatus.hidden = true;
    this.playStatus.hidden=!p||keeping||![0,2,3].includes(p.canPlayStatus??1);
    if(!this.playStatus.hidden)i18nLabel.bind(this.playStatus,()=>i18nMgr.Get('adaptation10177',[],'等待中'));
    this.returnButton.hidden=!!state.isMtt||!state.mine||!(p?.keepSeatReason||p?.keepSeatDeadline);
    if(!this.returnButton.hidden)i18nLabel.bind(this.returnButton,()=>i18nMgr.Get('adaptation10011',[],'返回游戏'));
  }
}
