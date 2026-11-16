import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import type { BuyInWallet } from '../../core/Seating.js';
import { uniqueId } from '../../core/uniqueId.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
/** CC UIBringIn._setClubItemData: club_logo is a remote URL, never an atlas entry. */
export class WalletSelectView {
  readonly root = element('div', 'mx-wallet-select');
  private current = element('button', 'mx-wallet-current');
  private list = element('div', 'mx-wallet-list');
  private key = '';
  constructor(private overlay: HTMLElement, private body: HTMLElement, private select: (clubID: number) => void) {
    this.current.type = 'button';
    i18nLabel.bind(this.current, () => i18nMgr.Get("MX_SelectPaymentWallet", [], "选择支付钱包"), 'aria-label');
    this.list.id = `mx-wallet-list-${uniqueId()}`;
    this.list.hidden = true;
    this.current.setAttribute('aria-controls', this.list.id);
    this.current.setAttribute('aria-expanded', 'false');
    this.current.onclick = event => {
      if (this.close()) return;
      this.list.hidden = false;
      this.current.setAttribute('aria-expanded', 'true');
      this.positionList();
      if (event.detail === 0 && !this.list.hidden) {
        const option = this.list.querySelector<HTMLButtonElement>('button[aria-pressed=true]') ?? this.list.querySelector('button');
        option?.focus();
      }
    };
    this.root.append(this.current);
    // Mount above the scrolling body so the panel cannot clip the list.
    this.overlay.append(this.list);
    this.body.addEventListener('scroll', () => this.positionList(), { passive: true });
    this.overlay.addEventListener('click', event => {
      const target = event.target as Node;
      if (!this.root.contains(target) && !this.list.contains(target)) this.close();
    });
  }
  close(restoreFocus = false): boolean {
    if (this.list.hidden) return false;
    this.list.hidden = true;
    this.current.setAttribute('aria-expanded', 'false');
    if (restoreFocus) this.current.focus({ preventScroll: true });
    return true;
  }
  positionList(): void {
    if (this.list.hidden) return;
    const anchor = this.current.getBoundingClientRect();
    const body = this.body.getBoundingClientRect();
    if (!anchor.height || anchor.bottom <= body.top || anchor.top >= body.bottom) {
      this.close();
      return;
    }
    const frame = this.overlay.getBoundingClientRect();
    const below = frame.bottom - anchor.bottom;
    const above = anchor.top - frame.top;
    const style = this.list.style;
    style.left = `${anchor.left - frame.left}px`;
    style.width = `${anchor.width}px`;
    style.removeProperty('--mx-wallet-space');
    const opensAbove = this.list.offsetHeight > below && above > below;
    style.setProperty('--mx-wallet-space', `${opensAbove ? above : below}px`);
    style.top = opensAbove ? 'auto' : `${anchor.bottom - frame.top}px`;
    style.bottom = opensAbove ? `${frame.bottom - anchor.top}px` : 'auto';
  }
  private row(wallet: BuyInWallet): HTMLElement {
    const row = element('span', 'mx-wallet-row');
    const head = element('span', 'mx-wallet-head');
    SpriteAtlas.paint(head, 'clubDefault');
    if (wallet.club_logo) {
      const image = element('img', 'mx-wallet-logo');
      image.alt = `${wallet.club_name}俱乐部图标`;
      image.onerror = () => { image.hidden = true; };
      image.src = wallet.club_logo;
      head.append(image);
    }
    const text = element('span', 'mx-wallet-identity');
    text.append(element('span', 'mx-wallet-name', wallet.club_name));
    const id = element('span', 'mx-wallet-id');
    const badge = element('span', 'mx-wallet-id-icon');
    badge.setAttribute('aria-label', 'ID'); SpriteAtlas.paint(badge, 'walletID');
    id.append(badge, element('span', '', String(wallet.club_random_id ?? wallet.club_id))); text.append(id);
    const balance = element('span', 'mx-wallet-balance');
    const chip = element('span', 'mx-wallet-chip'); SpriteAtlas.paint(chip, 'chip');
    balance.append(element('span', '', () => i18nMgr.Get("UIClub_CreateRoom31", [], "余额")), chip, element('span', '', StringHelper.GetLongStringLocale(wallet.gold)));
    row.append(head, text, balance); return row;
  }
  render(wallets: BuyInWallet[], clubID: number, busy: boolean): void {
    const key = JSON.stringify([wallets, clubID]);
    if (key !== this.key) {
      this.key = key; this.close();
      const selected = wallets.find(w => w.club_id === clubID);
      this.current.replaceChildren(...(selected ? [this.row(selected)] : []));
      const arrow = element('span', 'mx-wallet-arrow'); SpriteAtlas.paint(arrow, 'arrowDown');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.hidden = wallets.length < 2; this.current.append(arrow);
      this.list.replaceChildren(...wallets.map(wallet => {
        const button = element('button', 'mx-wallet-option'); button.type = 'button';
        button.setAttribute('aria-pressed', String(wallet.club_id === clubID));
        const indicator = element('span', 'mx-wallet-selected'); indicator.setAttribute('aria-hidden', 'true');
        button.append(this.row(wallet), indicator);
        button.onclick = event => { this.close(event.detail === 0); this.select(wallet.club_id); };
        return button;
      }));
    }
    this.current.disabled = busy || wallets.length < 2;
    this.list.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    if (busy) this.close();
  }
}
