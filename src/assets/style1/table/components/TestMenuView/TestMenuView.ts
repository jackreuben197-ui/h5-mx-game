import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { element } from '../../dom.js';
import { LanguageSwitchView } from '../LanguageSwitchView/LanguageSwitchView.js';
/** Single DEV-only entry for language and live-table visual tests. */
export class TestMenuView {
  readonly root = componentBox(element('details', 'mx-test-menu'),config);
  readonly tableControls = element('div', 'mx-test-table-controls');
  private toggle = element('summary', '', '测试');
  private panel = element('div', 'mx-test-panel');
  private language: LanguageSwitchView;
  private outside = (event: PointerEvent) => {
    if (event.target instanceof Node && !this.root.contains(event.target)) this.root.open = false;
  };
  private escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.root.open) {
      this.root.open = false;
      this.toggle.focus();
      event.stopPropagation();
    }
  };
  constructor(container: HTMLElement) {
    this.toggle.setAttribute('aria-label', '开发测试菜单');
    this.language = new LanguageSwitchView(this.panel);
    this.panel.append(this.tableControls);
    this.root.append(this.toggle, this.panel);
    container.append(this.root);
    // Dismiss after selection so effects can be inspected without covering the table.
    this.panel.onclick = event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (button && !button.disabled) { this.root.open = false; this.toggle.focus(); }
    };
    document.addEventListener('pointerdown', this.outside);
    document.addEventListener('keydown', this.escape);
  }
  destroy(): void {
    document.removeEventListener('pointerdown', this.outside);
    document.removeEventListener('keydown', this.escape);
    this.panel.onclick = null;
    this.language.destroy();
    this.root.remove();
  }
}
