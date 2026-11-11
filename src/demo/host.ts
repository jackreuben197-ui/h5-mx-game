import type {
  Action,
  BettingTurn,
  RoomHost,
  RoomTarget,
  TableSnapshot,
  TableUpdate,
} from '../core/types.js';
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}
export class DemoHost implements RoomHost {
  failNext = false;
  private snapshot?: TableSnapshot;
  private response?: AbortController;
  private roundPaid = new Map<number, number>();
  private turn = 0;
  private receive?: (event: TableUpdate) => void;
  constructor(private log: (message: string) => void) {}
  async enter(
    target: RoomTarget,
    signal: AbortSignal,
    receive: (event: TableUpdate) => void,
  ): Promise<TableSnapshot> {
    this.log(`请求房间信息 #${target.roomID}`);
    await wait(500, signal);
    if (this.failNext) {
      this.failNext = false;
      throw new Error('模拟网络错误，点击重试即可恢复');
    }
    this.log('检查进入条件 → 发送 EnterRoom');
    await wait(500, signal);
    this.snapshot = {
      roomID: target.roomID,
      matchID: target.matchID,
      handNum: 1,
      revision: 1,
      name: `松林 · ${target.roomID}`,
      mySeat: 1,
      seatCount: 9,
      dealerSeat: 2,
      pot: 150,
      community: [],
      actions: ['fold', 'check', 'raise', 'allin'],
      betting: { id: String(++this.turn), call: 0, min: 50, max: 1999, step: 1, allIn: 2000 },
      players: ['我', '林间', 'River', '小满', 'Amber', '北辰', '清风', 'Lindsey', '初夏'].map(
        (name, i) => ({
          seat: i + 1,
          name,
          chips: 2000 + i * 150,
          cards: i === 0 ? [14, 29] : [0, 0],
          action: '',
        }),
      ),
    };
    this.response?.abort();
    this.roundPaid.clear();
    this.receive = receive;
    signal.addEventListener(
      'abort',
      () => {
        if (this.receive === receive) {
          this.response?.abort();
          this.receive = undefined;
          this.snapshot = undefined;
        }
        this.log('关闭当前房间订阅');
      },
      { once: true },
    );
    this.log('收到全量快照 → 渲染牌桌');
    return this.snapshot;
  }
  private publish(
    changes: Partial<Pick<TableSnapshot, 'players' | 'community' | 'pot' | 'actions' | 'betting'>>,
  ) {
    const s = this.snapshot;
    if (!s || !this.receive) return;
    this.snapshot = { ...s, ...changes, revision: s.revision + 1, presentation: 'live' };
    this.receive({
      type: 'patch',
      roomID: s.roomID,
      matchID: s.matchID,
      handNum: s.handNum,
      revision: this.snapshot.revision,
      changes,
    });
  }
  private turnOptions(): { actions: Action[]; betting: BettingTurn } {
    const s = this.snapshot!,
      mine = s.players.find((p) => p.seat === s.mySeat)!;
    const call = Math.max(
      0,
      Math.max(0, ...this.roundPaid.values()) - (this.roundPaid.get(mine.seat) ?? 0),
    );
    const betting = {
      id: String(++this.turn),
      call,
      min: Math.max(50, call * 2),
      max: mine.chips - 1,
      step: 1,
      allIn: mine.chips,
    };
    const actions: Action[] =
      mine.folded || mine.chips <= 0
        ? []
        : [
            'fold',
            ...(call === 0 ? ['check' as const] : call < mine.chips ? ['call' as const] : []),
            ...(betting.max >= betting.min ? ['raise' as const] : []),
            'allin',
          ];
    return { actions, betting };
  }
  async command(
    _target: RoomTarget,
    action: Action,
    signal: AbortSignal,
    amount?: number,
  ): Promise<void> {
    const turn = this.snapshot?.betting?.id,
      hand = this.snapshot?.handNum;
    this.log(`发送操作 ${action}${amount === undefined ? '' : ` ${amount}`}（模拟宿主）`);
    await wait(250, signal);
    const s = this.snapshot,
      mine = s?.players.find((p) => p.seat === s.mySeat);
    if (!s || !mine || s.handNum !== hand || s.betting?.id !== turn || !s.actions.includes(action))
      throw new Error('操作轮已更新，请按当前可用操作重新选择');
    const b = s.betting!;
    if (
      action === 'raise' &&
      (typeof amount !== 'number' ||
        !Number.isSafeInteger(amount) ||
        amount < b.min ||
        amount > b.max ||
        (amount - b.min) % b.step !== 0)
    )
      throw new Error('加注金额超出范围');
    if (action === 'allin' && amount !== b.allIn) throw new Error('全下金额已更新');
    const paid =
      action === 'call' ? b.call : action === 'raise' || action === 'allin' ? amount! : 0;
    if (paid > mine.chips) throw new Error('筹码不足');
    this.roundPaid.set(mine.seat, (this.roundPaid.get(mine.seat) ?? 0) + paid);
    const label = {
      fold: '弃牌',
      check: '过牌',
      call: `跟注 ${paid}`,
      raise: `加注 ${paid}`,
      allin: `全下 ${paid}`,
    }[action];
    this.publish({
      players: s.players.map((p) =>
        p.seat === mine.seat
          ? { ...p, chips: p.chips - paid, folded: action === 'fold', action: label }
          : p,
      ),
      pot: s.pot + paid,
      actions: [],
    });
    this.log(`收到行动结果：${label} → 等待其他玩家，公共牌暂不改变`);
    this.response?.abort();
    const response = (this.response = new AbortController());
    void this.respond(response.signal).catch((error) => {
      if (error.name !== 'AbortError') this.log(error.message);
    });
  }
  private async respond(signal: AbortSignal) {
    const s = this.snapshot;
    if (!s) return;
    const target = Math.max(0, ...this.roundPaid.values());
    for (const seat of s.players
      .filter((p) => p.seat !== s.mySeat && p.seat <= s.seatCount && !p.folded && p.chips > 0)
      .map((p) => p.seat)) {
      await wait(300, signal);
      const current = this.snapshot;
      if (!current) return;
      const player = current.players.find((p) => p.seat === seat)!;
      if (player.folded) continue;
      const paid = Math.min(player.chips, Math.max(0, target - (this.roundPaid.get(seat) ?? 0)));
      this.roundPaid.set(seat, (this.roundPaid.get(seat) ?? 0) + paid);
      this.publish({
        pot: current.pot + paid,
        players: current.players.map((p) =>
          p.seat === seat
            ? {
                ...p,
                chips: p.chips - paid,
                action: paid ? `${paid === p.chips ? '全下' : '跟注'} ${paid}` : '过牌',
              }
            : p,
        ),
      });
    }
    await wait(600, signal);
    if (this.snapshot?.community.length === 5) {
      this.log('演示下注结束；点击重新发牌开始下一手（未模拟摊牌结算）');
      return;
    }
    this.advance();
  }
  faceBet(): void {
    if (!this.snapshot || !this.receive) return;
    this.response?.abort();
    const s = this.snapshot,
      opponent = s.players.find((p) => p.seat === 2);
    if (!opponent || opponent.folded || opponent.chips <= 0) return;
    const paid = Math.min(100, opponent.chips);
    this.roundPaid.set(2, (this.roundPaid.get(2) ?? 0) + paid);
    this.publish({
      players: s.players.map((p) =>
        p.seat === 2 ? { ...p, chips: p.chips - paid, action: `下注 ${paid}` } : p,
      ),
      pot: s.pot + paid,
    });
    this.publish(this.turnOptions());
    this.log('对手下注：显示跟注金额及新的加注范围');
  }
  deal(): void {
    if (!this.snapshot || !this.receive) return;
    this.response?.abort();
    this.roundPaid.clear();
    const state = this.snapshot;
    this.snapshot = {
      ...state,
      handNum: state.handNum + 1,
      revision: state.revision + 1,
      presentation: 'deal',
      dealOrder: Array.from({ length: state.seatCount }, (_, i) => ((i + 1) % state.seatCount) + 1),
      community: [],
      pot: 150,
      actions: [],
      players: state.players.map((p) => ({
        ...p,
        chips: 2000 + (p.seat - 1) * 150,
        folded: false,
        action: '',
        cards: p.seat === 1 ? [14, 29] : [0, 0],
      })),
    };
    this.snapshot = { ...this.snapshot, ...this.turnOptions() };
    this.receive({ type: 'snapshot', snapshot: this.snapshot });
    this.log('StartInfo：按 dealOrder 发牌 → 自己翻牌');
  }
  fold(seat = 2): void {
    if (!this.snapshot || !this.receive) return;
    if (seat === 1) this.response?.abort();
    const changes = {
      players: this.snapshot.players.map((p) =>
        p.seat === seat ? { ...p, folded: true, action: '弃牌' } : p,
      ),
      actions: seat === 1 ? [] : this.snapshot.actions,
    };
    this.snapshot = {
      ...this.snapshot,
      ...changes,
      revision: this.snapshot.revision + 1,
      presentation: 'live',
    };
    this.receive({
      type: 'patch',
      roomID: this.snapshot.roomID,
      matchID: this.snapshot.matchID,
      handNum: this.snapshot.handNum,
      revision: this.snapshot.revision,
      changes,
    });
    this.log(seat === 1 ? '自己弃牌：保留手牌并置灰' : '对手弃牌：0.8 秒回收至 PokerPoint');
  }
  setSeats(count: number): void {
    if (!this.snapshot || !this.receive) return;
    this.response?.abort();
    this.snapshot = {
      ...this.snapshot,
      revision: this.snapshot.revision + 1,
      seatCount: count,
      presentation: 'sync',
    };
    this.receive({ type: 'snapshot', snapshot: this.snapshot });
    this.log(`${count} 人桌：使用 CC SeatsArrange`);
  }
  sync(): void {
    if (!this.snapshot || !this.receive) return;
    this.snapshot = {
      ...this.snapshot,
      revision: this.snapshot.revision + 1,
      presentation: 'sync',
    };
    this.receive({ type: 'snapshot', snapshot: this.snapshot });
    this.log('SyncEnter：取消动画，静态恢复快照');
  }
  advance(): void {
    if (!this.snapshot || !this.receive) return;
    this.response?.abort();
    this.roundPaid.clear();
    const s = this.snapshot,
      count = s.community.length === 0 ? 3 : s.community.length + 1;
    if (count > 5) {
      this.deal();
      return;
    }
    this.publish({
      community: [2, 18, 36, 55, 11].slice(0, count),
      players: s.players.map((p) => ({ ...p, action: p.folded ? '弃牌' : '' })),
    });
    this.publish(this.turnOptions());
    this.log(`下注轮结束 → ${count} 张公共牌 → 下一个操作轮`);
  }
}
