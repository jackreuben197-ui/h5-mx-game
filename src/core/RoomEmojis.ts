import type { TexasGameRoomDataEmoji } from '../data/TexasGameRoomDataEmoji.js';
import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { UserPropData } from '../data/UserPropData.js';
export interface RoomEmojis {
    readonly data: TexasGameRoomDataEmoji;
    readonly config: GlobalConfigStore;
    canSend(): boolean;
    seatForUser(userID: number): number | undefined;
    refresh(): Promise<void>;
    send(prop: UserPropData): Promise<void>;
}
