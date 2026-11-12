export interface BuyInWallet { club_id: number; gold: number; club_name: string; club_random_id?: number; club_logo?: string; }
export interface BuyInQuote {
  mode?: 'sit' | 'add';
  id: number; seat: number; roomName: string; smallBlind: number;
  min: number; max: number; step: number; wallets: BuyInWallet[];
  returnOrNew: number;
  deposit?: number;
  returnAmount?: number; returnClubID?: number; canAuto: boolean;
  autoReturn?: boolean;
  security: { ip: boolean; gps: boolean; delay: boolean; media: boolean };
}
export interface BuyInSelection { quoteID: number; amount: number; clubID: number; autoAmount: number; }
export interface SeatingActions {
  settings?: import('../data/GameplayTableSettingData.js').GameplayTableSettingData;
  prepare(seat: number): Promise<BuyInQuote>;
  submit(selection: BuyInSelection): Promise<void>;
  standup(): Promise<boolean>;
  rules?(insurance: boolean): void;
  storeChips?(amount: number): Promise<void>;
  keepSeat?(keep: boolean): Promise<void>;
  addTime?(): Promise<void>;
  agreePost?(): Promise<void>;
  showdown?(cardIndex: number): Promise<void>;
  watchSettlement?(kind: 'peek' | 'reveal'): Promise<void>;
}
