import { componentBox } from '../../ComponentBox.js';
import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import { element } from '../../dom.js';
const panelImage = resourceURL(config.paths.confirmPanel);
/** Shared CC dialog_bg1_fix nine-slice; URLs resolve against MX, not the H5 host. */
export function dialogFrame(): HTMLElement {
  const frame = element('div', 'mx-confirm-frame');
  frame.style.borderImageSource = `url("${panelImage}")`;
  frame.setAttribute('aria-hidden', 'true');
  return frame;
}
/** CC dialog adaptation: preserve content aspect, fit both available dimensions. */
export class DialogSurface {
  readonly root = componentBox(element('div', 'mx-special-dialog mx-dialog-overlay'),config);
  readonly panel = element('section', 'mx-special-panel');
  readonly content = element('div', 'mx-special-content');
  private observer: ResizeObserver;
  constructor(name: string, width: number) {
    this.root.classList.add(name);
    this.panel.style.width = `${width}px`;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.append(dialogFrame(), this.content);
    this.root.append(this.panel);
    this.root.hidden = true;
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(this.root);
    this.observer.observe(this.content);
  }
  fit(): void {
    const style=getComputedStyle(this.panel);
    const verticalMargin=(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
    const scale = Math.min(1, this.root.clientWidth / config.layout.referenceWidth, (this.root.clientWidth - config.layout.edgeGap) / this.panel.offsetWidth, (this.root.clientHeight - config.layout.edgeGap - verticalMargin) / this.panel.offsetHeight);
    if (scale > 0) this.panel.style.transform = `scale(${scale})`;
  }
  show(visible: boolean): void { this.root.hidden = !visible; if (visible) this.fit(); }
  destroy(): void { this.observer.disconnect(); this.root.remove(); }
}
