import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { UserPropData } from './UserPropData.js';
export interface EmojiBroadcastData { type: number; userID: number; }
/** Room-local equivalent of CC prop list + SeatsStateManager pending emoji/event. */
export class TexasGameRoomDataEmoji extends EventSource {
    static readonly PROP_LIST_CHANGE = 'PROP_LIST_CHANGE';
    static readonly EMOJI = 'EMOJI';
    @observable(TexasGameRoomDataEmoji.PROP_LIST_CHANGE)
    propList: UserPropData[] = [];
    private pending?: EmojiBroadcastData;
    setPendingEmoji(data: EmojiBroadcastData): void { this.pending = data; }
    cancelPendingEmoji(): void { this.pending = undefined; }
    confirmPendingEmoji(status: number, seated: (userID: number) => boolean): void {
        const data = this.pending; this.pending = undefined;
        if (status !== 0 || !data || !seated(data.userID)) return;
        this.emojiEvent(data);
    }
    emojiEvent(data: EmojiBroadcastData): void { this.emit(TexasGameRoomDataEmoji.EMOJI, data); }
    clearData(): void { this.pending = undefined; this.propList = []; }
}
