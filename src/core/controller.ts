import { LoadingDelay } from './LoadingDelay.js';
import { Preloader } from './preloader.js';
import { applyUpdate } from './store.js';
import type { Action, ClientState, RoomHost, RoomTarget, TableUpdate } from './types.js';
export class GameController<T> {
  private state: ClientState = {
    phase: 'hidden',
    progress: 0,
    target: null,
    table: null,
    error: null,
  };
  private listeners = new Set<(state: ClientState) => void>();
  private session?: AbortController;
  private generation = 0;
  private pending = false;
  private resourceProgress = 0;
  private unsubscribe: () => void;
  constructor(
    private preload: Preloader<T>,
    private host: RoomHost,
    private minimumLoadingMs = 0,
  ) {
    this.unsubscribe = preload.subscribe((progress) => {
      this.resourceProgress = progress;
      this.set({ progress });
    });
    // Background failure is consumed here; foreground entry exposes it and can retry.
    void preload.ensure().catch(() => undefined);
  }
  get current(): ClientState {
    return this.state;
  }
  subscribe(listener: (state: ClientState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private set(patch: Partial<ClientState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }
  async enter(target: RoomTarget): Promise<void> {
    if (this.state.phase === 'destroyed') return;
    target = { ...target };
    this.session?.abort();
    this.pending = false;
    const generation = ++this.generation;
    const session = (this.session = new AbortController());
    const active = () => !session.signal.aborted && generation === this.generation;
    this.set({ progress: this.resourceProgress, phase: 'loading', target: { ...target }, table: null, error: null });
    let queue: TableUpdate[] = [];
    try {
      await Promise.all([
        this.preload.ensure(),
        LoadingDelay.wait(this.minimumLoadingMs, session.signal),
      ]);
      if (!active()) return;
      this.set({ phase: 'entering' });
      const snapshot = await this.host.enter(target, session.signal, (event) => {
        if (!active()) return;
        if (event.type === 'closed') {
          if (event.roomID === target.roomID && event.matchID === target.matchID) this.leave();
          return;
        }
        if (event.type === 'transfer' && event.snapshot.matchID === target.matchID) {
          target.roomID = event.snapshot.roomID; this.set({target:{...target}});
        }
        if (!this.state.table) {
          if (queue.length >= 1000) {
            session.abort();
            this.set({ phase: 'error', error: '房间同步积压，请重新进入' });
            return;
          }
          queue.push(event);
          return;
        }
        const table = applyUpdate(this.state.table, event);
        if (table !== this.state.table) this.set({ table });
      });
      if (!active()) return;
      if (snapshot.roomID !== target.roomID || snapshot.matchID !== target.matchID)
        throw new Error('房间快照与进房请求不匹配');
      const table = queue.reduce(applyUpdate, snapshot);
      queue = [];
      this.set({ phase: 'table', table, target: { ...target } });
    } catch (error) {
      if (!active()) return;
      session.abort();
      this.set({
        phase: 'error',
        error: error instanceof Error ? error.message : '进房失败，请重试',
      });
    }
  }
  async command(action: Action, amount?: number): Promise<void> {
    if (
      this.pending ||
      this.state.phase !== 'table' ||
      !this.state.table?.actions.includes(action) ||
      !this.state.target ||
      !this.session
    )
      return;
    const betting = this.state.table.betting;
    if (
      action === 'raise' &&
      (!betting ||
        typeof amount !== 'number' ||
        !Number.isSafeInteger(amount) ||
        betting.step <= 0 ||
        amount < betting.min ||
        amount > betting.max ||
        (amount - betting.min) % betting.step !== 0)
    )
      return;
    if (
      action === 'allin' &&
      (!betting ||
        typeof amount !== 'number' ||
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount !== betting.allIn)
    )
      return;
    const session = this.session;
    this.pending = true;
    this.set({ error: null });
    try {
      await this.host.command(this.state.target, action, session.signal, amount);
    } catch (error) {
      if (!session.signal.aborted)
        this.set({ error: error instanceof Error ? error.message : '操作失败' });
    } finally {
      if (session === this.session) this.pending = false;
    }
  }
  async prepareSeat(seat: number) {
    if(this.state.phase !== 'table' || !this.state.target || !this.session || !this.host.prepareSeat) throw new Error('当前房间尚不支持坐下');
    return this.host.prepareSeat(this.state.target, seat, this.session.signal);
  }
  async sitDown(selection: import('./Seating.js').BuyInSelection) {
    if(this.state.phase !== 'table' || !this.state.target || !this.session || !this.host.sitDown) throw new Error('房间已离开');
    return this.host.sitDown(this.state.target, selection, this.session.signal);
  }
  async standup() {
    if(this.state.phase !== 'table' || !this.state.target || !this.session || !this.host.standup) throw new Error('房间已离开');
    return this.host.standup(this.state.target, this.session.signal);
  }
  async storeChips(amount: number): Promise<void> {
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.storeChips)throw new Error('房间已离开');
    return this.host.storeChips(this.state.target,amount,this.session.signal);
  }
  async keepSeat(keep: boolean): Promise<void> {
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.keepSeat)throw new Error('房间已离开');
    return this.host.keepSeat(this.state.target,keep,this.session.signal);
  }
  async addTime(): Promise<void> {
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.addTime)throw new Error('房间已离开');
    return this.host.addTime(this.state.target,this.session.signal);
  }
  async showdown(cardIndex:number): Promise<void> {
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.showdown)throw new Error('房间已离开');
    return this.host.showdown(this.state.target,cardIndex,this.session.signal);
  }
  async agreeSecondPcs(agree:boolean):Promise<void>{
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.agreeSecondPcs)throw new Error('房间已离开');
    return this.host.agreeSecondPcs(this.state.target,agree,this.session.signal);
  }
  async joinSquid():Promise<void>{
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.joinSquid)throw new Error('房间已离开');
    return this.host.joinSquid(this.state.target,this.session.signal);
  }
  async buyInsurance(buyList:import('@silenthill/agreement-web').PotInsuranceBuy.AsObject[],confirm:boolean):Promise<void>{
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.buyInsurance)throw new Error('房间已离开');
    return this.host.buyInsurance(this.state.target,buyList,confirm,this.session.signal);
  }
  async watchSettlement(kind:'peek'|'reveal'):Promise<void>{
    if(this.state.phase!=='table'||!this.state.target||!this.session||!this.host.watchSettlement)throw new Error('房间已离开');
    return this.host.watchSettlement(this.state.target,kind,this.session.signal);
  }
  leave(): void {
    if (this.state.phase === 'destroyed') return;
    ++this.generation;
    this.session?.abort();
    this.pending = false;
    this.set({ phase: 'hidden', target: null, table: null, error: null });
  }
  destroy(): void {
    this.leave();
    this.unsubscribe();
    this.set({ phase: 'destroyed' });
    this.listeners.clear();
  }
}
