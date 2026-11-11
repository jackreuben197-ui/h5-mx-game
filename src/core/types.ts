import type { RoomEmojis } from './RoomEmojis.js';
import type { RoomRecords } from './RoomRecords.js';
import type { CardEmphasis, SeatSettlement } from './Settlement.js';
import type { BuyInQuote, BuyInSelection } from './Seating.js';
export interface RoomTarget {
  roomID: number;
  matchID: number;
  roomType: number;
  clubID?: number;
  observer?: boolean;
}
export interface Player {
  settlement?: SeatSettlement;
  seat: number;
  name: string;
  chips: number;
  avatar?: string;
  roundBet?: number;
  folded?: boolean;
  cards: readonly number[];
  action: string;
}
export type Action = 'fold' | 'check' | 'call' | 'raise' | 'allin';
/** Normalized UI amounts are chips to commit NOW, not a protocol round-total. */
export interface BettingTurn {
  id: string;
  call: number;
  min: number;
  max: number;
  step: number;
  allIn?: number;
}
export interface SeatCountdown { seat: number; deadline: number; totalTime: number; }
export interface TableSnapshot {
  /** Protocol HAND_END, used to clear persistent per-hand presentation. */
  handEnded?: boolean;
  roomID: number;
  matchID: number;
  handNum: number;
  /** Adapter-local ordered revision; NOT a presumed existing wire protocol field. */
  revision: number;
  presentation?: 'sync' | 'live' | 'deal';
  dealOrder?: readonly number[];
  dealerSeat?: number;
  name: string;
  players: readonly Player[];
  community: readonly number[];
  communityEmphasis?: CardEmphasis;
  interaction?: 'entry-only';
  betting?: BettingTurn;
  pot: number;
  pots?: readonly number[];
  smallBlind?: number;
  showBB?: boolean;
  menu?: { insurance: boolean; retainType: number; retainMinRate: number; storeChips: number; keepingSeat: boolean; keepSeatDuration: number };
  ante?: number;
  uniqueID?: string;
  actingSeat?: number;
  countdowns?: readonly SeatCountdown[];
  mySeat: number;
  seatCount: number;
  actions: readonly Action[];
}
export type TableUpdate =
  | { type: 'closed'; roomID: number; matchID: number; reason: string }
  | { type: 'snapshot'; snapshot: TableSnapshot }
  | {
      type: 'patch';
      roomID: number;
      matchID: number;
      handNum: number;
      revision: number;
      presentation?: 'sync' | 'live';
      changes: Partial<
        Pick<TableSnapshot, 'players' | 'community' | 'pot' | 'actions' | 'betting'>
      >;
    };
export interface RoomHost {
  getEmojis?(): RoomEmojis | undefined;
  getRecords?(): RoomRecords | undefined;
  showRules?(target: RoomTarget, insurance: boolean): void;
  storeChips?(target: RoomTarget, amount: number, signal: AbortSignal): Promise<void>;
  keepSeat?(target: RoomTarget, keep: boolean, signal: AbortSignal): Promise<void>;
  getTableSettings?(): import('../data/GameplayTableSettingData.js').GameplayTableSettingData;
  prepareSeat?(target: RoomTarget, seat: number, signal: AbortSignal): Promise<BuyInQuote>;
  sitDown?(target: RoomTarget, selection: BuyInSelection, signal: AbortSignal): Promise<void>;
  standup?(target: RoomTarget, signal: AbortSignal): Promise<boolean>;
  /** Subscribe BEFORE requesting. Resolve with the authoritative entry snapshot.
   * Buffer/deliver subsequent messages in order. Abort must detach subscriptions.
   * CC reference: Rooms -> eligibility -> EnterRoom -> snapshot.
   * Production adapter owns binary decoding, correlation, reconnect and leave semantics. */
  enter(
    target: RoomTarget,
    signal: AbortSignal,
    receive: (update: TableUpdate) => void,
  ): Promise<TableSnapshot>;
  command(target: RoomTarget, action: Action, signal: AbortSignal, amount?: number): Promise<void>;
}
export type Phase = 'hidden' | 'loading' | 'entering' | 'table' | 'error' | 'destroyed';
export interface ClientState {
  phase: Phase;
  progress: number;
  target: RoomTarget | null;
  table: TableSnapshot | null;
  error: string | null;
}
