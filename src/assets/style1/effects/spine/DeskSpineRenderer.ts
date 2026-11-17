import spine from '../../../../effects/spine/vendor/spine38.js';
import type { SpineAsset } from './SpineAssets.js';
/** Static desk + its looping Spine share a drawing buffer, so additive slots blend onto the actual desk. */
export class DeskSpineRenderer {
  private canvas = document.createElement('canvas');
  private context: spine.webgl.ManagedWebGLRenderingContext;
  private scene: spine.webgl.SceneRenderer;
  private textures: spine.webgl.GLTexture[] = [];
  private skeleton?: spine.Skeleton;
  private animation?: spine.AnimationState;
  private frame = 0;
  private last = 0;
  private lost = false;
  private stopped = true;
  private dead = false;
  private observer: ResizeObserver;
  private visibility = () => { this.last = 0; if (document.hidden) this.cancelFrame(); else this.wake(); };
  private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; this.cancelFrame(); };
  private contextRestored = () => {
    try { this.context.restorables.slice().forEach(item => item.restore()); this.lost = false; this.wake(); }
    catch (error) { this.fail(error); }
  };
  constructor(private layer: HTMLElement, private scale: () => number, private fail: (error: unknown) => void) {
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.effect = 'desk-spine';
    const gl = this.canvas.getContext('webgl', { alpha:true, premultipliedAlpha:true, antialias:false, depth:false, stencil:false });
    if (!gl) throw new Error('WebGL unavailable for animated desk');
    this.context = new spine.webgl.ManagedWebGLRenderingContext(gl);
    this.scene = new spine.webgl.SceneRenderer(this.canvas, this.context, false);
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    this.canvas.addEventListener('webglcontextrestored', this.contextRestored);
    this.layer.append(this.canvas);
    this.observer = new ResizeObserver(() => this.wake());
    this.observer.observe(layer);
    document.addEventListener('visibilitychange', this.visibility);
  }
  setAsset(asset: SpineAsset, background: HTMLImageElement): void {
    const next: spine.webgl.GLTexture[] = [];
    const maxTextureSize = this.context.gl.getParameter(this.context.gl.MAX_TEXTURE_SIZE) as number;
    if ([background, asset.image].some(image => image.width > maxTextureSize || image.height > maxTextureSize))
      throw new Error(`Animated desk exceeds GPU texture size ${maxTextureSize}`);
    try {
      // CC's desk PNGs already contain premultiplied colors. Do not premultiply them twice on upload.
      this.context.gl.pixelStorei(this.context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      next.push(new spine.webgl.GLTexture(this.context, background));
      const texture = new spine.webgl.GLTexture(this.context, asset.image);
      next.push(texture);
      const atlas = new spine.TextureAtlas(asset.atlas, () => texture);
      const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(asset.data as Uint8Array);
      const skeleton = new spine.Skeleton(data);
      const animation = new spine.AnimationState(new spine.AnimationStateData(data));
      animation.setAnimation(0, 'animation', true);
      animation.apply(skeleton);
      this.textures.forEach(item => item.dispose());
      this.textures = next; this.skeleton = skeleton; this.animation = animation;
      this.stopped = false; this.last = 0; this.wake();
    } catch (error) { next.forEach(item => item.dispose()); throw error; }
  }
  stop(): void { this.stopped = true; this.last = 0; this.cancelFrame(); }
  private cancelFrame(): void { cancelAnimationFrame(this.frame); this.frame = 0; }
  private wake(): void {
    if (!this.frame && !this.dead && !this.stopped && !this.lost && !document.hidden)
      this.frame = requestAnimationFrame(this.draw);
  }
  private draw = (time: number): void => {
    this.frame = 0;
    if (this.dead || this.stopped || this.lost || !this.skeleton || !this.animation) return;
    // The background is capped at 30 fps; foreground WIN / ALLIN retain their own rate.
    if (this.last && time - this.last < 1000 / 30 - 1) { this.wake(); return; }
    try {
      const rect = this.layer.getBoundingClientRect();
      if (!rect.width || !rect.height) { this.last = 0; return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
      const gl = this.context.gl;
      gl.viewport(0, 0, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const dt = this.last ? Math.min((time - this.last) / 1000, 0.1) : 0;
      this.last = time;
      // CC sp_table_bg Widget fills the room; its Spine child stays centered at (0,0), scale 1.
      // Use the same design-unit scale as seats, with no nonuniform skeleton stretching.
      const unit = Math.max(0.001, this.scale());
      const w = rect.width / unit, h = rect.height / unit;
      this.scene.camera.setViewport(w, h);
      this.animation.update(dt); this.animation.apply(this.skeleton); this.skeleton.updateWorldTransform();
      this.scene.begin();
      this.scene.batcher.setBlendMode(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.scene.drawTexture(this.textures[0]!, -w/2, -h/2, w, h);
      this.scene.drawSkeleton(this.skeleton, true); // UIRoomTexas.bgAnim.premultipliedAlpha
      this.scene.end();
      this.wake();
    } catch (error) { this.fail(error); }
  };
  destroy(): void {
    if (this.dead) return;
    this.dead = true; this.stop(); this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    this.textures.forEach(item => item.dispose()); this.textures = [];
    this.scene.dispose(); this.canvas.remove();
    this.context.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
