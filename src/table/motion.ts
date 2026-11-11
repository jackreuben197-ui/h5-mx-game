// CC tween timings: SeatPlayer 0.2s order / 0.5s deal / 0.8s fold;
// CardView 0.6s flip + 0.05s squash + 0.05s restore.
export const motion = {
  order: 200,
  deal: 500,
  fold: 800,
  spread: 600,
  flip: 600,
  bounce: 50,
} as const;
export const easing = {
  out: 'cubic-bezier(.215,.61,.355,1)',
  inOut: 'cubic-bezier(.645,.045,.355,1)',
  in: 'cubic-bezier(.55,.055,.675,.19)',
};
export class MotionScope {
  private animations = new Set<Animation>();
  private cleanups = new Set<() => void>();
  private generation = 0;
  get version() {
    return this.generation;
  }
  reduced() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  cleanup(fn: () => void): () => void {
    this.cleanups.add(fn);
    return () => {
      this.cleanups.delete(fn);
      fn();
    };
  }
  async play(
    node: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ): Promise<boolean> {
    const version = this.generation;
    if (this.reduced()) return true;
    const animation = node.animate(frames, { fill: 'backwards', ...options });
    this.animations.add(animation);
    try {
      await animation.finished;
      return version === this.generation;
    } catch {
      return false;
    } finally {
      this.animations.delete(animation);
      animation.cancel();
    }
  }
  cancel() {
    this.generation++;
    this.animations.forEach((a) => a.cancel());
    this.animations.clear();
    this.cleanups.forEach((fn) => fn());
    this.cleanups.clear();
  }
}
