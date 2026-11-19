import { element } from '../../dom.js';
import config from './config.json';

/** Scroll only the text inside a nameplate, in the seat's local coordinates. */
export class SeatInfoTicker {
  readonly text = element('span', 'mx-seat-info-text');
  private observer = new ResizeObserver(() => this.refresh());
  private frame = 0;
  private animation?: Animation;
  private value = '';
  private owner = '';
  private distance = 0;
  private destroyed = false;

  constructor(private viewport: HTMLElement, private enabled = () => true) {
    viewport.append(this.text);
    this.observer.observe(viewport);
    this.observer.observe(this.text);
  }

  render(value: string, owner: string, paint = (node: HTMLElement, text: string) => { node.textContent = text; }): void {
    if (value !== this.value || owner !== this.owner) {
      this.stop();
      this.value = value;
      this.owner = owner;
      paint(this.text, value);
    }
    this.refresh();
  }

  refresh(): void {
    if (this.destroyed || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const width = this.viewport.clientWidth;
      const distance = this.text.offsetWidth - width;
      if (!width || distance <= 1 || !this.enabled()) { this.stop(); return; }
      if (this.animation && Math.abs(this.distance - distance) < 1) return;
      this.stop();
      this.distance = distance;
      const travel = distance / config.layout.infoScrollSpeed * 1000;
      const duration = (travel + config.layout.infoScrollDelayMs) * 2;
      const hold = config.layout.infoScrollDelayMs / duration;
      this.animation = this.text.animate([
        { transform: 'translateX(0)', offset: 0 },
        { transform: 'translateX(0)', offset: hold },
        { transform: `translateX(-${distance}px)`, offset: 0.5 },
        { transform: `translateX(-${distance}px)`, offset: 0.5 + hold },
        { transform: 'translateX(0)', offset: 1 },
      ], { duration, iterations: Infinity, easing: 'linear' });
    });
  }

  private stop(): void {
    this.animation?.cancel();
    this.animation = undefined;
    this.distance = 0;
  }

  destroy(): void {
    this.destroyed = true;
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
    this.stop();
  }
}
