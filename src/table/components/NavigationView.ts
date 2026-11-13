import { AsyncImage } from '../AsyncImage.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import type { TableSnapshot } from '../../core/types.js';
export class NavigationView {
  readonly root = element('nav', 'mx-navigation');
  private buttons = new Map<'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera', HTMLButtonElement>();
  private logo = element('img', 'mx-nav-logo');
  private layout = 0;
  private logoImage = new AsyncImage(this.logo);
  constructor(navigate?: (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => void) {
    i18nLabel.bind(this.root, () => i18nMgr.Get("MX_TableNavigation", [], "牌桌导航"), 'aria-label');
    SpriteAtlas.paint(this.root, 'navigation');
    for (const [key, label] of [
      ['report', "UICareerRecord"],
      ['replay', "UITexas_History_paipu"],
      ['emoji', "UITexas_mainmenu_emoji"],
      ['effect', "MX_TableEffect"],
      ['voice', "UITexas_mainmenu_audio"],
      ['camera', "MX_TableCamera"],
    ] as const) {
      const button = element('button', 'mx-nav-button');
      button.type = 'button';
      const icon = element('span', 'mx-nav-icon');
      icon.setAttribute('aria-hidden', 'true');
      SpriteAtlas.paint(icon, key);
      button.append(icon, element('span', 'mx-nav-label', () => i18nMgr.Get(label, [], key === 'effect' ? '窗花' : key === 'camera' ? '视频' : undefined)));
      button.onclick = () => navigate?.(key);
      this.buttons.set(key, button);
      this.root.append(button);
    }
    this.logo.alt = i18nMgr.Get('MX_TableLogo', [], '牌桌标识');
    this.logo.hidden = true;
    this.root.append(this.logo);
    this.renderLayout(3);
  }
  render(state: TableSnapshot): void {
    this.renderLayout((state.antiCheatType ?? 1) <= 1 ? 3 : state.antiCheatType === 2 ? 4 : 6);
    const url = state.roomLogo?.trim() ?? '';
    this.logoImage.set(url);
  }
  private renderLayout(count: 3 | 4 | 6): void {
    if (this.layout === count) return;
    this.layout = count;
    this.root.dataset.layout = String(count);
    const common = ['report', 'replay', 'emoji'] as const;
    const tail = count === 3 ? [] : count === 4 ? ['voice'] as const : ['effect', 'voice', 'camera'] as const;
    const ordered = [...common.map(key => this.buttons.get(key)!), ...(count === 6 ? [this.logo] : []), ...tail.map(key => this.buttons.get(key)!), ...(count === 6 ? [] : [this.logo])];
    this.root.replaceChildren(...ordered);
  }
}
