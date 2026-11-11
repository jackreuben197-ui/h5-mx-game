import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { DiamondModel } from '../data/DiamondModel.js';
import type { PrivateUcChargeStore } from '../data/PrivateUcChargeStore.js';
import type { HistoryQuote } from './HistoryQuote.js';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { ReplayHandData } from '../data/ReplayHandData.js';
import type { TexasReportRoundMode } from '../data/TexasGameRoomDataReport.js';
export interface RoomRecords {
    readonly config: {
        global: GlobalConfigStore;
        diamonds: DiamondModel;
        privateUc: PrivateUcChargeStore;
    };
    readonly data: ProtocolRoomData;
    readonly userRID: number;
    readonly target: {
        roomID: number;
        matchID: number;
    };
    playerStats(userRID: number): Promise<Record<string, number> | null>;
    refreshReport(): Promise<void>;
    jackpot(): Promise<void>;
    insurance(): Promise<void>;
    round(mode: TexasReportRoundMode, round: number): Promise<number>;
    replay(hand: number): Promise<ReplayHandData | null>;
    historyQuote(data: ReplayHandData): Promise<HistoryQuote>;
    peek(data: ReplayHandData): Promise<void>;
    reveal(data: ReplayHandData, round: number): Promise<void>;
    collected(data: ReplayHandData): Promise<boolean>;
    collect(data: ReplayHandData, remove: boolean, change: number): Promise<void>;
}
