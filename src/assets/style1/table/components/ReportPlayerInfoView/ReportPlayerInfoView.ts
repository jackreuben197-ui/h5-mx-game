import config from './config.json';
import type { RoomRecords } from '../../../../../core/RoomRecords.js';
import type { TexasReportPlayerInfo } from '../../../../../data/TexasGameRoomDataReport.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { element } from '../../dom.js';
export class ReportPlayerInfoView {
    readonly dialog = new RecordDialogView(() => i18nMgr.Get('MX_PlayerStats', [], '玩家资料'), () => this.close());
    readonly root = this.dialog.root;
    private generation = 0;
    private player?: Pick<TexasReportPlayerInfo, 'userRid' | 'name' | 'avatar'>;
    private stats?: Record<string, number> | null;
    constructor(private records: RoomRecords) { this.root.classList.add('mx-report-player-overlay'); i18nMgr.register(this); }
    async open(player: Pick<TexasReportPlayerInfo, 'userRid' | 'name' | 'avatar'>): Promise<void> {
        const generation = ++this.generation;
        this.player = player;
        this.stats = undefined;
        this.dialog.show(true);
        this.render();
        this.dialog.status.textContent = i18nMgr.Get('MX_Loading', [], '加载中…');
        try {
            const stats = await this.records.playerStats(player.userRid);
            if (generation !== this.generation)
                return;
            this.stats = stats;
            this.dialog.status.textContent = '';
            this.render();
        }
        catch (error) {
            if (generation === this.generation)
                this.dialog.status.textContent = error instanceof Error ? error.message : String(error);
        }
    }
    refreshLanguage(): void { if (!this.root.hidden)
        this.render(); }
    private render(): void {
        const p = this.player;
        if (!p)
            return;
        const body = this.dialog.body;
        body.replaceChildren();
        const avatar = element('img', 'mx-report-player-avatar');
        avatar.src = p.avatar;
        avatar.alt = '';
        avatar.onerror = () => avatar.hidden = true;
        if (p.avatar)
            body.append(avatar);
        body.append(element('h3', '', StringHelper.LengthNick(p.name)), element('p', '', `ID: ${p.userRid}`));
        const s = this.stats;
        if (s) {
            const grid = element('div', 'mx-report-summary');
            for (const [label, value] of [[i18nMgr.Get('UISituationCurHandNum', [], '总手数'), String(s.total_hand || 0)], ['VPIP', `${s.vpip || 0}%`], ['PFR', `${s.prf || 0}%`],
                [i18nMgr.Get('MX_TotalGames', [], '总局数'), String(s.total_game_cnt || 0)], [i18nMgr.Get('MX_WinRate', [], '胜率'), `${s.wins || 0}%`], [i18nMgr.Get('MX_AverageProfit', [], '场均盈亏'), StringHelper.GetLongString(s.aveage_earn_hundred || 0)]]) {
                const item = element('div', '');
                item.append(element('span', '', label!), element('strong', '', value!));
                grid.append(item);
            }
            body.append(grid);
        }
    }
    close(): void { ++this.generation; this.dialog.show(false); }
    onFrameResize(w: number, h: number): void { this.dialog.onFrameResize(w, h); }
    destroy(): void { this.close(); this.dialog.destroy(); }
}
