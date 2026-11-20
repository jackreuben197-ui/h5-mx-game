import type { RoomRecords } from '../../../../../core/RoomRecords.js';
import type { MttReportResult, MttReportSection } from '../../../../../core/MttReport.js';
import { getMttBlindLevels } from '../../../../../logic/MttBlindTable.js';
import { mttDuration, mttReportTiming } from '../../../../../logic/MttReportTiming.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { resolveTemplateTextByKey } from '../../../../../i18n/resolveTemplateTextByKey.js';
import { HttpError } from '../../../../../net/http/HttpError.js';
import { MttReportConfig } from '../../../../../config/MttReportConfig.js';
import Mtt from '../../../../../data/TexasGameRoomDataMtt.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import { RecordPaginationView } from '../RecordPaginationView/RecordPaginationView.js';
import { ReportValueFitter } from '../ReportView/ReportValueFitter.js';
import recordConfig from '../RecordDialogView/config.json';
import reportConfig from '../ReportView/config.json';
import config from './config.json';
import './layout.css';

type Tab = 'players' | 'rooms' | 'real_prize' | 'blinds';
type Page = Exclude<MttReportSection, 'detail'>;
const tabs: [Tab, string, string][] = [
    ['players', 'UITexasReport_player', '玩家'], ['rooms', 'UITexasReport_Label_AllBarPZ', '牌桌'],
    ['real_prize', 'MTT_State_Reward', '奖励'], ['blinds', 'UITexasReport_Text_BlindBlindTip', '盲注'],
];
const t = (key: string, fallback: string) => i18nMgr.Get(key, [], fallback);

/** Tournament report stays inside the table; H5 supplies the shared font faces. */
export class MttReportView {
    readonly dialog: RecordDialogView;
    private detail: MttReportResult = {};
    private tab: Tab = 'players';
    private mode: 'ranks' | 'hranks' = 'ranks';
    private offset = 0;
    private generation = 0;
    private pageVersion = 0;
    private languageVersion = 0;
    private readonly names = new Map<string, string>();
    private readonly pages = new Map<string, MttReportResult>();
    private readonly emptyPlayers = new Set<string>();
    private readonly values = new ReportValueFitter();
    private readonly overview = element('div', 'mx-mtt-overview');
    private readonly tabBar = element('div', 'mx-mtt-tabs');
    private readonly modeBar = element('div', 'mx-mtt-modes');
    private readonly content = element('div', 'mx-mtt-content');
    private readonly elapsed = element('strong', 'mx-mtt-elapsed');
    private readonly clock = element('strong', 'mx-mtt-clock');
    private readonly pagination = new RecordPaginationView(page => { this.offset = (page - 1) * MttReportConfig.pageSize; void this.loadPage(); });
    private timer?: ReturnType<typeof setInterval>;
    private detailLoading = false;
    private pageLoading = false;
    private detailError = '';
    private pageError = '';
    private lastRefresh = 0;
    private offMtt?: () => void;

    constructor(private readonly records: RoomRecords) {
        this.dialog = new RecordDialogView(() => this.names.get(this.detail.mtt?.name ?? '') || t('UIMine_RecordList', '战绩'), () => this.close(), 'left', config.layout.dockTop);
        this.dialog.root.classList.add('mx-mtt-report');
        this.dialog.header.after(this.overview, this.tabBar, this.modeBar);
        this.dialog.body.append(this.content);
        this.dialog.footer.append(this.pagination.root);
        this.tabBar.setAttribute('role', 'tablist');
        this.tabBar.setAttribute('aria-label', t('UIMine_RecordList', '战绩'));
        this.content.id = this.dialog.panel.getAttribute('aria-labelledby') + '-content';
        this.content.setAttribute('role', 'tabpanel');
        i18nMgr.register(this);
    }

    open(): void {
        ++this.generation;
        this.detail = {};
        this.tab = 'players'; this.mode = 'ranks'; this.offset = 0;
        this.pages.clear(); this.emptyPlayers.clear(); this.names.clear(); ++this.languageVersion;
        this.detailError = this.pageError = '';
        this.detailLoading = this.pageLoading = false;
        this.lastRefresh = 0;
        this.dialog.show(true);
        this.offMtt?.();
        this.offMtt = this.records.data.mtt?.on(Mtt.STATE_CHANGED, () => {
            if (this.records.data.mtt?.blindLevel !== this.detail.more?.bl) void this.refreshDetail();
            this.tick();
        });
        this.dialog.refreshTitle(); this.render();
        clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(), MttReportConfig.tickMs);
        void this.refreshDetail(); void this.loadPage();
    }

    private close(): void {
        ++this.generation; ++this.pageVersion; ++this.languageVersion;
        clearInterval(this.timer); this.timer = undefined;
        this.values.clear();
        this.offMtt?.(); this.offMtt = undefined;
        this.dialog.show(false);
    }
    destroy(): void { this.close(); this.dialog.destroy(); }

    onFrameResize(width: number, height: number): void {
        this.dialog.onFrameResize(width, height);
        const panelWidth = Math.min(width * config.layout.designWidth / config.layout.screenWidth, recordConfig.layout.desktopWidth);
        // The close button and pagination use the same design scale as the cash report.
        const maxWidth = width > height ? reportConfig.layout.desktopPanelWidth : reportConfig.layout.maxPanelWidth;
        const designWidth = Math.min(width, maxWidth / reportConfig.layout.panelWidthRatio);
        this.dialog.root.style.setProperty('--record-unit', `${designWidth / reportConfig.layout.designWidth}px`);
        this.dialog.root.style.setProperty('--record-width', `${panelWidth}px`);
        this.dialog.root.style.setProperty('--mtt-unit', `${panelWidth / config.layout.designWidth}px`);
        this.dialog.root.dataset.compact = String(height < config.layout.compactHeight * panelWidth / config.layout.designWidth);
        this.dialog.root.dataset.shortLandscape = String(width > height && height < config.layout.shortLandscapeHeight);
    }

    refreshLanguage(): void {
        ++this.languageVersion; this.names.clear();
        if (!this.dialog.root.hidden) this.render();
    }

    private resolveName(raw: string): string {
        if (this.names.has(raw)) return this.names.get(raw)!;
        const version = this.languageVersion, generation = this.generation, fallback = t(raw, raw);
        this.names.set(raw, fallback);
        if (raw) void resolveTemplateTextByKey(raw).then(name => {
            if (version !== this.languageVersion || generation !== this.generation || this.dialog.root.hidden) return;
            if (name !== raw && name !== fallback) { this.names.set(raw, name); this.render(); }
        });
        return fallback;
    }

    private get section(): Page | undefined { return this.tab === 'blinds' ? undefined : this.tab === 'players' ? this.mode : this.tab; }
    private get pageKey(): string { return `${this.section}:${this.offset}`; }
    private get page(): MttReportResult { return this.pages.get(this.pageKey) ?? {}; }
    private get hunter(): boolean { return Number(this.detail.mtt?.hunter_on ?? 0) > 0; }
    private money(value?: number): string { return value == null || !Number.isFinite(value) ? '—' : StringHelper.GetLongString(value, this.detail.mtt?.gold_type === 4 ? 1 : 100); }
    private blinds(sb?: number): string { return sb == null ? '—' : `${this.money(sb)}/${this.money(sb * 2)}`; }
    private duration(): string { return this.detail.mtt?.upblind_interval ? i18nMgr.Get('UITexasReport_Text_MatchNextBlindTime', [Math.floor(this.detail.mtt.upblind_interval / 60)], '{0}min') : '—'; }

    private async refreshDetail(): Promise<void> {
        if (this.detailLoading || !this.records.mttReport) return;
        const generation = this.generation;
        this.detailLoading = true; this.lastRefresh = Date.now();
        try {
            const detail = await this.records.mttReport('detail');
            if (generation !== this.generation) return;
            this.detail = detail; this.detailError = '';
            if (!this.hunter) this.mode = 'ranks';
            this.render();
        } catch (error) {
            if (generation === this.generation) { this.detailError = error instanceof Error ? error.message : String(error); this.render(); }
        } finally { if (generation === this.generation) this.detailLoading = false; }
    }

    private async loadPage(retry = false): Promise<void> {
        const section = this.section;
        const version = ++this.pageVersion, generation = this.generation, key = this.pageKey;
        this.pageError = ''; this.pageLoading = false;
        this.dialog.body.scrollTop = 0;
        if (!section || (!retry && this.pages.has(key))) { this.render(); return; }
        this.pageLoading = true; this.render();
        try {
            if (!this.records.mttReport) throw Error(t('MX_Retry', '请重试'));
            const page = await this.records.mttReport(section, this.offset);
            if (generation !== this.generation || version !== this.pageVersion) return;
            this.pages.set(key, page);
        } catch (error) {
            if (generation === this.generation && version === this.pageVersion) {
                if (error instanceof HttpError && error.code === 10001) { this.pages.set(key, {records: []}); this.emptyPlayers.add(key); }
                else this.pageError = error instanceof Error ? error.message : String(error);
            }
        } finally {
            if (generation === this.generation && version === this.pageVersion) { this.pageLoading = false; this.render(); }
        }
    }

    private tick(): void {
        if (!this.detail.mtt) { this.clock.textContent = this.elapsed.textContent = '—'; return; }
        const timing = mttReportTiming(this.detail);
        this.elapsed.textContent = mttDuration(timing.elapsed, true);
        const live = this.records.data.mtt;
        const liveDeadline = !timing.preStart && live && live.blindLevel >= (this.detail.more?.bl ?? 0) ? live.upBlindDeadline : 0;
        const deadline = liveDeadline || timing.deadline;
        const remaining = liveDeadline ? Math.max(0, Math.ceil(liveDeadline - Date.now() / 1000)) : timing.remaining;
        this.clock.textContent = timing.preStart && remaining > 3600
            ? new Date(timing.start * 1000).toLocaleTimeString(i18nMgr.getCurrentLocale(), {hour: '2-digit', minute: '2-digit', hour12: false})
            : mttDuration(Math.min(remaining, MttReportConfig.maxTimerSeconds));
        this.clock.setAttribute('aria-label', t(timing.preStart ? 'UIMTT_ListdistancestartTip' : 'UITexasReport_Text_MatchZmsysjTip', timing.preStart ? '距离开赛' : '涨盲剩余时间'));
        if (deadline && remaining === 0 && Date.now() - this.lastRefresh >= MttReportConfig.refreshMs) void this.refreshDetail();
    }

    private button(label: string, click: () => void): HTMLButtonElement {
        const button = element('button', '', label); button.type = 'button'; button.onclick = click; return button;
    }

    private render(): void {
        if (this.dialog.root.hidden) return;
        const scroll = this.dialog.body.scrollTop;
        const focused = this.dialog.panel.contains(document.activeElement) ? document.activeElement?.id : undefined;
        this.values.clear();
        const {mtt, more} = this.detail;
        if (mtt?.name) this.resolveName(mtt.name);
        this.dialog.refreshTitle();
        const rankPages = [...this.pages.entries()].filter(([key]) => key.startsWith('ranks:')).map(([, page]) => page);
        const rank = rankPages.flatMap(page => page.records ?? []).find(row => Number(row.urid) === this.records.userRID)?.rank || this.records.data.mtt?.currentRank;
        const alive = rankPages[0]?.alive ?? this.detail.alive;
        const stat = (key: string, fallback: string, value: string | HTMLElement) => {
            const item = element('div', 'mx-mtt-stat');
            item.append(element('span', 'mx-mtt-label', t(key, fallback)), this.values.wrap(typeof value === 'string' ? element('strong', '', value) : value));
            return item;
        };
        const left = element('div', 'mx-mtt-column');
        left.append(stat('UITexasReportMTT_MyRank_Tip', '我的排名', rank ? String(rank) : '—'), stat('UITexasReport_Text_MatchNextBlindTimeTip', '下一注时长', this.duration()), stat('MTT_State_UseTime', '比赛已进行', this.elapsed), stat('UIMTT_chouma5', '最大筹码', this.money(more?.max_chip)));
        const center = element('div', 'mx-mtt-column mx-mtt-center');
        const clockCard = element('div', 'mx-mtt-clock-card');
        clockCard.append(this.values.wrap(this.clock));
        center.append(stat('UITexasReport_Text_BlindLevelTip', '当前级别', this.blinds(more?.sb)), clockCard, stat('UIMTT_chouma2', '平均筹码', this.money(more?.avg_chip)));
        const right = element('div', 'mx-mtt-column');
        right.append(stat('UITexasReport_Text_MatchOnTableBuy', '在桌/买入', `${alive ?? '—'}/${mtt?.total_buy_times ?? '—'}`), stat('UITexasReport_Text_MatchTotalBonusTip', '总奖池', this.money(more?.prize_pool ?? this.detail.real_prize?.award)), stat('UITexasReport_Text_MatchNextBlindTip', '下一盲注', this.blinds(more?.nsb)), stat('UIMTT_chouma3', '最小筹码', this.money(more?.min_chip)));
        this.overview.replaceChildren(left, center, right);
        this.tabBar.replaceChildren(...tabs.map(([id, key, fallback]) => {
            const button = this.button(t(key, fallback), () => { if (this.tab !== id) { this.tab = id; this.offset = 0; void this.loadPage(); } });
            button.id = this.content.id + '-' + id;
            button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(id === this.tab)); button.setAttribute('aria-controls', this.content.id);
            return button;
        }));
        this.content.setAttribute('aria-labelledby', this.content.id + '-' + this.tab);
        this.modeBar.hidden = this.tab !== 'players' || !this.hunter;
        this.modeBar.replaceChildren(...(['ranks', 'hranks'] as const).map(mode => {
            const button = this.button(t(mode === 'ranks' ? 'Ranking' : 'Hunter_Rank', mode === 'ranks' ? '排名' : '猎人榜'), () => { if (this.mode !== mode) { this.mode = mode; this.offset = 0; void this.loadPage(); } });
            button.setAttribute('aria-pressed', String(this.mode === mode)); return button;
        }));
        this.renderContent(); this.renderStatus(); this.tick();
        this.dialog.body.scrollTop = scroll;
        if (focused) this.dialog.panel.querySelector<HTMLElement>(`[id="${focused}"]`)?.focus({preventScroll: true});
    }

    private renderStatus(): void {
        this.dialog.status.textContent = this.detailError || this.pageError;
        this.content.setAttribute('aria-busy', String(this.pageLoading));
    }

    private renderContent(): void {
        const page = this.page, {mtt, more} = this.detail, records = page.records ?? [];
        this.content.replaceChildren();
        if (this.pageError || this.detailError) this.content.append(this.button(t('MX_Retry', '重试'), () => { void this.refreshDetail(); void this.loadPage(true); }));
        const table = element('table', 'mx-mtt-table');
        const head = element('thead', ''), body = element('tbody', ''); table.append(head, body);
        const row = (values: (string | number | HTMLElement | undefined)[], header = false) => {
            const tr = element('tr', '');
            for (const value of values) {
                const cell = element(header ? 'th' : 'td', '');
                cell.append(value instanceof HTMLElement ? value : header ? this.values.wrap(String(value ?? '—').replace(/\s+/g, '\n')) : document.createTextNode(String(value ?? '—')));
                tr.append(cell);
            }
            (header ? head : body).append(tr); return tr;
        };
        if (this.tab === 'blinds') {
            row([t('UITexasReport_Text_BlindLevelTip', '级别'), t('UITexasReport_Text_BlindBlindTip', '盲注'), t('UITexasReport_Text_BlindAnteTip', '前注'), t('UITexasReport_Text_BlindBlindTimeTip', '时长')], true);
            getMttBlindLevels(mtt?.blindtable_type).forEach((blind, index) => {
                const level = index + 1, cell = element('span', 'mx-mtt-level', `${level === more?.bl ? '▶ ' : ''}${level}`);
                const marker = level === mtt?.addon_end_bl ? ['MTT_Blind_Deadline_add_cl', '增购结束', 'addon-end'] : level === mtt?.addon_begin_bl ? ['MTT_Blind_Deadline_add_op', '增购开始', 'addon-begin'] : level === mtt?.max_rebuy_bl ? ['MTT_Blind_Deadline_to_buy', '重购截止', 'rebuy-end'] : undefined;
                if (marker) { const label = element('small', '', t(marker[0]!, marker[1]!)); cell.dataset.marker = marker[2]!; cell.append(label); }
                const format = (value: number) => StringHelper.GetLongString(value);
                const tr = row([cell, this.values.wrap(`${format(blind.sb)}/${format(blind.sb * 2)}`), this.values.wrap(format(blind.ante)), this.duration()]);
                if (level === more?.bl) tr.setAttribute('aria-current', 'true');
            });
        } else if (this.tab === 'real_prize') {
            const summary = element('div', 'mx-mtt-rewards');
            summary.append(element('span', '', `${t('UITexasReport_Text_RewardTotalBonusTip', '总奖池')} ${this.money(page.award ?? this.detail.real_prize?.award)}`), element('span', '', i18nMgr.Get('UITexasReport_Text_RewardReward', [page.award_num ?? this.detail.real_prize?.award_num ?? 0], '获奖人数 {0}')));
            this.content.append(summary);
            row([t('UI_Rank', '名次'), t('MTT_State_Reward', '奖励')], true);
            for (const prize of page.prizes ?? this.detail.real_prize?.prizes ?? []) {
                const rewards = (prize.goods ?? []).map(good => `${this.resolveName(good.na)} ×${good.n}`);
                if (prize.award) rewards.unshift(this.money(prize.award));
                if (this.hunter) rewards.push(t('UIReward_Bounty', '赏金'));
                const value = element('span', 'mx-mtt-reward');
                if (prize.award) { const icon = element('span', 'mx-mtt-reward-icon'); SpriteAtlas.paint(icon, config.paths.chips); value.append(icon); }
                value.append(document.createTextNode(rewards.join(' + ') || '—'));
                row([prize.max > prize.min ? `${prize.min}–${prize.max}` : prize.min, value]);
            }
        } else if (this.tab === 'rooms') {
            row([t('UITexasReport_Text_DeskNumTip', '桌号'), t('UITexasReport_Text_DeskPlayerCountTip', '玩家数'), t('UIMTT_chouma3', '最少筹码'), t('UIMTT_chouma5', '最多筹码')], true);
            for (const room of records) { const chips = (room.roomers ?? []).map(player => player.chip); row([room.rid, chips.length, chips.length ? this.money(Math.min(...chips)) : '—', chips.length ? this.money(Math.max(...chips)) : '—']); }
        } else {
            const hunter = this.mode === 'hranks'; table.dataset.mode = this.mode;
            if (!hunter) {
                const columns = element('colgroup', '');
                for (const name of ['rank', 'player', 'room', 'chips']) columns.append(element('col', `mx-mtt-col-${name}`));
                table.prepend(columns);
            }
            row([t('UI_Rank', '排名'), t('UITexasReport_player', '玩家'), ...(hunter ? [t('UIReward_Bounty', '赏金')] : [t('UITexasReport_Text_DeskNumTip', '桌号'), t('UIChipsBB', '筹码')])], true);
            for (const player of records) {
                const chips = (player.chip ?? 0) > 0 ? `${this.money(player.chip)}${(page.sb ?? 0) > 0 ? `(${Number((player.chip! / (page.sb! * 2)).toFixed(1))}BB)` : ''}` : '—';
                row([player.rank, player.name, ...(hunter ? [player.award] : [(player.rid ?? 0) > 0 ? player.rid : '—', this.values.wrap(chips)])]);
            }
        }
        this.content.append(table);
        if (!body.children.length) this.content.append(element('p', 'mx-record-empty', this.pageLoading ? t('MX_Loading', '加载中…') : this.tab === 'players' && this.emptyPlayers.has(this.pageKey) ? t('MTTDetailPlayer_nulltips', '比赛开始后展示玩家排名') : t('UICareerRecordNon', '暂无数据')));
        const current = this.offset / MttReportConfig.pageSize + 1;
        const total = page.total != null ? Math.ceil(page.total / MttReportConfig.pageSize) : current + (records.length === MttReportConfig.pageSize ? 1 : 0);
        this.pagination.labels(t('UIMine_RecordList', '战绩'), t('MX_PreviousRound', '上一页'), t('MX_NextRound', '下一页'));
        this.pagination.update(current, Math.max(1, total), this.pageLoading);
        this.dialog.footer.hidden = this.tab === 'blinds' || this.tab === 'real_prize' || total < 2;
    }
}
