import spine from '../../../../effects/spine/vendor/spine38.js';
import type { SpineAsset } from './SpineAssets.js';
import type { SeatEffect, EffectAnchor } from '../SeatEffects.js';
interface Playing {
  kind: SeatEffect; skeleton: spine.Skeleton; state: spine.AnimationState;
  anchor: () => EffectAnchor; elapsed: number; duration: number;
}
/** One transparent WebGL context per table, independent of messages and table data. */
export class SpineRenderer {
  private canvas = document.createElement('canvas');
  private context: spine.webgl.ManagedWebGLRenderingContext;
  private shader: spine.webgl.Shader;
  private batch: spine.webgl.PolygonBatcher;
  private renderer: spine.webgl.SkeletonRenderer;
  private projection = new spine.webgl.Matrix4();
  private data = new Map<SeatEffect, spine.SkeletonData>();
  private textures: spine.webgl.GLTexture[] = [];
  private playing = new Map<string, Playing>();
  private frame = 0;
  private last = 0;
  private lost = false;
  private dead = false;
  private observer: ResizeObserver;
  private visibility = () => { this.last = 0; if (document.hidden) this.cancelFrame(); else this.wake(); };
  private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; this.cancelFrame(); };
  private contextRestored = () => {
    try { this.context.restorables.slice().forEach(resource => resource.restore()); this.lost = false; this.wake(); }
    catch (error) { this.fail(error); }
  };
  constructor(private layer: HTMLElement, assets: Map<SeatEffect, SpineAsset>, private fail: (error: unknown) => void) {
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.effect = 'spine';
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL unavailable for Spine effects');
    this.context = new spine.webgl.ManagedWebGLRenderingContext(gl);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.shader = spine.webgl.Shader.newColoredTextured(this.context);
    this.batch = new spine.webgl.PolygonBatcher(this.context, false);
    this.renderer = new spine.webgl.SkeletonRenderer(this.context, false);
    this.renderer.premultipliedAlpha = false; // Same as the CC seat prefab.
    try {
      for (const [kind, asset] of assets) {
        const texture = new spine.webgl.GLTexture(this.context, asset.image);
        this.textures.push(texture);
        const atlas = new spine.TextureAtlas(asset.atlas, () => texture);
        const loader = new spine.AtlasAttachmentLoader(atlas);
        const data = typeof asset.data === 'string'
          ? new spine.SkeletonJson(loader).readSkeletonData(asset.data)
          : new spine.SkeletonBinary(loader).readSkeletonData(asset.data);
        this.data.set(kind, data);
      }
    } catch (error) { this.textures.forEach(texture => texture.dispose()); this.batch.dispose(); this.shader.dispose(); throw error; }
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestored);
    layer.append(this.canvas);
    this.observer = new ResizeObserver(() => this.wake());
    this.observer.observe(layer);
    document.addEventListener('visibilitychange', this.visibility);
  }
  play(key: string, kind: SeatEffect, anchor: () => EffectAnchor): void {
    const data = this.data.get(kind)!;
    const skeleton = new spine.Skeleton(data);
    const state = new spine.AnimationState(new spine.AnimationStateData(data));
    const track = state.setAnimation(0, 'animation', false);
    state.apply(skeleton);
    this.playing.set(key, { kind, skeleton, state, anchor, elapsed: 0, duration: track.animation.duration });
    this.wake();
  }
  stop(key: string): void { if (this.playing.delete(key)) this.wake(); }
  private wake(): void {
    if (!this.frame && !this.dead && !this.lost && !document.hidden) this.frame = requestAnimationFrame(this.draw);
  }
  private draw = (time: number): void => {
    this.frame = 0;
    if (this.dead || this.lost) return;
    try {
      const rect = this.layer.getBoundingClientRect();
      if (!rect.width || !rect.height) { this.last = 0; return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
      const gl = this.context.gl;
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const dt = this.last ? Math.min((time - this.last) / 1000, 0.1) : 0;
      this.last = time;
      this.projection.ortho(0, rect.width, 0, rect.height, -1, 1);
      this.shader.bind();
      this.shader.setUniformi(spine.webgl.Shader.SAMPLER, 0);
      this.shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, this.projection.values);
      this.batch.begin(this.shader);
      for (const [key, item] of this.playing) {
        item.elapsed += dt;
        if (item.kind === 'win' && item.elapsed >= item.duration) { this.playing.delete(key); continue; }
        const anchor = item.anchor();
        // CC WIN base offset + small DOM adjustment; keep its lower edge overlapping the avatar.
        // Design units: multiply by anchor.scale below so this follows table/seat resizing.
        const winOffsetY = 96.776 + 10;
        const offsetY = item.kind === 'win' ? winOffsetY : item.kind === 'allin-self' ? 400.678 : 142.776;
        const scale = anchor.scale * (item.kind === 'win' ? 0.5 : 1);
        item.skeleton.x = anchor.x - rect.left;
        item.skeleton.y = rect.height - (anchor.y - rect.top) + offsetY * anchor.scale;
        item.skeleton.scaleX = item.skeleton.scaleY = scale;
        item.skeleton.color.a = anchor.opacity;
        // ALLIN keeps its final pose until the seat action clears, just like CC.
        if (item.elapsed - dt < item.duration) item.state.update(Math.min(dt, item.duration - (item.elapsed - dt)));
        item.state.apply(item.skeleton);
        item.skeleton.updateWorldTransform();
        this.renderer.draw(this.batch, item.skeleton);
      }
      this.batch.end();
      if (this.playing.size) this.wake(); else this.last = 0;
    } catch (error) { this.fail(error); }
  };
  private cancelFrame(): void { cancelAnimationFrame(this.frame); this.frame = 0; }
  destroy(): void {
    if (this.dead) return;
    this.dead = true; this.cancelFrame(); this.playing.clear();
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    this.textures.forEach(texture => texture.dispose());
    this.batch.dispose(); this.shader.dispose();
    this.canvas.remove();
    this.context.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
