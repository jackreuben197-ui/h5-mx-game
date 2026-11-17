import config from './config.json';
import { viewportAnchor } from '../../LocalFrame.js';
import type { SeatState } from '../../../../../data/SeatData.js';
import type { SeatEffect, SeatEffects, EffectAnchor } from '../../../effects/SeatEffects.js';

export function seatEffectAnchor(seat: HTMLElement, effect: SeatEffect): EffectAnchor {
  const {x,y}=viewportAnchor(seat);
  // 头像的实测宽度包含牌桌缩放和座位移动时的缩放。
  const avatar=seat.querySelector<HTMLElement>('.mx-avatar-fallback');
  const scale=(avatar?.getBoundingClientRect().width??config.layout.avatarSize)/config.layout.avatarSize;
  const table=seat.closest<HTMLElement>('.mx-table');
  const anchor:EffectAnchor={x,y,scale,opacity:Number(getComputedStyle(seat).opacity)};
  if(effect==='allin-self'&&table?.dataset.tableLayout==='balanced'&&table.dataset.orientation!=='landscape')
    anchor.lift=config.layout.balancedSelfAllInLift*scale;
  return anchor;
}
/** CC SeatPlayer action / WINNER lifecycle, isolated to this seat's subscription. */
export class SeatEffectView {
  private previous?: SeatState;
  private generation = 0;
  private allin = false;
  constructor(private id: number, private root: HTMLElement, private effects?: SeatEffects) {}
  render(state: SeatState): void {
    const old = this.previous;
    this.previous = state;
    if (!this.effects) return;
    if (!state.player || old?.handNum !== state.handNum || old?.mine !== state.mine || old?.player?.userRid !== state.player?.userRid) this.cancel();
    // Once ALLIN is shown, changing round/action fields cannot dismiss its final pose.
    const allin = !!state.player && !state.player.folded && !state.handEnded &&
      (this.allin || state.player.action === '全下');
    if (allin && !this.allin) {
      this.allin = true;
      const generation = ++this.generation;
      const effect = state.mine ? 'allin-self' : 'allin-other';
      void this.effects.play(`${this.id}:allin`, effect, () => seatEffectAnchor(this.root,effect)).then(played => {
        if (generation === this.generation) this.root.classList.toggle('mx-spine-allin', played);
      });
    } else if (!allin && this.allin) {
      this.allin = false; ++this.generation;
      this.effects.stop(`${this.id}:allin`);
      this.root.classList.remove('mx-spine-allin');
    }
    const win = state.player?.settlement?.win;
    if (!win) this.effects.stop(`${this.id}:win`);
    // CC WINNER initIgnore: reconnect / ShowBB / resize must not replay settlement.
    else if (old && state.presentation !== 'sync' && !old.player?.settlement?.win)
      void this.effects.play(`${this.id}:win`, 'win', () => seatEffectAnchor(this.root,'win'));
  }
  cancel(): void {
    ++this.generation; this.allin = false;
    this.effects?.stop(`${this.id}:allin`); this.effects?.stop(`${this.id}:win`);
    this.root.classList.remove('mx-spine-allin');
  }
  destroy(): void { this.cancel(); }
}
