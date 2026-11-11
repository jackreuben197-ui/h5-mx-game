import { element } from '../dom.js';
import { decodedImage } from '../resources.js';
import type { DeskSpineRenderer } from '../../effects/spine/DeskSpineRenderer.js';
/** Table-scoped optional background. Stale loads cannot replace the user's latest desk choice. */
export class DeskBackgroundView {
  readonly root = element('div', 'mx-desk-animation');
  private renderer?: DeskSpineRenderer;
  private generation = 0;
  private current = '';
  private dead = false;
  constructor(private scale: () => number) { this.root.hidden = true; }
  static animated(type: number): boolean { return Number.isInteger(type) && type >= 9 && type <= 14; }
  static async preload(type: number): Promise<void> {
    if (!this.animated(type)) return;
    await Promise.all([import('../../effects/spine/DeskSpineRenderer.js'),
      import('../../effects/spine/DeskSpineAssets.js').then(module => module.DeskSpineAssets.load(type))]);
  }
  async show(type: number, url: string): Promise<void> {
    const key = `${type}:${url}`;
    if (this.dead || this.current === key) return;
    this.current = key;
    const generation = ++this.generation;
    this.root.hidden = true;
    this.renderer?.stop();
    if (!DeskBackgroundView.animated(type)) { this.renderer?.destroy(); this.renderer = undefined; return; }
    try {
      const [module, asset, background] = await Promise.all([
        import('../../effects/spine/DeskSpineRenderer.js'),
        import('../../effects/spine/DeskSpineAssets.js').then(module => module.DeskSpineAssets.load(type)),
        decodedImage(url),
      ]);
      if (this.dead || generation !== this.generation) return;
      this.renderer ??= new module.DeskSpineRenderer(this.root, this.scale, error => this.fail(error));
      this.renderer.setAsset(asset, background);
      this.root.dataset.deskType = String(type);
      this.root.hidden = false;
    } catch (error) { if (!this.dead && generation === this.generation) this.fail(error); }
  }
  private fail(error: unknown): void {
    console.warn('[MX Spine] Animated desk unavailable; keeping its static background.', error);
    this.root.hidden = true; this.renderer?.destroy(); this.renderer = undefined; this.current = '';
  }
  destroy(): void {
    this.dead = true; ++this.generation;
    this.renderer?.destroy(); this.renderer = undefined; this.root.remove();
  }
}
