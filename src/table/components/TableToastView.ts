import { element } from '../dom.js';
const toastBackground = new URL('../../assets/raw/ui/toastBg.png', import.meta.url).href;

/** CC ToastNode: brief message over the table, using its original background. */
export class TableToastView {
  readonly root = element('div', 'mx-table-toast');
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  constructor() {
    this.root.hidden = true;
    this.root.setAttribute('role', 'alert');
    this.root.style.borderImageSource = `url("${toastBackground}")`;
  }
  show(error: unknown): void {
    if (this.disposed) return;
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (!message.trim()) return;
    if (this.timer) clearTimeout(this.timer);
    this.root.textContent = message;
    this.root.hidden = false;
    this.root.classList.remove('mx-table-toast-visible');
    void this.root.offsetWidth;
    this.root.classList.add('mx-table-toast-visible');
    // CC: 0.1s buffer + 0.2s enter + 2s stay + 0.3s exit.
    this.timer = setTimeout(() => { this.root.hidden = true; this.timer = undefined; }, 2600);
  }
  setScale(unit: number): void { this.root.style.setProperty('--mx-toast-unit', `${unit}px`); }
  destroy(): void { this.disposed = true; if (this.timer) clearTimeout(this.timer); this.root.remove(); }
}
