import { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import { DiamondModel } from '../data/DiamondModel.js';
import { PrivateUcChargeStore } from '../data/PrivateUcChargeStore.js';
import type { HistoryQuote } from '../core/HistoryQuote.js';
import { BindingScope } from '../binding/BindingScope.js';
import { bindEvent } from '../binding/bindEvent.js';
import { TexasGameRoomDataReplay } from '../data/TexasGameRoomDataReplay.js';
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { RoomRecords } from '../core/RoomRecords.js';
import type { ReplayHandData } from '../data/ReplayHandData.js';
import { parseHistoryHand, type HistoryHandModel } from './HistoryReplayModel.js';
export interface HistoryPanelState {
    open: boolean;
    page: number;
    total: number;
    details: boolean;
    loading: boolean;
    collecting: boolean;
    error: string;
    data?: ReplayHandData;
    model?: HistoryHandModel;
    collected: boolean;
    collectReady?: boolean;
    quote?: HistoryQuote;
    buying?: boolean;
    quoteLoading?: boolean;
}
export class HistoryController extends EventSource {
    static readonly CHANGE = 'HISTORY_PANEL_CHANGE';
    @observable(HistoryController.CHANGE)
    state: HistoryPanelState = { open: false, page: 0, total: 0, details: false, loading: false, collecting: false, error: '', collected: false };
    private generation = 0;
    private quoteGeneration = 0;
    private bindings = new BindingScope(this);
    private latestBalance?:number;
    private balanceRevision=0;
    private offBalance?:()=>void;
    constructor(readonly records: RoomRecords) { super(); this.offBalance=records.subscribeDiamondBalance?.(balance=>{this.latestBalance=balance;this.balanceRevision++;if(this.state.open&&this.state.quote?.balance!==undefined)this.state={...this.state,quote:{...this.state.quote,balance}};}); this.bindings.bind({ replay: records.data.replay, global: records.config.global, diamonds: records.config.diamonds, privateUc: records.config.privateUc }); }
    @bindEvent(GlobalConfigStore.CONFIG_CHANGED, { dataSource: 'global', initIgnore: true })
    private onGlobalConfig(): void { void this.refreshQuote(); }
    @bindEvent(DiamondModel.CONFIG_CHANGED, { dataSource: 'diamonds', initIgnore: true })
    private onDiamondConfig(): void { void this.refreshQuote(); }
    @bindEvent(PrivateUcChargeStore.CONFIG_CHANGED, { dataSource: 'privateUc', initIgnore: true })
    private onPrivateUcConfig(): void { void this.refreshQuote(); }
    @bindEvent(TexasGameRoomDataReplay.CHANGE, 'replay')
    private onReplay(data: ReplayHandData | null): void {
        if (!this.state.open || (data && data.s.hand !== this.state.page))
            return;
        this.state = { ...this.state, data: data ?? undefined, model: data ? parseHistoryHand(data, this.records.userRID) : undefined, collected: !!data?.collected };
    }
    open(): void {
        const total = Math.max(0, (this.records.data.snapshot?.handInfo?.handNum ?? 0) - 1);
        this.state = { ...this.state, open: true, total, details: false, error: '', data: undefined, model: undefined, page: total };
        if (total)
            void this.go(total);
    }
    close(): void { ++this.generation; ++this.quoteGeneration; this.state = { ...this.state, open: false, loading: false }; }
    details(): void { this.state = { ...this.state, details: !this.state.details }; }
    async go(page: number): Promise<void> {
        if (this.state.loading || this.state.buying || this.state.collecting || !Number.isInteger(page) || page < 1 || page > this.state.total)
            return;
        const generation = ++this.generation;
        this.state = { ...this.state, page, loading: true, error: '', data: undefined, model: undefined, collected: false, collectReady: false, quote: undefined };
        try {
            const data = await this.records.replay(page);
            if (generation !== this.generation)
                return;
            if (data)
                void this.refreshQuote();
            if (data && this.state.model?.hasMe) {
                const collected = await this.records.collected(data);
                if (generation === this.generation)
                    this.state = { ...this.state, collected, collectReady: true };
            }
        }
        catch (error) {
            if (generation === this.generation)
                this.state = { ...this.state, error: error instanceof Error ? error.message : String(error) };
        }
        finally {
            if (generation === this.generation)
                this.state = { ...this.state, loading: false };
        }
    }
    async refreshQuote(): Promise<void> {
        const data = this.state.data;
        if (!data || !this.state.open)
            return;
        const generation = this.generation, quoteGeneration = ++this.quoteGeneration,balanceRevision=this.balanceRevision;
        this.state = { ...this.state, quoteLoading: true };
        try {
            const quote = await this.records.historyQuote(data);
            if(balanceRevision!==this.balanceRevision&&quote.balance!==undefined)quote.balance=this.latestBalance;
            if (generation === this.generation && quoteGeneration === this.quoteGeneration)
                this.state = { ...this.state, quote };
        }
        catch (error) {
            if (generation === this.generation && quoteGeneration === this.quoteGeneration)
                this.state = { ...this.state, error: error instanceof Error ? error.message : String(error) };
        }
        finally {
            if (generation === this.generation && quoteGeneration === this.quoteGeneration)
                this.state = { ...this.state, quoteLoading: false };
        }
    }
    async watch(kind: 'peek' | 'reveal'): Promise<void> {
        const { data, quote, buying } = this.state;
        if (!data || !quote || buying)
            return;
        if (kind === 'peek' ? !quote.canPeek : !quote.canReveal)
            return;
        const generation = this.generation;
        this.state = { ...this.state, buying: true, error: '' };
        try {
            if (kind === 'peek')
                await this.records.peek(data);
            else
                await this.records.reveal(data, quote.revealRound);
            if (generation === this.generation)
                await this.refreshQuote();
        }
        catch (error) {
            if (generation === this.generation)
                this.state = { ...this.state, error: error instanceof Error ? error.message : String(error) };
        }
        finally {
            this.state = { ...this.state, buying: false };
        }
    }
    async collect(): Promise<void> {
        const { data, collected } = this.state;
        if (!data || !this.state.model?.hasMe || !this.state.collectReady || this.state.collecting || this.state.buying)
            return;
        const generation = this.generation;
        this.state = { ...this.state, collecting: true, error: '' };
        try {
            await this.records.collect(data, collected, 0);
            if (generation === this.generation)
                this.state = { ...this.state, collected: !collected };
        }
        catch (error) {
            if (generation === this.generation)
                this.state = { ...this.state, error: error instanceof Error ? error.message : String(error) };
        }
        finally {
            this.state = { ...this.state, collecting: false };
        }
    }
    destroy(): void { this.offBalance?.();this.close(); this.bindings.destroy(); super.clear(); }
}
