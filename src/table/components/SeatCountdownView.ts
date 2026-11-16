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
  private texture = element('div', 'mx-seat-timer-texture');
  private keepLabel = element('span', 'mx-seat-keep-label');
  private keepSeconds = element('span', 'mx-seat-keep-seconds');
  private points: { x: number; y: number }[] = [];
  private lengths: number[] = [];
  private totalLength = 0;
  private timer?: SeatCountdown;
  private keep = false;
  private frame = 0;
  constructor(private readonly rounded=false) {
    this.root.classList.toggle('mx-seat-timer-rounded',rounded);
    this.root.hidden = true; i18nLabel.bind(this.root, () => i18nMgr.Get("MX_ActionCountdown", [], "操作倒计时"), 'aria-label');
    SpriteAtlas.mask(this.texture, 'timerRing', '#14fd00'); SpriteAtlas.mask(this.handle, 'timerDot', '#14fd00');
    this.ring.append(this.texture);
    this.root.append(this.ring, this.handle, this.keepLabel, this.keepSeconds);
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
  render(timer?: SeatCountdown, keep = false, delayLeave = false): void {
    i18nLabel.bind(this.keepLabel, () => i18nMgr.Get(delayLeave ? 'UIDelayLeave' : 'UITesas_Leave', [], delayLeave ? '暂离' : '留座'));
    if (timer && this.timer?.deadline === timer.deadline && this.timer.totalTime === timer.totalTime && this.keep === keep) return;
    this.stop();
    this.keep = keep;
    this.root.dataset.kind = keep ? 'keep' : 'action';
    if (!timer || timer.totalTime <= 0 || timer.deadline <= Date.now() / 1000) {
      this.ring.hidden = true; this.handle.hidden = true;
      this.keepSeconds.textContent = '';
      this.root.hidden = !keep;
      return;
    }
    this.ring.hidden = false; this.handle.hidden = false;
    const color = keep ? '#0ee3fe' : '#14fd00';
    this.root.style.setProperty('--mx-countdown-color',color);
    this.texture.style.backgroundColor = color;
    this.handle.style.backgroundColor = color;
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
    const table=this.root.closest<HTMLElement>('.mx-table');
    if(this.rounded||(table?.dataset.tableLayout==='balanced'&&table.dataset.orientation!=='landscape')){
      // Match the conic mask ray to the rounded avatar perimeter (199px, 28% radius).
      const angle=ballProgress*Math.PI*2,dx=Math.sin(angle),dy=-Math.cos(angle);
      const half=95.5,radius=51.72,corner=half-radius;
      let distance=half/Math.max(Math.abs(dx),Math.abs(dy));
      if(Math.abs(dx*distance)>corner&&Math.abs(dy*distance)>corner){
        const projection=(Math.abs(dx)+Math.abs(dy))*corner;
        distance=projection+Math.sqrt(Math.max(0,projection*projection-2*corner*corner+radius*radius));
      }
      this.handle.style.transform=`translate(${dx*distance}px, ${dy*distance}px)`;
    }
    this.root.dataset.remaining = String(Math.ceil(remaining));
    if (this.keep) this.keepSeconds.textContent = `${Math.ceil(remaining)}s`;
    this.frame = requestAnimationFrame(this.update);
  };
  stop(): void { cancelAnimationFrame(this.frame); this.frame = 0; this.timer = undefined; this.root.hidden = true; }
  destroy(): void { this.stop(); this.root.remove(); }
}
