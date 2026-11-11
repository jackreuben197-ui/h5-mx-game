import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import type { BuyInWallet } from '../../core/Seating.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
/** CC UIBringIn._setClubItemData: club_logo is a remote URL, never an atlas entry. */
export class WalletSelectView {
  readonly root = element('div', 'mx-wallet-select');
  private current = element('button', 'mx-wallet-current');
  private list = element('div', 'mx-wallet-list');
  private key = '';
  constructor(private select: (clubID: number) => void) {
    this.current.type = 'button';
    i18nLabel.bind(this.current, () => i18nMgr.Get("MX_SelectPaymentWallet", [], "选择支付钱包"), 'aria-label');
    this.current.setAttribute('aria-expanded', 'false');
    this.list.hidden = true;
    this.current.onclick = () => {
      this.list.hidden = !this.list.hidden;
      this.current.setAttribute('aria-expanded', String(!this.list.hidden));
    };
    this.root.append(this.current, this.list);
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
    const selected=element('span','mx-wallet-selected');selected.setAttribute('aria-hidden','true');
    row.append(head, text, balance, selected); return row;
  }
  render(wallets: BuyInWallet[], clubID: number, busy: boolean): void {
    const key = JSON.stringify([wallets, clubID]);
    if (key !== this.key) {
      this.key = key; this.list.hidden = true;
      this.current.setAttribute('aria-expanded', 'false');
      const selected = wallets.find(w => w.club_id === clubID);
      this.current.replaceChildren(...(selected ? [this.row(selected)] : []));
      const arrow = element('span', 'mx-wallet-arrow'); SpriteAtlas.paint(arrow, 'arrowDown');
      arrow.hidden = wallets.length < 2; this.current.append(arrow);
      this.list.replaceChildren(...wallets.map(wallet => {
        const button = element('button', 'mx-wallet-option'); button.type = 'button';
        button.setAttribute('aria-pressed', String(wallet.club_id === clubID));
        button.append(this.row(wallet)); button.onclick = () => this.select(wallet.club_id); return button;
      }));
    }
    this.current.disabled = busy || wallets.length < 2;
    this.list.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    if (busy) this.list.hidden = true;
  }
}
