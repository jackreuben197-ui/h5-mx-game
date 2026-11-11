import { i18nMgr } from '../../i18n/i18nMgr.js';
import { element } from '../dom.js';
/** Dev-only language control; does not change H5 routes or the current room session. */
export class LanguageSwitchView {
  readonly root = element('section', 'mx-language-test');
  private panel = element('div', 'mx-language-options');
  private buttons = new Map<string, HTMLButtonElement>();
  constructor(container: HTMLElement) {
    for (const [code, name] of [['cn','简体中文'],['zh','繁體中文'],['en','English'],['pt','Português']]) {
      const button = element('button', '', name!);
      button.type = 'button';
      button.onclick = () => { i18nMgr.setLanguage(code!); };
      this.buttons.set(code!, button); this.panel.append(button);
    }
    this.root.append(element('h3', 'mx-test-heading', '语言'), this.panel); container.append(this.root);
    i18nMgr.register(this); this.refreshLanguage();
  }
  refreshLanguage(): void {
    this.buttons.forEach((button, code) => button.setAttribute('aria-pressed', String(code === i18nMgr.language)));
  }
  destroy(): void { this.buttons.forEach(button => button.onclick = null); this.buttons.clear(); this.root.remove(); }
}
