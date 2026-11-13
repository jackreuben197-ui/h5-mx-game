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
  userRid?: number;
  sex?: number;
  name: string;
  chips: number;
  avatar?: string;
  roundBet?: number;
  folded?: boolean;
  /** CC all-in odds in hundredths of a percent, supplied by the server. */
  winPercent100?: number;
  insuranceDeadline?: number;
  inMushroom?: boolean;
  costMushroom?: number;
  squidCount?:number; squidIn?:boolean; squidEscaped?:boolean;
  canPlayStatus?: number;
  isAutoop?: boolean;
  keepSeatDeadline?: number;
  keepSeatReason?: number;
  roundActioned?: boolean;
  showCardsSelection?: readonly number[];
  cards: readonly number[];
  action: string;
}
export type Action = 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'straddle';
/** Normalized UI amounts are chips to commit NOW, not a protocol round-total. */
export interface BettingTurn {
  id: string;
  call: number;
  min: number;
  max: number;
  step: number;
  allIn?: number;
  straddle?: number;
}
export interface SeatCountdown { seat: number; deadline: number; totalTime: number; }
export interface TableSnapshot {
  /** Protocol HAND_END, used to clear persistent per-hand presentation. */
  handEnded?: boolean;
  watch?: { peek: boolean; reveal: boolean; peekCost?: number; revealCost?: number; revealFree?: boolean; privateUc?: boolean };
  roomID: number;
  matchID: number;
  handNum: number;
  /** Adapter-local ordered revision; NOT a presumed existing wire protocol field. */
  revision: number;
  presentation?: 'sync' | 'live' | 'deal';
  dealOrder?: readonly number[];
  dealerSeat?: number;
  name: string;
  roomLogo?: string;
  antiCheatType?: number;
  players: readonly Player[];
  community: readonly number[];
  secondCommunity?: readonly number[];
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
  roundBet?: number;
  canAddTime?: boolean;
  addTimeCost?: number;
  privateUc?: boolean;
  delayTimes?: number;
  willStandup?: boolean;
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
  getSpecialOperations?(): import('./RoomRecords.js').SpecialOperations;
  getEmojis?(): RoomEmojis | undefined;
  getRecords?(): RoomRecords | undefined;
  showRules?(target: RoomTarget, insurance: boolean): void;
  storeChips?(target: RoomTarget, amount: number, signal: AbortSignal): Promise<void>;
  keepSeat?(target: RoomTarget, keep: boolean, signal: AbortSignal): Promise<void>;
  addTime?(target: RoomTarget, signal: AbortSignal): Promise<void>;
  agreePost?(target: RoomTarget, signal: AbortSignal): Promise<void>;
  showdown?(target: RoomTarget, cardIndex: number, signal: AbortSignal): Promise<void>;
  agreeSecondPcs?(target: RoomTarget, agree: boolean, signal: AbortSignal): Promise<void>;
  joinSquid?(target:RoomTarget,signal:AbortSignal):Promise<void>;
  buyInsurance?(target: RoomTarget, buyList: import('@silenthill/agreement-web').PotInsuranceBuy.AsObject[], confirm: boolean, signal: AbortSignal): Promise<void>;
  watchSettlement?(target: RoomTarget, kind: 'peek' | 'reveal', signal: AbortSignal): Promise<void>;
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
