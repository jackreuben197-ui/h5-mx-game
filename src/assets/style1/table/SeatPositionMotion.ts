import type { TableSnapshot } from '../../../core/types.js';
import { MotionScope } from './motion.js';

type Position = { x: number; y: number; scale: number };
import type { SeatPositionMode } from '../../../ui/Components.js';
export type { SeatPositionMode } from '../../../ui/Components.js';

/** CC SeatPlayer.onUpdatePosition: one-second linear fade + backOut move/scale. */
export class SeatPositionMotion {
  private target?: Position;
  private motion = new MotionScope();
  constructor(private root: HTMLElement) {}

  static mode(previous: TableSnapshot | undefined, current: TableSnapshot): SeatPositionMode {
    if (!previous || current.presentation === 'sync' ||
        previous.roomID !== current.roomID || previous.matchID !== current.matchID ||
        previous.seatCount !== current.seatCount) return 'static';
    // SeatedOthers does not rotate the table. Only a new authoritative own seat does.
    return current.mySeat > 0 && current.mySeat !== previous.mySeat ? 'seat' : 'update';
  }

  place(target: Position, mode: SeatPositionMode): void {
    const previous = this.target;
    if (mode === 'update' && previous && previous.x === target.x &&
        previous.y === target.y && previous.scale === target.scale) return;
    this.motion.cancel();
    this.target = { x: target.x, y: target.y, scale: target.scale };
    Object.assign(this.root.style, {
      left: `${target.x}px`, top: `${target.y}px`, transform: `scale(${target.scale})`,
    });
    if (mode !== 'seat' || !previous) return;

    // Sample the CC backOut polynomial instead of approximating it with a bezier.
    // Position/scale overshoot; opacity remains linear from 0 to 255.
    const frames = Array.from({ length: 61 }, (_, i): Keyframe => {
      const t = i / 60, k = t - 1, overshoot = 1.70158;
      const progress = t === 0 ? 0 : t === 1 ? 1 :
        1 + (overshoot + 1) * k * k * k + overshoot * k * k;
      const x = (previous.x - target.x) * (1 - progress);
      const y = (previous.y - target.y) * (1 - progress);
      const scale = previous.scale + (target.scale - previous.scale) * progress;
      return { offset: t, transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: t };
    });
    void this.motion.play(this.root, frames, { duration: 1000, easing: 'linear' });
  }

  cancel(): void { this.motion.cancel(); }
}
