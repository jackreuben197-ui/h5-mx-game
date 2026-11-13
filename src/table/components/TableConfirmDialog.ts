import { i18nLabel } from '../../i18n/i18nLabel.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { element } from '../dom.js';
import { dialogFrame } from './DialogSurface.js';
const confirmTextBg = new URL('../../assets/raw/ui/confirmTextBg.png', import.meta.url).href;
const confirmCancel = new URL('../../assets/raw/ui/confirmCancel.png', import.meta.url).href;

export interface TableConfirmOptions {
  owner: string;
  title?: () => string;
  message: () => string;
  cancel: () => string;
  commit: () => string;
  onCancel: () => void;
  onCommit: () => void;
}

/** One CC UIConfirmDialog surface for table confirmations. */
export class TableConfirmDialog {
  readonly root = element('div', 'mx-table-confirm mx-dialog-overlay');
  private panel = element('section', 'mx-confirm-panel');
  private title = element('h2', 'mx-confirm-title');
  private message = element('p', 'mx-confirm-message');
  private cancel = element('button', 'mx-confirm-cancel');
  private commit = element('button', 'mx-confirm-commit');
  private current?: TableConfirmOptions;

  constructor() {
    const frame = dialogFrame();
    const body = element('div', 'mx-confirm-body');
    const textBg = element('div', 'mx-confirm-text-bg');
    textBg.style.borderImageSource = `url("${confirmTextBg}")`;
    textBg.setAttribute('aria-hidden', 'true');
    const buttons = element('div', 'mx-confirm-buttons');
    body.append(textBg, this.message);
    this.cancel.type = this.commit.type = 'button';
    SpriteAtlas.paintButton(this.cancel,confirmCancel,'91 149 88 143','50.838cqh 83.240cqh 49.162cqh 79.888cqh');
    SpriteAtlas.paint(this.commit, 'dialogConfirm');
    buttons.append(this.cancel, this.commit);
    this.panel.setAttribute('role', 'alertdialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.append(frame, this.title, body, buttons);
    this.root.append(this.panel);
    this.root.hidden = true;
    this.cancel.onclick = () => this.choose('cancel');
    this.commit.onclick = () => this.choose('commit');
    this.root.onclick = event => { if (event.target === this.root) this.close(); };
    this.root.onkeydown = event => {
      if (event.key === 'Escape') { event.stopPropagation(); this.close(); }
    };
  }

  open(options: TableConfirmOptions): void {
    this.current = options;
    this.title.hidden = !options.title;
    if (options.title) i18nLabel.bind(this.title, options.title);
    i18nLabel.bind(this.message, options.message);
    i18nLabel.bind(this.cancel, options.cancel);
    i18nLabel.bind(this.commit, options.commit);
    this.root.hidden = false;
    this.cancel.focus();
  }

  isOpen(owner: string): boolean { return !this.root.hidden && this.current?.owner === owner; }
  close(owner?: string): void {
    if (owner && this.current?.owner !== owner) return;
    this.current = undefined;
    this.root.hidden = true;
  }

  private choose(kind: 'cancel' | 'commit'): void {
    const action = this.current?.[kind === 'cancel' ? 'onCancel' : 'onCommit'];
    this.close();
    action?.();
  }

  destroy(): void { this.close(); this.root.remove(); }
}
