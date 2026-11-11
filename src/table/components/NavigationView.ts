import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
export class NavigationView {
  readonly root = element('nav', 'mx-navigation');
  constructor(navigate?: (action: 'report' | 'replay' | 'emoji' | 'voice') => void) {
    i18nLabel.bind(this.root, () => i18nMgr.Get("MX_TableNavigation", [], "牌桌导航"), 'aria-label');
    SpriteAtlas.paint(this.root, 'navigation');
    for (const [key, label] of [
      ['report', "UICareerRecord"],
      ['replay', "UITexas_History_paipu"],
      ['emoji', "UITexas_mainmenu_emoji"],
      ['voice', "UITexas_mainmenu_audio"],
    ] as const) {
      const button = element('button', 'mx-nav-button');
      button.type = 'button';
      const icon = element('span', 'mx-nav-icon');
      icon.setAttribute('aria-hidden', 'true');
      SpriteAtlas.paint(icon, key);
      button.append(icon, element('span', 'mx-nav-label', () => i18nMgr.Get(label)));
      button.onclick = () => navigate?.(key);
      this.root.append(button);
    }
    const logo = element('span', 'mx-nav-logo');
    logo.setAttribute('role', 'img');
    i18nLabel.bind(logo, () => i18nMgr.Get("MX_TableLogo", [], "牌桌标识"), 'aria-label');
    SpriteAtlas.paint(logo, 'cert');
    this.root.append(logo);
  }
}
