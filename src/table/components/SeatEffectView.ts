import type { SeatState } from '../../data/SeatData.js';
import type { SeatEffects, EffectAnchor } from '../../effects/SeatEffects.js';
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
      void this.effects.play(`${this.id}:allin`, state.mine ? 'allin-self' : 'allin-other', this.anchor).then(played => {
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
      void this.effects.play(`${this.id}:win`, 'win', this.anchor);
  }
  private anchor = (): EffectAnchor => {
    const rect = this.root.getBoundingClientRect();
    // The avatar is 199 CC design units, including both stage and moving-seat scale.
    const avatar = this.root.querySelector<HTMLElement>('.mx-avatar-fallback');
    return { x: rect.left, y: rect.top, scale: (avatar?.getBoundingClientRect().width ?? 199) / 199,
      opacity: Number(getComputedStyle(this.root).opacity) };
  };
  cancel(): void {
    ++this.generation; this.allin = false;
    this.effects?.stop(`${this.id}:allin`); this.effects?.stop(`${this.id}:win`);
    this.root.classList.remove('mx-spine-allin');
  }
  destroy(): void { this.cancel(); }
}
