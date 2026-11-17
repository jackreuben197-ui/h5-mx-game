import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { RoomRecords } from '../core/RoomRecords.js';
import { GameplayTableSettingBasic } from './GameplayTableSettingBasic.js';
import TexasReportPresentation from './TexasReportPresentation.js';
export type ReportTab = 'battle' | 'insurance' | 'jackpot' | 'mode';
export class ReportController extends EventSource {
    static readonly CHANGE = 'REPORT_PANEL_CHANGE';
    @observable(ReportController.CHANGE)
    state = { open: false, tab: 'battle' as ReportTab, onlyTable: false, round: 0, loading: false, error: '' };
    private generation = 0;
    constructor(readonly records: RoomRecords) { super(); }
    private get basic() {
        const { record, snapshot } = this.records.data;
        return record && snapshot?.roomInfo ? GameplayTableSettingBasic.from(record, snapshot.roomInfo, snapshot.handInfo) : undefined;
    }
    get mode() { return TexasReportPresentation.resolveMode(this.basic ?? this.records.data.record ?? {}); }
    get tabs(): ReportTab[] {
        const tabs: ReportTab[] = ['battle'];
        const basic = this.basic;
        // Product QA: insurance stays in the summary, not a separate report page.
        // RoomRecord uses 1 = enabled, 2 = disabled; raw truthiness also enabled closed tables.
        if (basic?.jackpot ?? (this.records.data.record?.jackpot === 1)) tabs.push('jackpot');
        if (this.mode !== 'none') tabs.push('mode');
        return tabs;
    }
    open(): void { this.state = { ...this.state, open: true }; void this.select('battle'); }
    close(): void { ++this.generation; this.state = { ...this.state, open: false, loading: false }; }
    filter(onlyTable: boolean): void { this.state = { ...this.state, onlyTable }; }
    async select(tab: ReportTab, round = this.state.round): Promise<void> {
        if (!this.tabs.includes(tab)) tab = 'battle';
        const generation = ++this.generation;
        this.state = { ...this.state, tab, loading: true, error: '' };
        try {
            if (tab === 'battle')
                await this.records.refreshReport();
            if (tab === 'insurance')
                await this.records.insurance();
            if (tab === 'jackpot')
                await this.records.jackpot();
            if (tab === 'mode' && this.mode !== 'none')
                round = await this.records.round(this.mode, round);
            if (generation === this.generation)
                this.state = { ...this.state, round };
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
    destroy(): void { this.close(); super.clear(); }
}
