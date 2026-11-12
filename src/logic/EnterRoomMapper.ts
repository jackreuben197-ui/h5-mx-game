import { BettingMapper } from './BettingMapper.js';
import type { RoomTarget, TableSnapshot } from '../core/types.js';
import { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
/** EnterRoom/SyncEnter share the CC full-snapshot rules; no inferred deal animation. */
export class EnterRoomMapper {
  constructor(private pb: HoldemRuntime) {}
  map(data: ProtocolRoomData, target: RoomTarget, revision: number): TableSnapshot {
    const room = data.record,
      s = data.snapshot;
    if (!room || !s || s.status !== 0) throw new Error('房间快照不完整');
    const mySeat = s.myInfo?.seatId ?? 0,
      hand = s.handInfo,
      actions = this.pb.Def.Action;
    if (!Number.isInteger(mySeat) || mySeat < 0 || mySeat > room.seatCount)
      throw new Error('当前座位标识无效');
    const mineOp = s.operatorList.find(
      (op) => op.seatId === mySeat && !op.isInsurance && !op.isAgreeSecondPc,
    );
    const seen = new Set<number>();
    const players = s.playersList.map((player) => {
      if (
        !Number.isInteger(player.seatId) ||
        player.seatId < 1 ||
        player.seatId > room.seatCount ||
        seen.has(player.seatId)
      )
        throw new Error('快照座位数据无效');
      seen.add(player.seatId);
      if (!Number.isSafeInteger(player.chip) || player.chip < 0)
        throw new Error('玩家筹码超出安全整数范围');
      let cards = [...player.cardsList];
      if (player.seatId === mySeat) {
        if (
          s.roomInfo?.delaySeeCard &&
          !mineOp &&
          cards.length > 0 &&
          s.gameStatus <= this.pb.Def.GameStatus.HAND_PREFLOP &&
          !player.roundActioned &&
          player.action !== actions.ALLIN
        )
          cards = cards.map(() => 0);
        if (mineOp?.cardsList.length) cards = [...mineOp.cardsList];
      }
      const names: Record<number, string> = {
        [actions.FOLD]: '弃牌',
        [actions.CHECK]: '过牌',
        [actions.CALL]: '跟注',
        [actions.RAISE]: '加注',
        [actions.BET]: '下注',
        [actions.ALLIN]: '全下',
      };
      return {
        seat: player.seatId,
        userRid: player.userRid,
        sex: player.sex,
        settlement: s.settlement?.handNum === hand?.handNum ? s.settlement?.seats[player.seatId] : undefined,
        name: player.name,
        chips: player.chip,
        roundBet: player.roundBet,
        avatar: player.avatar || undefined,
        cards,
        folded: player.action === actions.FOLD,
        action: names[player.action] ?? '',
      };
    });
    const pot = hand?.allBet ?? 0;
    if (!Number.isSafeInteger(pot) || pot < 0) throw new Error('底池超出安全整数范围');
    const countdowns = s.operatorList.filter(op => !op.isInsurance && !op.isAgreeSecondPc).map(op => {
      // Resolve the legacy remaining-seconds fallback ONCE; unrelated packets must not reset it.
      if (!op.opDeadline && op.leftOpTime > 0) op.opDeadline = Date.now() / 1000 + op.leftOpTime;
      const totalTime = (op as typeof op & { totalOpDuration?: number }).totalOpDuration ?? s.roomInfo?.opDuration ?? 0;
      return { seat: op.seatId, deadline: op.leftOpTime > 0 ? op.opDeadline : 0, totalTime };
    });
    return {
      menu: {
        insurance: !!s.roomInfo?.insurance, retainType: s.roomInfo?.retainType ?? 0,
        retainMinRate: room.retainMinRate, storeChips: s.myInfo?.storeChips ?? 0,
        keepingSeat: !!s.playersList.find(p=>p.seatId===mySeat)?.keepSeatLeftTime,
        keepSeatDuration: room.keepSeatDuration,
      },
      countdowns,
      roomID: target.roomID,
      matchID: target.matchID,
      handNum: hand?.handNum ?? 0,
      handEnded: s.gameStatus === this.pb.Def.GameStatus.HAND_END,
      revision,
      name: room.name,
      seatCount: room.seatCount,
      mySeat,
      players,
      community: [...(hand?.publicCardsList ?? [])],
      communityEmphasis: s.settlement?.handNum === hand?.handNum ? s.settlement?.community : undefined,
      pot,
      pots: hand?.potsList.map(p => p.amount) ?? [],
      smallBlind: s.roomInfo?.smallBlind,
      ante: s.roomInfo?.ante,
      uniqueID: s.roomInfo?.uniqueId,
      actingSeat: s.operatorList.find(op => !op.isInsurance && !op.isAgreeSecondPc)?.seatId,
      dealerSeat: hand?.buSeatId,
      presentation: 'sync',
      ...new BettingMapper(this.pb).map(data),
    };
  }
}
