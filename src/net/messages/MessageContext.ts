import { HostSessionData } from '../../data/HostSessionData.js';
import type { Player, Operator } from '@silenthill/agreement-web';
import type { TableSnapshot } from '../../core/types.js';
import type { ProtocolRoomData } from '../../data/ProtocolRoomData.js';
import type { HoldemRuntime } from '../../net/ProtocolRuntime.js';
export class MessageContext {
  presentation: TableSnapshot['presentation'] = 'live';
  constructor(
    readonly data: ProtocolRoomData,
    readonly pb: HoldemRuntime,
    readonly session = new HostSessionData(),
  ) {}
  get state() {
    if (!this.data.snapshot) throw new Error('尚未收到入桌快照');
    return this.data.snapshot;
  }
  player(seat: number): Player.AsObject {
    const player = this.state.playersList.find((p) => p.seatId === seat);
    if (!player) throw new Error(`座位 ${seat} 缺少基础数据，需要同步`);
    return player;
  }
  operators(operator?: Operator.AsObject): void {
    this.state.operatorList = operator ? [operator] : [];
    if (operator?.cardsList.length && operator.seatId === this.state.myInfo?.seatId)
      this.player(operator.seatId).cardsList = [...operator.cardsList];
  }
  clearHand(): void {
    this.state.settlement = undefined;
    for (const p of this.state.playersList) {
      p.cardsList = [];
      p.action = this.pb.Def.Action.NONE;
      p.roundBet = 0;
      p.handBet = 0;
      p.roundActioned = false;
    }
    const hand = this.state.handInfo;
    if (hand) {
      hand.publicCardsList = [];
      hand.secondPublicCardsList = [];
      hand.allBet = 0;
      hand.roundBet = 0;
      hand.potsList = [];
      hand.secondPotsList = [];
      hand.dealOrderList = [];
    }
    this.state.operatorList = [];
  }
}
