import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { UserPropData } from './UserPropData.js';
export interface EmojiBroadcastData { type: number; userID: number; }
export interface ThrowPropBroadcastData { type: number; userID: number; targetUserID: number; }
export interface DiamondGiftBroadcastData { senderID: number; receiverID: number; amount: number; }
/** Room-local equivalent of CC prop list + SeatsStateManager pending emoji/event. */
export class TexasGameRoomDataEmoji extends EventSource {
    static readonly PROP_LIST_CHANGE = 'PROP_LIST_CHANGE';
    static readonly EMOJI = 'EMOJI';
    static readonly THROW_PROP = 'THROW_PROP';
    static readonly DIAMOND_GIFT = 'DIAMOND_GIFT';
    @observable(TexasGameRoomDataEmoji.PROP_LIST_CHANGE)
    propList: UserPropData[] = [];
    private pending?: EmojiBroadcastData;
    private pendingThrow?: ThrowPropBroadcastData;
    private localGifts = new Map<string, number[]>();
    private remoteGifts = new Map<string, number[]>();
    setPendingEmoji(data: EmojiBroadcastData): void { this.pending = data; }
    cancelPendingEmoji(): void { this.pending = undefined; }
    confirmPendingEmoji(status: number, seated: (userID: number) => boolean): void {
        const data = this.pending; this.pending = undefined;
        if (status !== 0 || !data || !seated(data.userID)) return;
        this.emojiEvent(data);
    }
    emojiEvent(data: EmojiBroadcastData): void { this.emit(TexasGameRoomDataEmoji.EMOJI, data); }
    setPendingThrowProp(data: ThrowPropBroadcastData): void { this.pendingThrow = data; }
    cancelPendingThrowProp(): void { this.pendingThrow = undefined; }
    confirmPendingThrowProp(status: number, seated: (userID: number) => boolean): void {
        const data = this.pendingThrow; this.pendingThrow = undefined;
        if (status === 0 && data && seated(data.userID) && seated(data.targetUserID)) this.throwPropEvent(data);
    }
    throwPropEvent(data: ThrowPropBroadcastData): void { this.emit(TexasGameRoomDataEmoji.THROW_PROP, data); }
    diamondGiftEvent(data: DiamondGiftBroadcastData, origin: 'local' | 'remote' = 'remote'): void {
        const key = `${data.senderID}:${data.receiverID}:${data.amount}`;
        const own = origin === 'local' ? this.localGifts : this.remoteGifts;
        const opposite = origin === 'local' ? this.remoteGifts : this.localGifts;
        const now = Date.now();
        const pending = (opposite.get(key) ?? []).filter(time => now - time < 10000);
        if (pending.length) { pending.shift(); if (pending.length) opposite.set(key, pending); else opposite.delete(key); return; }
        own.set(key, [...(own.get(key) ?? []).filter(time => now - time < 10000), now]);
        this.emit(TexasGameRoomDataEmoji.DIAMOND_GIFT, data);
    }
    clearData(): void { this.pending = undefined; this.pendingThrow = undefined; this.localGifts.clear(); this.remoteGifts.clear(); this.propList = []; }
}
