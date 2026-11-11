import type { SeatEffect, SeatEffects, EffectAnchor } from './SeatEffects.js';
import type { SpineRenderer } from './spine/SpineRenderer.js';
/** Table-scoped adapter; the rest of the UI never imports Spine runtime types. */
export class SpineEffects implements SeatEffects {
  private renderer?: SpineRenderer;
  private pending?: Promise<SpineRenderer | undefined>;
  private requests = new Map<string, object>();
  private dead = false;
  private failed = false;
  constructor(private layer: HTMLElement) {}
  static async preload(): Promise<void> {
    await Promise.all([import('./spine/SpineRenderer.js'), import('./spine/SpineAssets.js').then(module => module.SpineAssets.load())]);
  }
  async play(key: string, effect: SeatEffect, anchor: () => EffectAnchor): Promise<boolean> {
    const request = {};
    this.requests.set(key, request);
    const renderer = await this.ready();
    if (!renderer || this.dead || this.requests.get(key) !== request) return false;
    renderer.play(key, effect, anchor);
    return true;
  }
  stop(key: string): void { this.requests.delete(key); this.renderer?.stop(key); }
  private ready(): Promise<SpineRenderer | undefined> {
    if (this.failed || this.dead) return Promise.resolve(undefined);
    return this.pending ??= Promise.all([import('./spine/SpineRenderer.js'), import('./spine/SpineAssets.js').then(module => module.SpineAssets.load())])
      .then(([module, assets]) => {
        if (this.dead) return undefined;
        return this.renderer = new module.SpineRenderer(this.layer, assets, error => this.fail(error));
      }).catch(error => { this.fail(error); return undefined; });
  }
  private fail(error: unknown): void {
    this.failed = true;
    this.layer.dataset.spineFailed = 'true';
    console.warn('[MX Spine] Effects unavailable; table remains usable.', error);
    this.renderer?.destroy(); this.renderer = undefined;
    this.layer.closest('.mx-table')?.querySelectorAll('.mx-spine-allin').forEach(node => node.classList.remove('mx-spine-allin'));
  }
  destroy(): void { this.dead = true; this.requests.clear(); this.renderer?.destroy(); this.renderer = undefined; }
}
