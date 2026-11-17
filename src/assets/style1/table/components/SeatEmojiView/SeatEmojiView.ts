import { componentBox } from '../../ComponentBox.js';
import viewConfig from './config.json';
import type { RoomEmojis } from '../../../../../core/RoomEmojis.js';
import type { EmojiSpineRenderer } from '../../../effects/spine/EmojiSpineRenderer.js';
import type { DiamondGiftEffect } from '../../../effects/DiamondGiftEffect.js';
import { ThrowPropSpinePlayer } from '../../../effects/spine/ThrowPropSpinePlayer.js';
import { TexasGameRoomDataEmoji, type EmojiBroadcastData, type ThrowPropBroadcastData, type DiamondGiftBroadcastData } from '../../../../../data/TexasGameRoomDataEmoji.js';
import MagicEmojiConfig from '../../../../../logic/MagicEmojiConfig.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import type { TableSound } from '../../../audio/TableSound.js';
import { element } from '../../dom.js';
/** CC ThrowPropManager.playEmoji: one shot above sender avatar, replace per user, clear on leave. */
export class SeatEmojiView {
    readonly root = componentBox(element('div', 'mx-seat-emoji-layer'),viewConfig);
    private bindings = new BindingScope(this);
    private renderer?: EmojiSpineRenderer;
    private pending?: Promise<EmojiSpineRenderer>;
    private dead = false;
    private active = new Map<number, object>();
    private sounds = new Map<number, () => void>();
    private propPlayer?: ThrowPropSpinePlayer;
    private diamond?: DiamondGiftEffect;
    private diamondPending?: Promise<DiamondGiftEffect>;
    constructor(private service: RoomEmojis, private avatar: (userRID:number)=>HTMLElement|null, private sound: TableSound) {
        this.bindings.bind({emoji: service.data});
        if(!service.config.isChannelDiamondFreeMode)
            void import('../../../effects/DiamondGiftEffect.js').then(({DiamondGiftEffect})=>DiamondGiftEffect.preload()).catch(()=>undefined);
    }
    @bindEvent(TexasGameRoomDataEmoji.EMOJI, {dataSource: 'emoji', initIgnore: true})
    private onEmoji(data: EmojiBroadcastData): void { void this.play(data); }
    @bindEvent(TexasGameRoomDataEmoji.THROW_PROP, {dataSource: 'emoji', initIgnore: true})
    private onThrowProp(data: ThrowPropBroadcastData): void { void this.playProp(data); }
    @bindEvent(TexasGameRoomDataEmoji.DIAMOND_GIFT, {dataSource:'emoji',initIgnore:true})
    private onDiamondGift(data: DiamondGiftBroadcastData): void {
        if(this.service.config.isChannelDiamondFreeMode)return;
        void this.getDiamond().then(effect=>effect.play(data)).catch(error=>{if(!this.dead)console.warn('[MX diamond] animation failed',error);});
    }
    private getDiamond():Promise<DiamondGiftEffect>{
        return this.diamondPending ??= import('../../../effects/DiamondGiftEffect.js').then(({DiamondGiftEffect})=>{
            if(this.dead)throw new DOMException('Disposed','AbortError');
            return this.diamond=new DiamondGiftEffect(this.root,this.avatar,()=>this.getRenderer());
        }).catch(error=>{this.diamondPending=undefined;throw error;});
    }
    private async getRenderer(): Promise<EmojiSpineRenderer> {
        return this.pending ??= import('../../../effects/spine/EmojiSpineRenderer.js').then(({EmojiSpineRenderer}) => {
            if (this.dead) throw new DOMException('Disposed', 'AbortError');
            return this.renderer = new EmojiSpineRenderer(this.root, error => console.warn('[MX effect]', error));
        }).catch(error => {this.pending = undefined;throw error;});
    }
    private async playProp(data: ThrowPropBroadcastData): Promise<void> {
        if (!this.service.seatForUser(data.userID) || !this.service.seatForUser(data.targetUserID)) return;
        try {
            const renderer = await this.getRenderer(); if (this.dead) return;
            this.propPlayer ??= new ThrowPropSpinePlayer(renderer,this.sound,userRID => {
                const avatar = this.avatar(userRID);
                if (!avatar) return null;
                const r = avatar.getBoundingClientRect(), frame = this.root.getBoundingClientRect();
                const scale = frame.width / frame.height > viewConfig.layout.wideRatio ? frame.height / viewConfig.layout.screenHeight : frame.width / viewConfig.layout.screenWidth;
                return {x:r.left+r.width/2,y:r.top+r.height/2,scale};
            },() => {const r = this.root.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,scale:r.width/r.height > viewConfig.layout.wideRatio ? r.height/viewConfig.layout.screenHeight : r.width/viewConfig.layout.screenWidth};},this.service.userRID,error => console.warn('[MX prop]',error));
            this.propPlayer.play(data);
        } catch (error) {if (!this.dead) console.warn('[MX prop] load failed',error);}
    }
    private async play(data: EmojiBroadcastData): Promise<void> {
        const config = MagicEmojiConfig.getByType(data.type); if (!config) return;
        const token = {}; this.active.set(data.userID, token);
        this.sounds.get(data.userID)?.(); this.sounds.delete(data.userID);
        try {
            const renderer = await this.getRenderer();
            if (this.dead || this.active.get(data.userID) !== token) return;
            const played = await renderer.play(String(data.userID), config, () => {
                const seat = this.service.seatForUser(data.userID);
                if (!seat || this.active.get(data.userID) !== token) return null;
                const avatar = this.avatar(data.userID);
                if (!avatar) return null;
                const r = avatar.getBoundingClientRect();
                return {x: r.left + r.width / 2, y: r.top + r.height / 4, scale: r.width / viewConfig.layout.avatarSize};
            }, false, false, () => {
                if (this.active.get(data.userID) !== token) return;
                this.active.delete(data.userID); this.sounds.get(data.userID)?.(); this.sounds.delete(data.userID);
            });
            if (played && this.active.get(data.userID) === token) {
                const {EmojiSpineAssets} = await import('../../../effects/spine/EmojiSpineAssets.js');
                if (!this.dead && this.active.get(data.userID) === token) this.sounds.set(data.userID, this.sound.playExternalEffect(EmojiSpineAssets.sound(config)));
            }
        } catch (error) { if (!this.dead) console.warn('[MX emoji] animation load failed', error); }
    }
    destroy(): void { this.dead = true; this.bindings.destroy(); this.active.clear(); this.sounds.forEach(stop => stop()); this.sounds.clear(); this.propPlayer?.destroy(); this.diamond?.destroy(); this.renderer?.destroy(); this.root.remove(); }
}
