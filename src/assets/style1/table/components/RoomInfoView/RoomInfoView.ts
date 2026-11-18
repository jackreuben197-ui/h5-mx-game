import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { componentBox } from '../../ComponentBox.js';
import { element } from '../../dom.js';
import config from './config.json';
import './layout.css';

export interface RoomInfoContent {
  compact: boolean;
  name: string;
  game: string;
  id: string;
  details: string[];
  legacy: string[];
}

/** Three fixed lines with an overflow-only ticker; legacy tables retain their original text. */
export class RoomInfoView {
  readonly root = componentBox(element('button', 'mx-room-info'), config);
  private heading = element('span', 'mx-room-info-heading');
  private name = element('span', 'mx-room-info-name');
  private game = element('span', 'mx-room-info-game');
  private id = element('span', 'mx-room-info-id');
  private details = element('span', 'mx-room-info-details');
  private track = element('span', 'mx-room-info-track');
  private text = element('span', 'mx-room-info-text');
  private repeat = element('span', 'mx-room-info-repeat');
  private read?: () => RoomInfoContent;
  private compact = false;
  private frame = 0;
  private animation?: Animation;
  private scrollKey = '';
  private observer = new ResizeObserver(() => this.queueLayout());

  constructor() {
    this.root.type = 'button';
    this.repeat.setAttribute('aria-hidden', 'true');
    this.repeat.hidden = true;
    this.heading.append(this.name, this.game);
    this.track.append(this.text, this.repeat);
    this.details.append(this.track);
    this.observer.observe(this.details);
    this.observer.observe(this.text);
    i18nMgr.register(this);
  }

  render(read: () => RoomInfoContent): void {
    this.read = read;
    this.refreshLanguage();
  }

  refreshLanguage(): void {
    if (!this.read) return;
    const content = this.read();
    if (this.compact !== content.compact) {
      this.compact = content.compact;
      this.root.classList.toggle('mx-room-info-compact', this.compact);
      this.stop();
      if (this.compact) this.root.replaceChildren(this.heading, this.id, this.details);
    }
    if (!this.compact) {
      this.setText(this.root, content.legacy.join('\n'));
      this.root.removeAttribute('aria-label');
      return;
    }
    this.setText(this.name, content.name.replace(/\s+/g, ' ').trim());
    this.setText(this.game, content.game);
    this.setText(this.id, content.id);
    const details = content.details.map(value => value.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ');
    this.setText(this.text, details);
    this.setText(this.repeat, details);
    this.root.setAttribute('aria-label', `${content.name} ${content.game}\n${content.id}\n${details}`);
    this.queueLayout();
  }

  private setText(node: HTMLElement, value: string): void {
    if (node.textContent !== value) node.textContent = value;
  }

  private queueLayout(): void {
    if (!this.read || !this.compact || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const width = this.details.clientWidth, textWidth = this.text.offsetWidth;
      if (!width || textWidth <= width) { this.stop(); return; }
      const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
      const distance = textWidth + gap;
      // Live counters can change every second without restarting the ticker's delay.
      const key = `${width}:${distance}`;
      if (key === this.scrollKey) return;
      const elapsed = this.animation?.currentTime;
      this.stop();
      this.scrollKey = key;
      this.repeat.hidden = false;
      this.animation = this.track.animate([
        { transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` },
      ], { duration: distance / config.layout.scrollSpeed * 1000,
        delay: config.layout.scrollDelayMs, iterations: Infinity, easing: 'linear' });
      if (typeof elapsed === 'number') this.animation.currentTime = elapsed;
    });
  }

  private stop(): void {
    this.animation?.cancel();
    this.animation = undefined;
    this.scrollKey = '';
    this.repeat.hidden = true;
  }

  destroy(): void {
    this.read = undefined;
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
    this.stop();
    this.root.remove();
  }
}
