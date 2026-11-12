import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { UserPropData } from './UserPropData.js';
export interface EmojiBroadcastData { type: number; userID: number; }
export interface ThrowPropBroadcastData { type: number; userID: number; targetUserID: number; }
/** Room-local equivalent of CC prop list + SeatsStateManager pending emoji/event. */
export class TexasGameRoomDataEmoji extends EventSource {
    static readonly PROP_LIST_CHANGE = 'PROP_LIST_CHANGE';
    static readonly EMOJI = 'EMOJI';
    static readonly THROW_PROP = 'THROW_PROP';
    @observable(TexasGameRoomDataEmoji.PROP_LIST_CHANGE)
    propList: UserPropData[] = [];
    private pending?: EmojiBroadcastData;
    private pendingThrow?: ThrowPropBroadcastData;
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
    clearData(): void { this.pending = undefined; this.pendingThrow = undefined; this.propList = []; }
}
