import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { RoomRecords } from '../core/RoomRecords.js';
import TexasReportPresentation from './TexasReportPresentation.js';
export type ReportTab = 'battle' | 'insurance' | 'jackpot' | 'mode';
export class ReportController extends EventSource {
    static readonly CHANGE = 'REPORT_PANEL_CHANGE';
    @observable(ReportController.CHANGE)
    state = { open: false, tab: 'battle' as ReportTab, onlyTable: false, round: 0, loading: false, error: '' };
    private generation = 0;
    constructor(readonly records: RoomRecords) { super(); }
    get mode() { return TexasReportPresentation.resolveMode({ ...this.records.data.record, ...this.records.data.snapshot?.roomInfo }); }
    open(): void { this.state = { ...this.state, open: true }; void this.select('battle'); }
    close(): void { ++this.generation; this.state = { ...this.state, open: false, loading: false }; }
    filter(onlyTable: boolean): void { this.state = { ...this.state, onlyTable }; }
    async select(tab: ReportTab, round = this.state.round): Promise<void> {
        const generation = ++this.generation;
        this.state = { ...this.state, tab, loading: true, error: '' };
        try {
            if (tab === 'battle' && !this.records.data.report.roomersFetched)
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
