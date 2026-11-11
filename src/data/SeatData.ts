import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { Player, TableSnapshot, SeatCountdown } from '../core/types.js';
export interface SeatState {
  player?: Player;
  mine: boolean;
  dealer: boolean;
  acting?: boolean;
  countdown?: SeatCountdown;
  smallBlind?: number;
  showBB?: boolean;
  handNum: number;
  handEnded?: boolean;
  presentation: TableSnapshot['presentation'];
  dealIndex: number;
}
export class SeatData extends EventSource {
  static readonly CHANGE = 'seat:change';
  @observable(SeatData.CHANGE) state: SeatState = {
    mine: false,
    dealer: false,
    handNum: 0,
    presentation: 'sync',
    dealIndex: -1,
  };
  constructor(readonly id: number) {
    super();
  }
  replace(table: TableSnapshot): void {
    this.state = {
      player: table.players.find((p) => p.seat === this.id),
      mine: this.id === table.mySeat,
      dealer: this.id === table.dealerSeat,
      acting: this.id === table.actingSeat,
      countdown: table.countdowns?.find(timer => timer.seat === this.id),
      smallBlind: table.smallBlind,
      showBB: table.showBB,
      handNum: table.handNum,
      handEnded: table.handEnded,
      presentation: table.presentation,
      dealIndex: table.dealOrder?.indexOf(this.id) ?? -1,
    };
  }
}
