import type { RoomEmojis } from '../../core/RoomEmojis.js';
import type { EmojiSpineRenderer } from '../../effects/spine/EmojiSpineRenderer.js';
import { TexasGameRoomDataEmoji, type EmojiBroadcastData } from '../../data/TexasGameRoomDataEmoji.js';
import MagicEmojiConfig from '../../logic/MagicEmojiConfig.js';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import type { TableSound } from '../../audio/TableSound.js';
import { element } from '../dom.js';
/** CC ThrowPropManager.playEmoji: one shot above sender avatar, replace per user, clear on leave. */
export class SeatEmojiView {
    readonly root = element('div', 'mx-seat-emoji-layer');
    private bindings = new BindingScope(this);
    private renderer?: EmojiSpineRenderer;
    private pending?: Promise<EmojiSpineRenderer>;
    private dead = false;
    private active = new Map<number, object>();
    private sounds = new Map<number, () => void>();
    constructor(private service: RoomEmojis, private table: HTMLElement, private sound: TableSound) { this.bindings.bind({emoji: service.data}); }
    @bindEvent(TexasGameRoomDataEmoji.EMOJI, {dataSource: 'emoji', initIgnore: true})
    private onEmoji(data: EmojiBroadcastData): void { void this.play(data); }
    private async play(data: EmojiBroadcastData): Promise<void> {
        const config = MagicEmojiConfig.getByType(data.type); if (!config) return;
        const token = {}; this.active.set(data.userID, token);
        this.sounds.get(data.userID)?.(); this.sounds.delete(data.userID);
        try {
            const renderer = await (this.pending ??= import('../../effects/spine/EmojiSpineRenderer.js').then(({EmojiSpineRenderer}) => {
                if (this.dead) throw new DOMException('Disposed', 'AbortError');
                return this.renderer = new EmojiSpineRenderer(this.root, error => console.warn('[MX emoji]', error));
            }).catch(error => { this.pending = undefined; throw error; }));
            if (this.dead || this.active.get(data.userID) !== token) return;
            const played = await renderer.play(String(data.userID), config, () => {
                const seat = this.service.seatForUser(data.userID);
                if (!seat || this.active.get(data.userID) !== token) return null;
                const avatar = this.table.querySelector<HTMLElement>(`.mx-seat[data-seat="${seat}"] .mx-avatar-fallback`);
                if (!avatar) return null;
                const r = avatar.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height / 4, scale: r.width / 199};
            }, false, false, () => {
                if (this.active.get(data.userID) !== token) return;
                this.active.delete(data.userID); this.sounds.get(data.userID)?.(); this.sounds.delete(data.userID);
            });
            if (played && this.active.get(data.userID) === token) {
                const {EmojiSpineAssets} = await import('../../effects/spine/EmojiSpineAssets.js');
                if (!this.dead && this.active.get(data.userID) === token) this.sounds.set(data.userID, this.sound.playExternalEffect(EmojiSpineAssets.sound(config)));
            }
        } catch (error) { if (!this.dead) console.warn('[MX emoji] animation load failed', error); }
    }
    destroy(): void { this.dead = true; this.bindings.destroy(); this.active.clear(); this.sounds.forEach(stop => stop()); this.sounds.clear(); this.renderer?.destroy(); this.root.remove(); }
}
