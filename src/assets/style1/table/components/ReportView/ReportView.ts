import { ChipFormatter } from '../../../../../logic/ChipFormatter.js';
import config from './config.json';
import { ReportPlayerInfoView } from '../ReportPlayerInfoView/ReportPlayerInfoView.js';
import { ReportController, type ReportTab } from '../../../../../logic/ReportController.js';
import ReportData from '../../../../../data/TexasGameRoomDataReport.js';
import type { TexasReportPlayerInfo } from '../../../../../data/TexasGameRoomDataReport.js';
import TexasReportPresentation from '../../../../../logic/TexasReportPresentation.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import { RecordPaginationView } from '../RecordPaginationView/RecordPaginationView.js';
import { element, profitAmount } from '../../dom.js';
import { ReportValueFitter } from './ReportValueFitter.js';
import './layout.css';
const t = (key: string, fallback: string) => i18nMgr.Get(key, [], fallback);
export class ReportView {
    readonly dialog: RecordDialogView;
    readonly root: HTMLElement;
    private bindings = new BindingScope(this);
    private filter = element('input', '');
    private room = element('div', 'mx-record-room');
    private deposit = element('div', 'mx-report-deposit');
    private remaining = element('div', 'mx-report-remaining');
    private filterLabel = element('span', '');
    private tabs = element('div', 'mx-record-tabs');
    private list = element('div', 'mx-report-list');
    private summary = element('div', 'mx-report-summary');
    private observers = element('div', 'mx-report-observers');
    private pagination: RecordPaginationView;
    private playerInfo: ReportPlayerInfoView;
    private values = new ReportValueFitter();
    private tick?: ReturnType<typeof setInterval>;
    constructor(readonly controller: ReportController, private readonly showBB = () => false) {
        this.dialog = new RecordDialogView(() => t('UIMine_RecordList', '战绩'), () => controller.close(), 'left', config.layout.dockTop);
        this.root = this.dialog.root;
        this.root.classList.add('mx-report-overlay');
        this.playerInfo = new ReportPlayerInfoView(controller.records);
        this.root.append(this.playerInfo.root);
        this.filter.type = 'checkbox';
        this.filter.onchange = () => controller.filter(this.filter.checked);
        const label = element('label', 'mx-report-filter');
        label.append(this.filter, this.filterLabel);
        this.dialog.header.append(this.room, label, this.deposit, this.remaining);
        this.dialog.body.append(this.list, this.summary, this.observers);
        this.pagination = new RecordPaginationView(round => void controller.select('mode', round));
        this.dialog.footer.append(this.pagination.root, this.tabs);
        this.bindings.bind({ panel: controller, report: controller.records.data.report });
        i18nMgr.register(this);
    }
    refreshLanguage(): void { this.render(); }
    @bindEvent(ReportController.CHANGE, 'panel')
    private onPanel(): void { this.render(); }
    @bindEvent(ReportData.PLAYERS_CHANGE, 'report')
    private onPlayers(): void { this.render(); }
    @bindEvent(ReportData.OBSERVERS_CHANGE, 'report')
    private onObservers(): void { this.render(); }
    @bindEvent(ReportData.SUMMARY_CHANGE, 'report')
    private onSummary(): void { this.render(); }
    @bindEvent(ReportData.JACKPOT_CHANGE, 'report')
    private onJackpot(): void { this.render(); }
    @bindEvent(ReportData.INSURANCE_CHANGE, 'report')
    private onInsurance(): void { this.render(); }
    @bindEvent(ReportData.SQUID_ROUND_CHANGE, 'report')
    private onRounds(): void { this.render(); }
    private render(): void {
        const { state, records } = this.controller;
        this.values.clear();
        this.dialog.show(state.open);
        if (!state.open) {
            this.playerInfo.close();
            clearInterval(this.tick);
            this.tick = undefined;
            return;
        }
        if (!this.tick)
            this.tick = setInterval(() => this.renderTime(), 1000);
        this.renderTime();
        this.filter.checked = state.onlyTable;
        this.filterLabel.textContent = t('MX_OnlyAtTable', '只显示桌面玩家');
        this.dialog.status.textContent = state.error || (state.loading ? t('MX_Loading', '加载中…') : '');
        this.filter.closest('label')!.hidden = state.tab !== 'battle';
        const mode = this.controller.mode;
        const basic = records.data.tableSettings.basicInfo;
        const depositBase = mode === 'mush' ? basic?.mushroomBase ?? records.data.record?.mushroomBase ?? 0 : basic?.squidBase ?? records.data.record?.squidBase ?? 0;
        this.deposit.hidden = state.tab !== 'battle' || mode === 'none';
        this.deposit.textContent = mode === 'mush'
            ? StringHelper.Format(t('UIMushYaJinDir', '蘑菇押金 {0}'), [StringHelper.GetLongString(depositBase)])
            : `${t('UISquidYaJin', '鱿鱼押金')}　${StringHelper.GetLongString(depositBase)}`;
        if (!this.controller.tabs.includes(state.tab)) { void this.controller.select('battle'); return; }
        const labels: Record<ReportTab, string> = {
            battle: t('UITexasReport_title', '实时战况'),
            insurance: t('UICareerRecord_Insurance', '保险'),
            jackpot: t('UITexasReport_JackpotRecord', 'Jackpot'),
            mode: t(mode === 'mush' ? 'UITexasReport_MushRoomRecord' : 'UITexasReport_SquidRecord', mode === 'mush' ? '蘑菇记录' : '鱿鱼记录'),
        };
        const tabs = this.controller.tabs.map(key => [key, labels[key]] as const);
        this.tabs.hidden=tabs.length<=1;
        this.dialog.footer.hidden=tabs.length<=1&&state.tab==='battle';
        this.tabs.replaceChildren(...tabs.map(([key, label]) => { const b = element('button', '', label); b.type = 'button'; b.setAttribute('aria-pressed', String(state.tab === key)); b.onclick = () => void this.controller.select(key); return b; }));
        const report = records.data.report;
        const blind = records.data.snapshot?.roomInfo?.smallBlind ?? 0;
        const amount = (wire: number) => ChipFormatter.tableAmount(wire, blind, blind > 0 && this.showBB());
        const tableUsers = new Set(records.data.snapshot?.playersList.map(p => p.userRid) ?? []);
        this.list.replaceChildren();
        if (state.tab === 'battle') {
            const players = TexasReportPresentation.filterAndSortPlayers(report.players, tableUsers, state.onlyTable);
            const headers = [t('UITexasReport_player', '玩家'), `${t('UITexasReport_hand', '手数')}/${t('MX_TablePoolRate', '本桌入池率')}`, t('UITexasReport_bring', '总带入'), t('UITexasReport_pl', '盈亏')];
            if (mode !== 'none')
                headers.splice(3, 0, t(mode === 'mush' ? 'UIMush' : 'UISquid', mode === 'mush' ? '蘑菇' : '鱿鱼'));
            this.table(headers, players.map(p => {
                const bringIn = element('span', 'mx-report-bringin', StringHelper.GetLongString(p.bringInTotal));
                if (p.storeChips)
                    bringIn.append(element('small', 'mx-report-stored-chips', StringHelper.GetLongString(p.storeChips)));
                const score = TexasReportPresentation.getPlayerScore(p);
                const cells = [
                    StringHelper.LengthNick(p.name),
                    `${p.handNum} (${p.poolRate < 10 ? p.poolRate / 10 : Math.trunc(p.poolRate / 10)}%)`,
                    bringIn,
                    profitAmount('span', score, (score > 0 ? '+' : '') + amount(score)),
                ];
                if (mode === 'mush') {
                    const mushroom = p.mushroomAmount > 0
                        ? profitAmount('span', p.mushroomAmount, `+${p.mushroomCount}\n(+${StringHelper.GetLongString(p.mushroomAmount)})`)
                        : '-';
                    cells.splice(3, 0, mushroom);
                } else if (mode === 'squid') {
                    const squid = profitAmount('span', p.squidInTotal - p.squidOutTotal - p.squidPunishTotal);
                    cells.splice(3, 0, squid);
                }
                return { cells, own: p.userRid === records.userRID, offline: !p.isOnline || !tableUsers.has(p.userRid), player: p };
            }));
        }
        else if (state.tab === 'insurance')
            this.table([t('UITexasReport_player', '玩家'), t('UITexasRecord_baoxianTime', '时间'), t('UITexasRecord_toubaoCount', '投保'), t('UITexasReport_pl', '盈亏')], report.insuranceRecords.map(p => ({
                cells: [
                    p.name,
                    p.createTime > 0 ? new Date(p.createTime * 1000).toLocaleString(i18nMgr.getCurrentLocale(), { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--',
                    StringHelper.GetLongString(p.insurBet),
                    profitAmount('span', -p.insurWin),
                ],
                own: p.userRid === records.userRID,
            })));
        else if (state.tab === 'jackpot')
            this.table([t('UITexasReport_player', '玩家'), t('UIClubJackpotRecordDetail_ContributionTip', '贡献'), t('UIClubJackpotRecordDetail_AwardsTip', '奖励'), t('MX_HandType', '牌型')], report.jackpotRecords.map(p => ({
                cells: [
                    p.name,
                    StringHelper.GetLongString(p.contributeTotal),
                    profitAmount('span', p.awardTotal),
                    [[p.royalFlushCount, 'UIJackPotInfo_huangjia'], [p.straightFlushCount, 'UIJackPotInfo_tonghuashun'], [p.fourOfaKindCount, 'UIJackPotInfo_shitiao']]
                        .filter(([count]) => Number(count) > 0).map(([, key]) => t(String(key), '')).join('\n'),
                ],
                own: p.userRid === records.userRID,
            })));
        else {
            const snapshot = report.squidRounds.get(state.round);
            const rows = snapshot?.records ?? [];
            if (mode === 'mush')
                this.table([t('UITexasReport_player', '玩家'), t('UITexasReport_InMushRoom', '投蘑菇'), t('Uimine_ptcz_paygold', '筹码'), t('UITexasReport_OutMushRoom', '抓蘑菇'), t('Uimine_ptcz_paygold', '筹码')], rows.map(p => ({
                    cells: [p.name, p.in_num ? String(p.in_num) : '-', p.in_amount ? profitAmount('span', p.in_amount) : '-', String(p.out_num), profitAmount('span', p.out_amount)],
                    own: p.user_random_id === records.userRID,
                })));
            else
                this.table([t('UITexasReport_player', '玩家'), t('UISquid', '鱿鱼'), t('Uimine_ptcz_paygold', '筹码')], rows.map(p => ({
                    cells: [p.name, String(p.in_num), profitAmount('span', p.in_amount || -Math.abs(p.out_amount))],
                    own: p.user_random_id === records.userRID,
                })));
        }
        const s = report.summary;
        const avg = s.totalHand ? Math.trunc(s.totalPot / s.totalHand) : 0;
        const summary = [
            [t('UISituationTotalPot', '总底池'), amount(s.totalPot)],
            [t('UISituationTotalBringIn', '总带入'), StringHelper.GetLongString(s.totalBringin)],
            [t('UISituationCurHandNum', '总手数'), String(s.totalHand)],
            [t('UISituationVerBottom', '场均底池'), amount(avg)],
            [t('UISituationCurTime', '已用时间'), this.duration(s.startTime ? Date.now() / 1000 - s.startTime : 0)],
            [t('UITexasHistory_insurance', '保险池'), profitAmount('strong', s.insurance, StringHelper.GetLongString(s.insurance))],
        ] as const;
        this.summary.replaceChildren(...summary.map(([label, value]) => {
            const cell = element('div', '');
            cell.append(element('span', '', label), this.values.wrap(typeof value === 'string' ? element('strong', '', value) : value));
            return cell;
        }));
        const rail = element('div', 'mx-report-observer-rail');
        rail.append(...report.observers.map(p => {
            const item = element('button', 'mx-record-person');
            item.type = 'button'; item.onclick = () => void this.playerInfo.open(p);
            const img = element('img', ''); img.src = p.avatar; img.alt = ''; img.loading = 'lazy';
            img.onerror = () => img.style.visibility = 'hidden';
            item.append(img, element('span', '', StringHelper.LengthNick(p.name)));
            return item;
        }));
        this.observers.replaceChildren(element('h3', '', `${t('MX_Observers', '观众')}　${report.observers.length}`), rail);
        this.summary.hidden = this.observers.hidden = state.tab !== 'battle';
        const total = state.tab === 'mode' ? TexasReportPresentation.getTotalRound(report.squidRounds) : 0;
        this.pagination.root.hidden = total === 0;
        this.pagination.update(total ? state.round || total : 0, total, state.loading);
        this.pagination.labels(t('MX_ReportRound', '轮次'), t('MX_PreviousRound', '上一轮'), t('MX_NextRound', '下一轮'));
    }
    private table(headers: string[], rows: {
        cells: (string | HTMLElement)[];
        own?: boolean;
        offline?: boolean;
        player?: TexasReportPlayerInfo;
    }[]): void {
        const table = element('table', 'mx-record-table'), head = element('thead', ''), tr = element('tr', '');
        table.lang = i18nMgr.getCurrentLocale().replace('_', '-');
        table.dataset.columns = String(headers.length);
        table.dataset.tab = this.controller.state.tab;
        headers.forEach(label => tr.append(element('th', '', label)));
        head.append(tr);
        table.append(head);
        const body = element('tbody', '');
        rows.forEach(row => {
            const tr = element('tr', row.own ? 'mx-record-own' : '');
            tr.classList.toggle('mx-record-offline', !!row.offline);
            row.cells.forEach((value, index) => {
                const td = element('td', '');
                if (index === 0 && row.player) {
                    const player = row.player;
                    const button = element('button', 'mx-report-player-link');
                    button.type = 'button';
                    button.onclick = () => void this.playerInfo.open(player);
                    button.append(value);
                    td.append(button);
                } else if (index > 0 && !(this.controller.state.tab === 'jackpot' && index === 3)) {
                    td.append(this.values.wrap(value));
                } else {
                    td.append(value);
                }
                tr.append(td);
            });
            body.append(tr);
        });
        table.append(body);
        this.list.append(table);
        if (!rows.length)
            this.list.append(element('p', 'mx-record-empty', t('UICareerRecordNon', '暂无数据')));
    }
    private renderTime(): void {
        const { records } = this.controller, s = records.data.report.summary, record = records.data.record;
        const remain = s.startTime && record?.playDuration ? this.duration(record.playDuration - (Date.now() / 1000 - s.startTime)) : '--:--:--';
        this.room.textContent = `${records.target.roomID}-${records.data.snapshot?.handInfo?.handNum ?? 0}`;
        this.remaining.textContent = `${t('UISituationRemainTime', '剩余时间')}　 ${remain}`;
    }
    private duration(value: number): string { const seconds = Math.max(0, Math.floor(value)); return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(v => String(v).padStart(2, '0')).join(':'); }
    open(): void { this.controller.open(); }
    onFrameResize(w: number, h: number): void {
        this.dialog.onFrameResize(w, h);
        // The report uses the full 1252-wide design canvas, independent of screen height.
        const designWidth = Math.min(w, config.layout.maxPanelWidth / config.layout.panelWidthRatio);
        this.root.style.setProperty('--record-unit', `${designWidth / config.layout.designWidth}px`);
        this.playerInfo.onFrameResize(w, h);
    }
    destroy(): void { clearInterval(this.tick); this.bindings.destroy(); this.controller.destroy(); this.values.clear(); this.playerInfo.destroy(); this.dialog.destroy(); }
}
