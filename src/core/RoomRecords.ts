import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { DiamondModel } from '../data/DiamondModel.js';
import type { PrivateUcChargeStore } from '../data/PrivateUcChargeStore.js';
import type { HistoryQuote } from './HistoryQuote.js';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { ReplayHandData } from '../data/ReplayHandData.js';
import type { TexasReportRoundMode } from '../data/TexasGameRoomDataReport.js';
import type { PlayerProfile } from './PlayerProfile.js';
/** Shared room data needed by live special operations, independent of history APIs. */
export interface SpecialOperations {
    readonly data: ProtocolRoomData;
    readonly config: Pick<RoomRecords['config'], 'global' | 'diamonds'>;
}
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
    playerProfile(userRID: number): Promise<PlayerProfile | null>;
    peekPlayerProfile?(userRID: number): PlayerProfile | undefined;
    savePlayerRemark(userRID: number, remark: string): Promise<void>;
    playerMuted(userRID: number): Promise<boolean>;
    setPlayerMuted(userRID: number, muted: boolean): Promise<void>;
    managePlayer(userRID: number, action: 'stand' | 'leave'): Promise<void>;
    diamondBalance(): Promise<number>;
    giftDiamonds(userRID: number, amount: number): Promise<void>;
    refreshReport(): Promise<void>;
    jackpot(): Promise<void>;
    openJackpot?():void;
    mttRegistration?():void;
    openMttRecord?():void;
    mttAddOn?():Promise<void>;
    mttAutoOp?(enable:boolean):Promise<void>;
    leaveTable?():void;
    insurance(): Promise<void>;
    round(mode: TexasReportRoundMode, round: number): Promise<number>;
    replay(hand: number): Promise<ReplayHandData | null>;
    historyQuote(data: ReplayHandData): Promise<HistoryQuote>;
    peek(data: ReplayHandData): Promise<void>;
    reveal(data: ReplayHandData, round: number): Promise<void>;
    collected(data: ReplayHandData): Promise<boolean>;
    collect(data: ReplayHandData, remove: boolean, change: number): Promise<void>;
}
