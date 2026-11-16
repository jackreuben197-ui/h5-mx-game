import { HostSessionData } from '../../data/HostSessionData.js';
import type { Player, Operator, PlayerAllInShowCardWinCardsLength } from '@silenthill/agreement-web';
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
    if (operator?.isInsurance && operator.seatId === this.state.myInfo?.seatId) {
      if (!operator.opDeadline) operator.opDeadline = Date.now() / 1000 + operator.leftOpTime;
      this.data.insurance.start(operator, (this.state.handInfo?.publicCardsList.length ?? 0) >= 4 ? this.pb.Def.Round.TURN : this.pb.Def.Round.FLOP, operator.invalidInsurancePotsList);
    } else if (this.data.insurance.state.operator) this.data.insurance.finish();
    if (operator?.cardsList.length && operator.seatId === this.state.myInfo?.seatId)
      this.player(operator.seatId).cardsList = [...operator.cardsList];
  }
  allInWinPercent(users: PlayerAllInShowCardWinCardsLength.AsObject[]): boolean {
    let changed = false;
    for (const item of users) {
      if (item.leftCardsCount <= 0) continue;
      const player = this.state.playersList.find(player => player.seatId === item.seatId) as (Player.AsObject & { winPercent100?: number }) | undefined;
      if (!player) continue;
      const percent = Math.min(10000, Math.round(item.winCardsCount * 10000 / item.leftCardsCount));
      if (player.winPercent100 !== percent) { player.winPercent100 = percent; changed = true; }
    }
    return changed;
  }
  clearHand(): void {
    this.state.settlement = undefined;
    for (const p of this.state.playersList) {
      p.cardsList = [];
      (p as Player.AsObject & { showCardsSelection?: number[] }).showCardsSelection = [];
      p.action = this.pb.Def.Action.NONE;
      p.roundBet = 0;
      p.handBet = 0;
      p.roundActioned = false;
      (p as Player.AsObject & { winPercent100?: number }).winPercent100 = undefined;
      p.winCardsInfo = undefined;
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
