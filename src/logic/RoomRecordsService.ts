import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { DiamondModel } from '../data/DiamondModel.js';
import type { PrivateUcChargeStore } from '../data/PrivateUcChargeStore.js';
import type { HistoryQuote } from '../core/HistoryQuote.js';
import { HistoryPricing } from './HistoryPricing.js';
import { canWatchPlayerCards, canWatchPublicCards } from './ViewPlayerCardsConfig.js';
import { parseHistoryHand, hasHiddenCards, hasHiddenPublicCards, getViewPubRound } from './HistoryReplayModel.js';
import type { RoomRecords } from '../core/RoomRecords.js';
import type { RoomTarget } from '../core/types.js';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { ReplayHandData } from '../data/ReplayHandData.js';
import type { TexasReportRoundMode, TexasReportSquidRecord } from '../data/TexasGameRoomDataReport.js';
import type { ProtocolClient } from '../net/ProtocolClient.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
import type { HttpClient } from '../net/http/HttpClient.js';
import { RoomersRequest } from '../net/requests/RoomersRequest.js';
import { PlayerJackpotSummaryRequest } from '../net/requests/PlayerJackpotSummaryRequest.js';
import { PublicReplayRequest } from '../net/requests/PublicReplayRequest.js';
import { ReplayStorage } from '../host/ReplayStorage.js';
import type { HostTransport } from '../host/HostTransport.js';
export class RoomRecordsService implements RoomRecords {
    private roomersTask?: Promise<void>;
    private replayTask?: Promise<ReplayHandData | null>;
    private replayHand = -1;
    private storage: ReplayStorage;
    constructor(readonly data: ProtocolRoomData, readonly target: RoomTarget, readonly userRID: number, private client: ProtocolClient, private pb: HoldemRuntime, private http: HttpClient, private signal: AbortSignal, transport: HostTransport, readonly config: {
        global: GlobalConfigStore;
        diamonds: DiamondModel;
        privateUc: PrivateUcChargeStore;
    }) {
        this.storage = new ReplayStorage(transport, userRID, target.roomID, target.matchID);
    }
    refreshReport(): Promise<void> {
        if (this.roomersTask)
            return this.roomersTask;
        this.data.report.roomersLoading = true;
        return this.roomersTask = new RoomersRequest(this.client, this.pb).execute(this.target, this.signal).then(result => {
            this.signal.throwIfAborted();
            if (result.status !== 0)
                throw new Error(`战绩请求失败（${result.status}）`);
        }).finally(() => { this.roomersTask = undefined; this.data.report.roomersLoading = false; });
    }
    async jackpot(): Promise<void> {
        if (this.data.report.jackpotFetched)
            return;
        const result = await new PlayerJackpotSummaryRequest(this.client, this.pb).execute(this.target, this.signal);
        this.signal.throwIfAborted();
        if (result.status !== 0)
            throw new Error(`Jackpot 请求失败（${result.status}）`);
    }
    private async post<T>(path: string, body: unknown): Promise<T> {
        const value = await this.http.request<T | {
            data: T;
        }>(path, body, { signal: this.signal, clubID: this.data.record?.clubId });
        this.signal.throwIfAborted();
        return value && typeof value === 'object' && 'data' in value && value.data !== undefined ? value.data : value as T;
    }
    async insurance(): Promise<void> {
        if (this.data.report.insuranceFetched)
            return;
        const value = await this.post<{
            list?: {
                user_rid?: number;
                nick_name?: string;
                hand_num?: number;
                insur_bet?: number;
                insur_win?: number;
                create_time?: number;
            }[];
        }>('/api/stats/room/insurance_data', { room_id: this.target.roomID, limit: 200, offset: 0 });
        this.data.report.setInsuranceRecords((value?.list ?? []).map(record => ({ userRid: Number(record.user_rid || 0), name: String(record.nick_name || ''),
            handNum: Number(record.hand_num || 0), insurBet: Number(record.insur_bet || 0), insurWin: Number(record.insur_win || 0), createTime: Number(record.create_time || 0) })));
    }
    async round(mode: TexasReportRoundMode, round: number): Promise<number> {
        this.data.report.prepareSquidRoundMode(mode);
        if (round > 0 && this.data.report.squidRounds.has(round))
            return round;
        const value = await this.post<{
            round?: number;
            total?: number;
            start_hand?: number;
            end_hand?: number;
            records?: Partial<TexasReportSquidRecord>[];
        }>(`/api/roomcenter/history/${this.target.roomID}/${mode === 'mush' ? 'mushroom' : 'squid'}`, { round });
        const selected = Number(value?.round || round || value?.total || 1);
        this.data.report.setSquidRound(mode, selected, { totalRound: Number(value?.total || 0), startHand: Number(value?.start_hand || 0), endHand: Number(value?.end_hand || 0),
            records: (value?.records ?? []).map(record => ({ name: String(record.name || ''), in_num: Number(record.in_num || 0), in_amount: Number(record.in_amount || 0), out_num: Number(record.out_num || 0), out_amount: Number(record.out_amount || 0), user_random_id: Number(record.user_random_id || 0) })) });
        return selected;
    }
    replay(hand: number): Promise<ReplayHandData | null> {
        if (this.replayTask)
            return this.replayHand === hand ? this.replayTask : Promise.reject(new Error('牌谱正在加载，请稍候'));
        this.replayHand = hand;
        return this.replayTask = this.loadReplay(hand).finally(() => { this.replayTask = undefined; this.replayHand = -1; });
    }
    private async loadReplay(hand: number): Promise<ReplayHandData | null> {
        if (!Number.isInteger(hand) || hand < 1)
            throw new Error('无效手数');
        this.signal.throwIfAborted();
        this.data.replay.pendingHandNum = hand;
        const cached = this.data.replay.getCached(hand) ?? await this.storage.get(hand, this.signal);
        this.signal.throwIfAborted();
        if (cached?.s?.hand === hand) {
            this.data.replay.applyReplay(cached);
            return cached;
        }
        try {
            await new PublicReplayRequest(this.client, this.pb).execute(this.target, this.signal, hand, this.data.snapshot?.roomInfo?.uniqueId ?? '');
            this.signal.throwIfAborted();
            const value = this.data.replay.getCached(hand) ?? null;
            if (value)
                this.storage.put(hand, value, this.signal);
            else if (this.data.replay.pendingHandNum === hand)
                throw new Error('牌谱回包手数不匹配，请重试');
            else
                this.data.replay.applyEmpty();
            return value;
        }
        catch (error) {
            this.data.replay.pendingHandNum = -1;
            throw error;
        }
    }
    async playerStats(userRID: number): Promise<Record<string, number> | null> {
        if (!Number.isSafeInteger(userRID) || userRID <= 0)
            throw new Error('无效玩家');
        const result = await this.post<{
            room_data?: Record<string, number>[];
        }>(`/api/stats/other_user_stats/${userRID}`, {});
        return result?.room_data?.[0] ?? null;
    }
    async historyQuote(data: ReplayHandData): Promise<HistoryQuote> {
        const info = this.data.snapshot?.roomInfo, record = this.data.record;
        const basic = { shareTable: record?.shareTable ?? 0, originType: record?.originType ?? 0, tribeID: record?.tribeId ?? 0 };
        const model = parseHistoryHand(data, this.userRID), seated = (this.data.snapshot?.myInfo?.seatId ?? 0) > 0;
        const g = this.config.global, privateUc = g.isChannelDiamondFreeMode;
        const quote: HistoryQuote = { canPeek: canWatchPlayerCards(basic, seated, g) && hasHiddenCards(data, model, this.userRID),
            canReveal: model.hasMe && canWatchPublicCards(basic, seated, g) && hasHiddenPublicCards(model.publicCards), privateUc, freeCount: 0,
            revealRound: g.viewPublicCards.viewType === 2 ? 0 : getViewPubRound(model.publicCards), collectPrice: this.config.privateUc.getVisiblePrice(2) };
        const pricing = new HistoryPricing(this.data, g, this.config.diamonds);
        await Promise.all([
            quote.canPeek ? (async () => { const value = await this.post<{
                pay_times?: number;
            }>('/api/roomcenter/game/watch/num', { room_id: this.target.roomID }); quote.peekPrice = await pricing.getPeekPrice(value?.pay_times ?? 0); })() : undefined,
            quote.canReveal ? (async () => {
                if (!privateUc || g.viewPublicCards.freeCount > 0) {
                    const value = await this.post<{
                        free_count?: number;
                    }>('/api/roomcenter/history/view_public_cards/free_count', {});
                    quote.freeCount = value?.free_count ?? 0;
                }
                quote.revealPrice = quote.freeCount > 0 ? 0 : await pricing.getViewPubPrice(getViewPubRound(model.publicCards));
            })() : undefined,
            !privateUc ? (async () => { const value = await this.post<{
                diamonds_wallet?: {
                    diamonds?: number;
                };
            }>('/api/user/user_diamonds_wallet', {}); quote.balance = value?.diamonds_wallet?.diamonds; })() : undefined,
        ]);
        return quote;
    }
    async peek(data: ReplayHandData): Promise<void> {
        const quote = await this.historyQuote(data);
        if (!quote.canPeek)
            throw new Error('当前不能查看手牌');
        const result = await this.post<{
            be_watched_user_hands?: {
                user_rid: number;
                data: string;
            }[];
        }>('/api/roomcenter/game/watch', { ...this.params(data), be_watched_user_id: 0 });
        this.data.replay.mergeWatchedHands(data.s.hand, result?.be_watched_user_hands ?? []);
        const cached = this.data.replay.getCached(data.s.hand);
        if (cached)
            this.storage.put(data.s.hand, cached, this.signal);
    }
    async reveal(data: ReplayHandData, round: number): Promise<void> {
        const quote = await this.historyQuote(data);
        if (!quote.canReveal || quote.revealRound !== round)
            throw new Error('看牌状态已改变，请重试');
        const result = await this.post<{
            pub_cards?: string;
            pub_cards2?: string;
        }>('/api/roomcenter/history/view_public_cards', {
            room_id: data.s.rid || this.target.roomID, match_id: data.s.mid || this.target.matchID, hand_num: data.s.hand, round
        });
        this.data.replay.mergeViewedPublicCards(data.s.hand, result);
        const cached = this.data.replay.getCached(data.s.hand);
        if (cached)
            this.storage.put(data.s.hand, cached, this.signal);
    }
    private params(data: ReplayHandData) { return { room_id: data.s.rid || this.target.roomID, room_unique_id: data.s.unique || this.data.snapshot?.roomInfo?.uniqueId || '', hand_num: data.s.hand }; }
    async collected(data: ReplayHandData): Promise<boolean> {
        if (data.collected != null)
            return data.collected;
        const result = await this.post<{
            records?: {
                remove?: number;
            }[];
        }>('/api/misc/game/get_round_status', this.params(data));
        data.collected = !!result?.records?.length && result.records[0]?.remove === 0;
        this.data.replay.setCollected(data.s.hand,data.collected);
        this.storage.put(data.s.hand, data, this.signal);
        return data.collected;
    }
    async collect(data: ReplayHandData, remove: boolean, change: number): Promise<void> {
        await this.post(remove ? '/api/misc/game/remove_round' : '/api/misc/game/record_round', remove ? this.params(data) : {
            id: 0, ...this.params(data), match_id: data.s.mid, name: data.s.name, change, type: 0, open: 0
        });
        data.collected = !remove;
        this.data.replay.setCollected(data.s.hand,data.collected);
        this.storage.put(data.s.hand, data, this.signal);
    }
}
