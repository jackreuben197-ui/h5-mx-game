import type { AnchoredPopup } from '../../AnchoredPopup.js';
import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import type { BuyInWallet } from '../../../../../core/Seating.js';
import { uniqueId } from '../../../../../core/uniqueId.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { roundSelectionIndicator } from '../RoundCheckbox/RoundCheckbox.js';
/** CC UIBringIn._setClubItemData: club_logo is a remote URL, never an atlas entry. */
export class WalletSelectView {
  readonly root = componentBox(element('div', 'mx-wallet-select'),config);
  private current = element('button', 'mx-wallet-current');
  private list = element('div', 'mx-wallet-list');
  private key = '';
  constructor(private popup: AnchoredPopup, private select: (clubID: number) => void) {
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
    this.popup.mount(this.list,this.current,()=>this.close());
  }
  close(restoreFocus = false): boolean {
    if (this.list.hidden) return false;
    this.list.hidden = true;
    this.current.setAttribute('aria-expanded', 'false');
    if (restoreFocus) this.current.focus({ preventScroll: true });
    return true;
  }
  positionList():void {if(!this.popup.position(this.list,this.current))this.close();}
  destroy():void {this.popup.destroy();this.root.remove();}
  private row(wallet: BuyInWallet): HTMLElement {
    const row = element('span', 'mx-wallet-row');
    const head = element('span', 'mx-wallet-head');
    SpriteAtlas.paint(head, config.paths.clubDefault);
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
    badge.setAttribute('aria-label', 'ID'); SpriteAtlas.paint(badge, config.paths.walletID);
    id.append(badge, element('span', '', String(wallet.club_random_id ?? wallet.club_id))); text.append(id);
    const balance = element('span', 'mx-wallet-balance');
    const chip = element('span', 'mx-wallet-chip'); SpriteAtlas.paint(chip, config.paths.chip);
    balance.append(element('span', '', () => i18nMgr.Get("UIClub_CreateRoom31", [], "余额")), chip, element('span', '', StringHelper.GetLongStringLocale(wallet.gold)));
    row.append(head, text, balance); return row;
  }
  render(wallets: BuyInWallet[], clubID: number, busy: boolean): void {
    const key = JSON.stringify([wallets, clubID]);
    if (key !== this.key) {
      this.key = key; this.close();
      const selected = wallets.find(w => w.club_id === clubID);
      this.current.replaceChildren(...(selected ? [this.row(selected)] : []));
      const arrow = element('span', 'mx-wallet-arrow'); SpriteAtlas.paint(arrow, config.paths.arrowDown);
      arrow.setAttribute('aria-hidden', 'true');
      arrow.hidden = wallets.length < 2; this.current.append(arrow);
      this.list.replaceChildren(...wallets.map(wallet => {
        const button = element('button', 'mx-wallet-option'); button.type = 'button';
        button.setAttribute('aria-pressed', String(wallet.club_id === clubID));
        button.append(this.row(wallet), roundSelectionIndicator());
        button.onclick = event => { this.close(event.detail === 0); this.select(wallet.club_id); };
        return button;
      }));
    }
    this.current.disabled = busy || wallets.length < 2;
    this.list.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    if (busy) this.close();
  }
}
