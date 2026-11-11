import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import type { SeatCountdown } from '../../core/types.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
/** CC ShiningPathTimer Circle branch: 24 points, 199px track, 8px path thickness.
 * Only cc.Sprite.fillRange/handle positioning become DOM mask/transform.
 */
export class SeatCountdownView {
  readonly root = element('div', 'mx-seat-timer');
  private ring = element('div', 'mx-seat-timer-ring');
  private handle = element('div', 'mx-seat-timer-dot');
  private points: { x: number; y: number }[] = [];
  private lengths: number[] = [];
  private totalLength = 0;
  private timer?: SeatCountdown;
  private frame = 0;
  constructor() {
    this.root.hidden = true; i18nLabel.bind(this.root, () => i18nMgr.Get("MX_ActionCountdown", [], "操作倒计时"), 'aria-label');
    const texture = element('div', 'mx-seat-timer-texture');
    SpriteAtlas.mask(texture, 'timerRing', '#14fd00'); SpriteAtlas.mask(this.handle, 'timerDot', '#14fd00');
    this.ring.append(texture);
    this.root.append(this.ring, this.handle);
    for (let i = 0; i < 24; i++) {
      const radian = (90 - i / 24 * 360) * Math.PI / 180;
      let x = Math.round(Math.cos(radian) * 50 * 100) / 100 * 199 / 100;
      let y = Math.round(Math.sin(radian) * 50 * 100) / 100 * 199 / 100;
      const length = Math.hypot(x, y); x -= x / length * 4; y -= y / length * 4;
      this.points.push({ x, y });
    }
    this.points.push({ ...this.points[0]! });
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i]!, b = this.points[i + 1]!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      this.lengths.push(length); this.totalLength += length;
    }
  }
  render(timer?: SeatCountdown): void {
    if (timer && this.timer?.deadline === timer.deadline && this.timer.totalTime === timer.totalTime) return;
    this.stop();
    if (!timer || timer.totalTime <= 0 || timer.deadline <= Date.now() / 1000) return;
    this.timer = timer; this.root.hidden = false; this.update();
  }
  private update = (): void => {
    if (!this.timer) return;
    const remaining = Math.max(0, this.timer.deadline - Date.now() / 1000);
    if (remaining <= 0) { this.stop(); return; }
    const timeProgress = Math.min(1, remaining / this.timer.totalTime);
    const ballProgress = 1 - timeProgress;
    // CC fill shrinks clockwise from twelve o'clock; original ring texture supplies the glow.
    this.ring.style.maskImage = `conic-gradient(from 0deg, transparent 0deg ${ballProgress * 360}deg, #000 ${ballProgress * 360}deg 360deg)`;
    let target = ballProgress * this.totalLength;
    for (let i = 0; i < this.lengths.length; i++) {
      const length = this.lengths[i]!;
      if (target <= length) {
        const a = this.points[i]!, b = this.points[i + 1]!, progress = target / length;
        const x = a.x + (b.x - a.x) * progress, y = a.y + (b.y - a.y) * progress;
        const angle = -Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        this.handle.style.transform = `translate(${x}px, ${-y}px) rotate(${angle}deg)`;
        break;
      }
      target -= length;
    }
    this.root.dataset.remaining = String(Math.ceil(remaining));
    this.frame = requestAnimationFrame(this.update);
  };
  stop(): void { cancelAnimationFrame(this.frame); this.frame = 0; this.timer = undefined; this.root.hidden = true; }
  destroy(): void { this.stop(); this.root.remove(); }
}
