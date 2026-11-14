import type { Action, TableSnapshot } from '../core/types.js';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
export class BettingMapper {
  constructor(private pb: HoldemRuntime) {}
  map(data: ProtocolRoomData): Pick<TableSnapshot, 'actions' | 'betting'> {
    const state = data.snapshot;
    const mine = state?.myInfo?.seatId;
    const operator = mine
      ? state?.operatorList.find(
          (op) => op.seatId === mine && !op.isInsurance && !op.isAgreeSecondPc,
        )
      : undefined;
    if (!operator) return { actions: [], betting: undefined };
    const A = this.pb.Def.Action;
    const names = new Map<number, Action>([
      [A.FOLD, 'fold'],
      [A.CHECK, 'check'],
      [A.CALL, 'call'],
      [A.RAISE, 'raise'],
      [A.BET, 'raise'],
      [A.ALLIN, 'allin'],
      [A.STRADDLE, 'straddle'],
    ]);
    const maxStraddle = data.record?.straddleMax || 1;
    const straddleCount = state!.playersList.filter(player => player.action === A.STRADDLE).length;
    const limits = operator.actionsList.filter(limit => limit.action !== A.STRADDLE ||
      (straddleCount < maxStraddle && limit.straddleLevel <= maxStraddle));
    if (
      limits.some(
        (l) =>
          !Number.isSafeInteger(l.min) ||
          !Number.isSafeInteger(l.max) ||
          l.min < 0 ||
          l.max < l.min,
      )
    )
      throw new Error('服务端操作金额无效');
    const raise = limits.find((l) => l.action === A.RAISE || l.action === A.BET);
    const call = limits.find((l) => l.action === A.CALL);
    const allIn = limits.find((l) => l.action === A.ALLIN);
    const straddle = limits.find((l) => l.action === A.STRADDLE);
    return {
      actions: [...new Set(limits.map((l) => names.get(l.action)).filter((v): v is Action => !!v))],
      // CC passes ActionLimit.min/max directly to ClientMessageAction.amount.
      betting: {
        id: `${state!.handInfo?.handNum}:${mine}:${operator.opDeadline}:${state!.handInfo?.roundBet}`,
        call: call?.min ?? 0,
        min: raise?.min ?? 0,
        max: raise?.max ?? 0,
        step: 1,
        allIn: allIn?.min,
        straddle: straddle?.min,
      },
    };
  }
  resolve(data: ProtocolRoomData, action: Action, amount?: number) {
    const state = data.snapshot;
    const op = state?.operatorList.find(
      (o) => o.seatId === state.myInfo?.seatId && !o.isInsurance && !o.isAgreeSecondPc,
    );
    const A = this.pb.Def.Action;
    const codes: Record<Action, number[]> = {
      fold: [A.FOLD],
      check: [A.CHECK],
      call: [A.CALL],
      raise: [A.RAISE, A.BET],
      allin: [A.ALLIN],
      straddle: [A.STRADDLE],
    };
    const limit = op?.actionsList.find((l) => codes[action].includes(l.action));
    if (!limit || !this.map(data).actions.includes(action)) throw new Error('当前已不是该操作时机');
    const value = action === 'raise' || action === 'allin' ? amount : limit.min;
    if (!Number.isSafeInteger(value) || value! < limit.min || value! > limit.max)
      throw new Error('操作金额已失效');
    return { action: limit.action, amount: value! };
  }
}
