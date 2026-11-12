import spine from './vendor/spine38.js';
import { EmojiSpineAssets } from './EmojiSpineAssets.js';
import type { MagicEmojiDefinition } from '../../logic/MagicEmojiConfig.js';
export interface EmojiAnchor { x: number; y: number; scale: number; maxSize?: number; clip?: DOMRectReadOnly; }
interface Bounds { x: number; y: number; size: number; }
interface Playing { skeleton: spine.Skeleton; state: spine.AnimationState; duration: number; elapsed: number; loop: boolean; anchor: () => EmojiAnchor | null; bounds?: Bounds; complete?: (finished: boolean) => void; }
/** One transparent context for all previews or all seat emojis; no game engine dependencies. */
export class EmojiSpineRenderer {
    private canvas = document.createElement('canvas');
    private context: spine.webgl.ManagedWebGLRenderingContext;
    private shader: spine.webgl.Shader;
    private batch: spine.webgl.PolygonBatcher;
    private renderer: spine.webgl.SkeletonRenderer;
    private projection = new spine.webgl.Matrix4();
    private textures: spine.webgl.GLTexture[] = [];
    private data = new Map<string, Promise<spine.SkeletonData>>();
    private bounds = new Map<string, Bounds>();
    private playing = new Map<string, Playing>();
    private tokens = new Map<string, object>();
    private frame = 0;
    private last = 0;
    private dead = false;
    private lost = false;
    private visibility = () => { this.last = 0; if (document.hidden) this.cancelFrame(); else this.wake(); };
    private contextLost = (event: Event) => { event.preventDefault(); this.lost = true; this.cancelFrame(); };
    private contextRestored = () => {
        try { this.context.restorables.slice().forEach(r => r.restore()); this.lost = false; this.wake(); }
        catch (error) { this.fail(error); }
    };
    constructor(private layer: HTMLElement, private fail: (error: unknown) => void) {
        this.canvas.setAttribute('aria-hidden', 'true');
        this.canvas.className = 'mx-emoji-canvas';
        const gl = this.canvas.getContext('webgl', {alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false});
        if (!gl) throw new Error('WebGL unavailable for emoji');
        this.context = new spine.webgl.ManagedWebGLRenderingContext(gl);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        this.shader = spine.webgl.Shader.newColoredTextured(this.context);
        this.batch = new spine.webgl.PolygonBatcher(this.context, false);
        this.renderer = new spine.webgl.SkeletonRenderer(this.context, false);
        this.renderer.premultipliedAlpha = false;
        layer.append(this.canvas);
        this.canvas.addEventListener('webglcontextlost', this.contextLost);
        this.canvas.addEventListener('webglcontextrestored', this.contextRestored);
        document.addEventListener('visibilitychange', this.visibility);
    }
    private load(config: MagicEmojiDefinition): Promise<spine.SkeletonData> {
        let task = this.data.get(config.spine);
        if (!task) {
            task = EmojiSpineAssets.load(config).then(asset => {
                if (this.dead) throw new DOMException('Disposed', 'AbortError');
                const atlas = new spine.TextureAtlas(asset.atlas, name => {
                    const image = asset.images.get(name); if (!image) throw new Error(`Missing emoji texture ${name}`);
                    const texture = new spine.webgl.GLTexture(this.context, image); this.textures.push(texture); return texture;
                });
                return new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(asset.binary);
            }).catch(error => { this.data.delete(config.spine); throw error; });
            this.data.set(config.spine, task);
        }
        return task;
    }
    async play(key: string, config: MagicEmojiDefinition, anchor: () => EmojiAnchor | null, loop = false, fit = false, complete?: (finished: boolean) => void): Promise<boolean> {
        this.stop(key);
        const token = {}; this.tokens.set(key, token);
        const data = await this.load(config);
        if (this.dead || this.tokens.get(key) !== token) return false;
        const skeleton = new spine.Skeleton(data), state = new spine.AnimationState(new spine.AnimationStateData(data));
        const animation = data.findAnimation(config.animation);
        if (!animation) throw new Error(`Missing emoji animation ${config.animation}`);
        state.setAnimation(0, config.animation, loop); state.apply(skeleton);
        this.playing.set(key, {skeleton, state, duration: animation.duration, elapsed: 0, loop, anchor, bounds: fit ? this.measure(data, config) : undefined, complete});
        this.wake(); return true;
    }
    private measure(data: spine.SkeletonData, config: MagicEmojiDefinition): Bounds {
        const key = config.spine + ':' + config.animation, cached = this.bounds.get(key); if (cached) return cached;
        const animation = data.findAnimation(config.animation)!, skeleton = new spine.Skeleton(data), offset = new spine.Vector2(), size = new spine.Vector2();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        // CC UIEmojiItem fits 12 samples, so all frames stay inside the preview tile.
        for (let i = 0; i <= 12; i++) {
            skeleton.setToSetupPose();
            animation.apply(skeleton, 0, animation.duration * i / 12, false, [], 1, spine.MixBlend.replace, spine.MixDirection.mixIn);
            skeleton.updateWorldTransform(); skeleton.getBounds(offset, size, []);
            minX = Math.min(minX, offset.x); minY = Math.min(minY, offset.y); maxX = Math.max(maxX, offset.x + size.x); maxY = Math.max(maxY, offset.y + size.y);
        }
        const result = {x: (minX + maxX) / 2, y: (minY + maxY) / 2, size: Math.max(maxX - minX, maxY - minY, 1)};
        this.bounds.set(key, result); return result;
    }
    stop(key: string, finished = false): void { this.tokens.delete(key); const item = this.playing.get(key); this.playing.delete(key); item?.complete?.(finished); this.wake(); }
    clear(): void { this.tokens.clear(); this.playing.forEach(item => item.complete?.(false)); this.playing.clear(); this.wake(); }
    private wake(): void { if (!this.frame && !this.dead && !this.lost && !document.hidden) this.frame = requestAnimationFrame(this.draw); }
    private draw = (time: number): void => {
        this.frame = 0; if (this.dead || this.lost) return;
        try {
            const rect = this.layer.getBoundingClientRect(); if (!rect.width || !rect.height) { this.last = 0; return; }
            const dpr = Math.min(devicePixelRatio || 1, 2), width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr));
            if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
            const gl = this.context.gl; gl.viewport(0, 0, width, height); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            const dt = this.last ? Math.min((time - this.last) / 1000, .1) : 0; this.last = time;
            this.projection.ortho(0, rect.width, 0, rect.height, -1, 1);
            this.shader.bind(); this.shader.setUniformi(spine.webgl.Shader.SAMPLER, 0); this.shader.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX, this.projection.values);
            for (const [key, item] of this.playing) {
                const anchor = item.anchor();
                item.elapsed += dt;
                if (!anchor || (!item.loop && item.elapsed >= item.duration)) { this.stop(key, !!anchor && item.elapsed >= item.duration); continue; }
                item.state.update(dt); item.state.apply(item.skeleton);
                const scale = item.bounds ? (anchor.maxSize ?? 130) / item.bounds.size : anchor.scale;
                item.skeleton.scaleX = item.skeleton.scaleY = scale;
                item.skeleton.x = anchor.x - rect.left - (item.bounds?.x ?? 0) * scale;
                item.skeleton.y = rect.height - (anchor.y - rect.top) - (item.bounds?.y ?? 0) * scale;
                item.skeleton.updateWorldTransform();
                if (anchor.clip) {
                    const left = Math.max(rect.left, anchor.clip.left), top = Math.max(rect.top, anchor.clip.top), right = Math.min(rect.right, anchor.clip.right), bottom = Math.min(rect.bottom, anchor.clip.bottom);
                    if (right <= left || bottom <= top) continue;
                    gl.enable(gl.SCISSOR_TEST); gl.scissor(Math.round((left - rect.left) * dpr), Math.round((rect.bottom - bottom) * dpr), Math.round((right - left) * dpr), Math.round((bottom - top) * dpr));
                } else gl.disable(gl.SCISSOR_TEST);
                this.batch.begin(this.shader); this.renderer.draw(this.batch, item.skeleton); this.batch.end();
            }
            gl.disable(gl.SCISSOR_TEST);
            if (this.playing.size) this.wake(); else this.last = 0;
        } catch (error) { this.clear(); this.fail(error); }
    };
    private cancelFrame(): void { cancelAnimationFrame(this.frame); this.frame = 0; }
    destroy(): void {
        if (this.dead) return; this.dead = true; this.cancelFrame(); this.clear();
        document.removeEventListener('visibilitychange', this.visibility);
        this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.canvas.removeEventListener('webglcontextrestored', this.contextRestored);
        this.textures.forEach(t => t.dispose()); this.batch.dispose(); this.shader.dispose(); this.canvas.remove();
        this.context.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
}
