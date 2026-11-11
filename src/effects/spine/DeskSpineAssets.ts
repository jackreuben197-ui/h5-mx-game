import atlas9 from '../../assets/spine/desks/9/33background.atlas?raw';
import binary9 from '../../assets/spine/desks/9/33background.skel?url';
import image9 from '../../assets/spine/desks/9/33background.png?url';
import atlas10 from '../../assets/spine/desks/10/44paizuo.atlas?raw';
import binary10 from '../../assets/spine/desks/10/44paizuo.skel?url';
import image10 from '../../assets/spine/desks/10/44paizuo.png?url';
import atlas11 from '../../assets/spine/desks/11/skeleton.atlas?raw';
import binary11 from '../../assets/spine/desks/11/skeleton.skel?url';
import image11 from '../../assets/spine/desks/11/skeleton.png?url';
import atlas12 from '../../assets/spine/desks/12/77Background.atlas?raw';
import binary12 from '../../assets/spine/desks/12/77Background.skel?url';
import image12 from '../../assets/spine/desks/12/77Background.png?url';
import atlas13 from '../../assets/spine/desks/13/nature_japan88.atlas?raw';
import binary13 from '../../assets/spine/desks/13/nature_japan88.skel?url';
import image13 from '../../assets/spine/desks/13/nature_japan88.png?url';
import atlas14 from '../../assets/spine/desks/14/backgroud99.atlas?raw';
import binary14 from '../../assets/spine/desks/14/backgroud99.skel?url';
import image14 from '../../assets/spine/desks/14/backgroud99.png?url';
import type { SpineAsset } from './SpineAssets.js';
/** CC DLTexasRoomBackground: only Table 9–14 have animationPath. Original atlases, no repacking. */
export class DeskSpineAssets {
  private static sources = new Map<number, { atlas: string; binary: string; image: string }>([
    [9, { atlas: atlas9, binary: binary9, image: image9 }],
    [10, { atlas: atlas10, binary: binary10, image: image10 }],
    [11, { atlas: atlas11, binary: binary11, image: image11 }],
    [12, { atlas: atlas12, binary: binary12, image: image12 }],
    [13, { atlas: atlas13, binary: binary13, image: image13 }],
    [14, { atlas: atlas14, binary: binary14, image: image14 }],
  ]);
  // Keep at most two decoded desk animations. Switching through every style must not retain all textures.
  private static cache = new Map<number, Promise<SpineAsset>>();
  static load(type: number): Promise<SpineAsset> {
    const cached = this.cache.get(type);
    if (cached) { this.cache.delete(type); this.cache.set(type, cached); return cached; }
    const source = this.sources.get(type);
    if (!source) return Promise.reject(new Error(`No Spine desk ${type}`));
    const pending = Promise.all([this.binary(source.binary), this.image(source.image)])
      .then(([data, image]) => ({ atlas: source.atlas, data, image }))
      .catch(error => { if (this.cache.get(type) === pending) this.cache.delete(type); throw error; });
    this.cache.set(type, pending);
    while (this.cache.size > 2) this.cache.delete(this.cache.keys().next().value!);
    return pending;
  }
  private static async binary(url: string): Promise<Uint8Array> {
    const response = await fetch(new URL(url, import.meta.url), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Desk Spine HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  private static image(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const timer = setTimeout(() => { image.src = ''; reject(new Error('Desk Spine image timeout')); }, 15000);
      image.onload = () => { clearTimeout(timer); image.decode().then(() => resolve(image), reject); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Desk Spine image load failed')); };
      image.src = new URL(url, import.meta.url).href;
    });
  }
}
