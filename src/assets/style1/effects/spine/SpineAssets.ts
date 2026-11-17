import winAtlas from '../../resources/spine/win/skeleton.atlas?raw';
import winJson from '../../resources/spine/win/skeleton.json?raw';
import winImage from '../../resources/spine/win/skeleton.png?url';
import selfAtlas from '../../resources/spine/allin-self/skeleton.atlas?raw';
import selfBinary from '../../resources/spine/allin-self/skeleton.skel?url';
import selfImage from '../../resources/spine/allin-self/skeleton.png?url';
import otherAtlas from '../../resources/spine/allin-other/skeleton.atlas?raw';
import otherBinary from '../../resources/spine/allin-other/skeleton.skel?url';
import otherImage from '../../resources/spine/allin-other/skeleton.png?url';
import type { SeatEffect } from '../SeatEffects.js';
export interface SpineAsset { atlas: string; data: string | Uint8Array; image: HTMLImageElement; }
/** Original CC atlases stay intact; URL imports also work with hashed build assets. */
export class SpineAssets {
  private static pending?: Promise<Map<SeatEffect, SpineAsset>>;
  static load(): Promise<Map<SeatEffect, SpineAsset>> {
    return this.pending ??= this.read().catch(error => { this.pending = undefined; throw error; });
  }
  private static async read(): Promise<Map<SeatEffect, SpineAsset>> {
    const binary = async (url: string) => {
      const response = await fetch(new URL(url, import.meta.url), { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Spine resource HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    };
    const [win, self, other, selfData, otherData] = await Promise.all([
      this.image(winImage), this.image(selfImage), this.image(otherImage), binary(selfBinary), binary(otherBinary),
    ]);
    return new Map<SeatEffect, SpineAsset>([
      ['win', { atlas: winAtlas, data: winJson, image: win }],
      ['allin-self', { atlas: selfAtlas, data: selfData, image: self }],
      ['allin-other', { atlas: otherAtlas, data: otherData, image: other }],
    ]);
  }
  private static image(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const timer = setTimeout(() => { image.src = ''; reject(new Error('Spine image timeout')); }, 15000);
      image.onload = () => { clearTimeout(timer); image.decode().then(() => resolve(image), reject); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Spine image load failed')); };
      image.src = new URL(url, import.meta.url).href;
    });
  }
}
