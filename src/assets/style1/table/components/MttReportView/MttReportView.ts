import type { RoomRecords } from '../../../../../core/RoomRecords.js';
import type { MttReportResult, MttReportSection } from '../../../../../core/MttReport.js';
import { getMttBlindLevels } from '../../../../../logic/MttBlindTable.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { element } from '../../dom.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import config from './config.json';

type Tab = Exclude<MttReportSection, 'detail'> | 'blinds';
const tabs: [Tab,string,string][] = [
    ['ranks','UITexasReport_player','玩家'], ['hranks','UIReward_Bounty','猎人榜'],
    ['rooms','UITexasReport_Label_AllBarPZ','牌桌'], ['real_prize','UIReward','奖励'],
    ['blinds','UITexasReport_Label_AllBarMZ','盲注'],
];
const t = (key:string, fallback:string) => i18nMgr.Get(key,[],fallback);
export class MttReportView {
    readonly dialog = new RecordDialogView(() => this.detail?.mtt?.name || t('UIMine_RecordList','战绩'), () => this.close(), 'left', config.layout.dockTop);
    private detail: MttReportResult = {};
    private tab: Tab = 'ranks';
    private version = 0;
    private offset = 0;
    private rank?: number;
    private readonly elapsed = element('strong','');
    private timer?: ReturnType<typeof setInterval>;
    private readonly clock = element('strong','');
    constructor(private records: RoomRecords) {
        this.dialog.root.classList.add('mx-report-overlay','mx-mtt-report');
    }
    private close() {
        this.version++;
        clearInterval(this.timer);
        this.dialog.show(false);
    }
    destroy() { this.close(); this.dialog.destroy(); }
    open() {
        this.detail = {};
        this.rank = undefined;
        this.tab = 'ranks';
        this.offset = 0;
        this.dialog.show(true);
        clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(),1000);
        void this.load();
    }
    private tick() {
        const rawStart=this.detail.mtt?.start_time ?? 0;
        const start=rawStart>1e12 ? rawStart/1000 : rawStart;
        const used=start?Math.max(0,Math.floor(Date.now()/1000-start)):0;
        this.elapsed.textContent=[Math.floor(used/3600), Math.floor(used/60)%60, used%60].map(n=>String(n).padStart(2,'0')).join(':');
        const interval = this.detail.mtt?.upblind_interval ?? 0;
        const preStart = this.detail.mtt?.status === 0;
        const deadline = preStart ? start : (this.detail.more?.nu ?? 0) + interval;
        const remaining = Math.max(0, Math.ceil(deadline - Date.now()/1000));
        const seconds = preStart ? remaining : interval && (remaining % interval || interval);
        this.clock.textContent = deadline ? Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0') : '—';
        if (deadline && remaining === 0 && !this.dialog.body.getAttribute('aria-busy') && Date.now()/1000 - deadline < 2) void this.load();
    }
    private button(label:string, click:()=>void) {
        const button = element('button','',label);
        button.type='button';
        button.onclick=click;
        return button;
    }
    private async load() {
        const version = ++this.version;
        const {tab,offset} = this;
        this.dialog.body.setAttribute('aria-busy','true');
        this.dialog.body.replaceChildren();
        this.dialog.status.textContent=t('MX_Loading','加载中…');
        this.renderTabs();
        try {
            if (!this.records.mttReport) throw Error(t('MX_Retry','请重试'));
            const [detail,page] = await Promise.all([this.records.mttReport('detail'), tab === 'blinds' ? Promise.resolve({} as MttReportResult) : this.records.mttReport(tab,offset)]);
            if (version !== this.version) return;
            this.detail=detail;
            if (page.alive != null) this.detail.alive = page.alive;
            if(tab==='ranks')this.rank=page.records?.find(r=>r.urid===this.records.userRID)?.rank ?? this.rank;
            this.dialog.refreshTitle();
            this.dialog.status.textContent='';
            this.render(page);
        } catch (error) {
            if (version !== this.version) return;
            this.dialog.status.textContent=String(error);
            this.dialog.body.append(this.button(t('MX_Retry','重试'),()=>void this.load()));
        } finally {
            if (version === this.version) this.dialog.body.removeAttribute('aria-busy');
        }
    }
    private render(page:MttReportResult) {
        const {mtt,more} = this.detail;
        const money = (n?:number) => n == null ? '—' : String(n/(mtt?.gold_type===4?1:100));
        const blinds = (sb?:number) => sb == null ? '—' : money(sb)+'/'+money(sb*2);
        const summary = element('div','mx-mtt-overview');
        for (const [label,value] of [
            [t('UITexasReportMTT_MyRank_Tip','我的排名'),this.rank], [t('MTT_State_UseTime','比赛已进行'),this.elapsed],
            [t('UITexasReport_Text_MatchNextBlindTimeTip','下一注时长'),(mtt?.upblind_interval??0)/60+' min'],
            [t('UIMTT_chouma5','最大筹码'),money(more?.max_chip)], [t('UIMTT_chouma2','平均筹码'),money(more?.avg_chip)],
            [t('UIMTT_chouma3','最小筹码'),money(more?.min_chip)],
            [t('UITexasReport_Text_BlindLevelTip','级别'),more?.bl], [t('UITexasReport_Text_MatchOnTableBuy','在桌/买入'),(this.detail.alive??'—')+'/'+(mtt?.total_buy_times??'—')],
            [t('UITexasReport_Text_MatchTotalBonusTip','总奖池'),money(more?.prize_pool??this.detail.real_prize?.award)],
            [t('UITexasReport_Text_MatchNextBlindTip','下一盲注'),blinds(more?.nsb)],
            [t('UISB','小盲')+'/'+t('UIBB','大盲'),blinds(more?.sb)],
            [t('UITexasReport_Text_MatchZmsysjTip','剩余时间'),this.clock],
        ] as const) {
            const cell=element('div','',label+' ');
            cell.append(value instanceof HTMLElement ? value : element('strong','',String(value??'—')));
            summary.append(cell);
        }
        this.tick();
        this.dialog.body.append(summary);
        const table=element('table','mx-record-table');
        const row=(values:(string|number|undefined)[],header=false)=>{
            const tr=element('tr','');
            for (const value of values) tr.append(element(header?'th':'td','',String(value??'—')));
            table.append(tr);
        };
        const current=this.tab;
        const records=page.records??[];
        if (current==='blinds') {
            row([t('UITexasReport_Text_BlindLevelTip','级别'),t('UIBB','盲注'),t('UITexasReport_Text_BlindAnteTip','前注'),t('UITexasReport_Text_BlindBlindTimeTip','时长')],true);
            getMttBlindLevels(mtt?.blindtable_type).forEach((v,i)=>{
                const level = i+1;
                const marker = level===mtt?.addon_end_bl ? t('MTT_Blind_Deadline_add_cl','增购结束') : level===mtt?.addon_begin_bl ? t('MTT_Blind_Deadline_add_op','增购开始') : level===mtt?.max_rebuy_bl ? t('MTT_Blind_Deadline_to_buy','重购截止') : '';
                row([(level===more?.bl?'▶ ':'')+level+' '+marker, v.sb/100+'/'+v.sb*2/100, v.ante/100,(mtt?.upblind_interval??0)/60+' min']);
            });
        } else if (current==='real_prize') {
            row([t('UIRank','名次'),t('UIReward','奖励')],true);
            this.dialog.body.append(element('p', '', t('UITexasReport_Text_MatchTotalBonusTip','总奖池')+' '+money(page.award ?? this.detail.real_prize?.award)+' · '+i18nMgr.Get('UITexasReport_Text_RewardReward',[page.award_num ?? this.detail.real_prize?.award_num ?? 0],'获奖人数 {0}')));
            for (const p of page.prizes??this.detail.real_prize?.prizes??[]) {
                const rewards = (p.goods ?? []).map(g => t(g.na,g.na)+' × '+g.n);
                if (p.award) rewards.unshift(money(p.award));
                if (mtt?.hunter_on) rewards.push(t('UIReward_Bounty','赏金'));
                row([p.max>p.min?p.min+'–'+p.max:p.min,rewards.join(' + ') || '—']);
            }
        } else if (current==='rooms') {
            row([t('UITexasReport_Text_DeskNumTip','桌号'),t('UITexasReport_player','玩家'),t('MX_Min','最少筹码'),t('MX_Max','最多筹码')],true);
            for(const r of records){const chips=(r.roomers??[]).map(p=>p.chip);row([r.rid,chips.length,chips.length?money(Math.min(...chips)):'—',chips.length?money(Math.max(...chips)):'—']);}
        } else {
            const hunter=current==='hranks';
            row([t('UIRank','排名'),t('UITexasReport_player','玩家'),...(hunter?[t('UIReward_Bounty','赏金')]:[t('UITexasReport_Text_DeskNumTip','桌号'),t('UIChipsBB','筹码')])],true);
            for(const r of records)row([r.rank,r.name,...(hunter?[r.award]:[r.rid,money(r.chip)+(page.sb && r.chip ? ' ('+(r.chip/(2*page.sb)).toFixed(1)+'BB)' : '')])]);
        }
        this.dialog.body.append(table);
        if (table.rows.length===1) this.dialog.body.append(element('p','mx-record-empty',t('UICareerRecordNon','暂无数据')));
        if(this.offset>0 || records.length===50) {
            const pageBy=(delta:number)=>{this.offset+=delta;void this.load();};
            if(this.offset>0)this.dialog.body.append(this.button(t('MX_PreviousRound','上一页'),()=>pageBy(-50)));
            if(records.length===50)this.dialog.body.append(this.button(t('MX_NextRound','下一页'),()=>pageBy(50)));
        }
        this.renderTabs();
    }
    private renderTabs() {
        const mtt = this.detail.mtt;
        this.dialog.footer.replaceChildren();
        for(const [id,key,label] of tabs) {
            if(id==='hranks' && !mtt?.hunter_on)continue;
            const button=this.button(t(key,label),()=>{this.tab=id;this.offset=0;void this.load();});
            button.setAttribute('aria-pressed',String(id===this.tab));
            this.dialog.footer.append(button);
        }
    }
}
