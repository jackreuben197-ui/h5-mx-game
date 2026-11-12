import type { MagicEmojiDefinition } from '../../logic/MagicEmojiConfig.js';
export interface EmojiSpineAsset { atlas: string; binary: Uint8Array; images: Map<string, HTMLImageElement>; }
/** Original multi-page Spine atlases, loaded per category/effect; Vite hashes URLs at build. */
export class EmojiSpineAssets {
    private static urls = import.meta.glob<string>(['../../assets/spine/emoji/**/*', '../../assets/audio/emoji/**/*', '../../assets/spine/prop/**/*', '../../assets/audio/prop/**/*'], {eager: true, query: '?url', import: 'default'});
    private static pending = new Map<string, Promise<EmojiSpineAsset>>();
    static url(path: string): string {
        const url = this.urls[`../../assets/${path}`];
        if (!url) throw new Error(`Missing emoji asset: ${path}`);
        return new URL(url, import.meta.url).href;
    }
    static sound(config: MagicEmojiDefinition): string { return this.url(`audio/emoji/${config.sound.split('/').at(-1)}.mp3`); }
    static load(config: MagicEmojiDefinition): Promise<EmojiSpineAsset> {
        let pending = this.pending.get(config.spine);
        if (!pending) {
            pending = this.read(config).catch(error => { this.pending.delete(config.spine); throw error; });
            this.pending.set(config.spine, pending);
        }
        return pending;
    }
    private static async read(config: MagicEmojiDefinition): Promise<EmojiSpineAsset> {
        const path = `spine/${config.assetGroup || 'emoji'}/${config.spine.split('/').slice(-2).join('/')}`;
        const read = async (suffix: string) => {
            const response = await fetch(this.url(path + suffix), {signal: AbortSignal.timeout(15000)});
            if (!response.ok) throw new Error(`Emoji resource HTTP ${response.status}`);
            return response;
        };
        const [atlas, binary] = await Promise.all([read('.atlas').then(r => r.text()), read('.skel').then(r => r.arrayBuffer())]);
        const names = [...atlas.matchAll(/^([^\r\n]+\.png)\s*$/gm)].map(m => m[1]!.trim());
        const images = new Map<string, HTMLImageElement>();
        await Promise.all(names.map(async name => {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image(); img.crossOrigin = 'anonymous';
                const timer = setTimeout(() => { img.src = ''; reject(new Error('Emoji texture timeout')); }, 15000);
                img.onload = () => { clearTimeout(timer); img.decode().then(() => resolve(img), reject); };
                img.onerror = () => { clearTimeout(timer); reject(new Error('Emoji texture failed')); };
                img.src = this.url(`${path.slice(0, path.lastIndexOf('/') + 1)}${name}`);
            });
            images.set(name, image);
        }));
        return {atlas, binary: new Uint8Array(binary), images};
    }
}
