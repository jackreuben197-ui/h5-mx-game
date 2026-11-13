import { RoomPanelCache } from './RoomPanelCache.js';
import { DiamondPurchaseService } from './DiamondPurchaseService.js';
import { TableChatService } from './TableChatService.js';
import type { HostSessionData } from '../data/HostSessionData.js';
import { JackpotService } from './JackpotService.js';
import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { DiamondModel } from '../data/DiamondModel.js';
import type { PrivateUcChargeStore } from '../data/PrivateUcChargeStore.js';
import type { HistoryQuote } from '../core/HistoryQuote.js';
import { HistoryPricing } from './HistoryPricing.js';
import { canWatchPlayerCards, canWatchPublicCards } from './ViewPlayerCardsConfig.js';
import { parseHistoryHand, hasHiddenCards, hasHiddenPublicCards, getViewPubRound } from './HistoryReplayModel.js';
import type { RoomRecords } from '../core/RoomRecords.js';
import type { PlayerProfile } from '../core/PlayerProfile.js';
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
    readonly diamondPurchase:DiamondPurchaseService;
    private safetyTask?:Promise<void>;
    private safetyUpdated=0;
    private supportWallet?:RoomPanelCache<{club_id?:number}>;
    private chatService?:TableChatService;
    readonly jackpotFeature: JackpotService;
    private roomersTask?: Promise<void>;
    private profiles = new Map<number, PlayerProfile>();
    private profileTasks = new Map<number, Promise<PlayerProfile | null>>();
    private replayTask?: Promise<ReplayHandData | null>;
    private replayHand = -1;
    private storage: ReplayStorage;
    constructor(readonly data: ProtocolRoomData, readonly target: RoomTarget, readonly userRID: number, private client: ProtocolClient, private pb: HoldemRuntime, private http: HttpClient, private signal: AbortSignal, private transport: HostTransport, readonly config: {
        global: GlobalConfigStore;
        diamonds: DiamondModel;
        privateUc: PrivateUcChargeStore;
    },session?:HostSessionData) {
        this.diamondPurchase=new DiamondPurchaseService(http,signal);
        if(session)this.chatService=new TableChatService(data,target,session,client,pb,http,signal);
        this.jackpotFeature=new JackpotService(data,http,transport,signal);
        this.storage = new ReplayStorage(transport, userRID, target.roomID, target.matchID);
    }
    chatHistory(older=false,force=false):Promise<void>{return this.chatService?.history(older,force)??Promise.resolve();}
    sendChat(text:string,danmu:boolean):Promise<void>{return this.chatService?.send(text,danmu)??Promise.resolve();}
    chatQuickMessages():Promise<unknown>{return this.chatService?.quickMessages()??Promise.resolve([]);}
    async preloadPanels(refresh=false):Promise<void>{
        if(refresh)this.diamondPurchase.invalidate();
        await Promise.allSettled([this.diamondPurchase.catalog(),this.prefetchSafety(),this.supportClub(),this.chatQuickMessages()]);
    }
    private supportClub():Promise<{club_id?:number}>{
        if(this.data.record?.goldType!==1)return Promise.resolve({club_id:this.data.record?.clubId});
        this.supportWallet??=new RoomPanelCache(()=>this.http.request(`/api/user/room/bringin/${this.target.roomID}`,{}, {signal:this.signal}),this.signal);
        return this.supportWallet.get();
    }
    private prefetchSafety():Promise<void>{
        const tribeId=this.data.record?.tribeId??0;
        if(!tribeId||Date.now()-this.safetyUpdated<30000)return Promise.resolve();
        if(this.safetyTask)return this.safetyTask;
        return this.safetyTask=this.http.request<{data:{id:number;user_name:string;user_avatar:string;create_time:number|string;public_reason:string}[];total:number}>('/api/org/tribe/black/user/list',{offset:0,limit:100,tribe_id:tribeId},{signal:this.signal}).then(result=>{
            this.signal.throwIfAborted();
            const users=(result.data??[]).map(r=>{const numeric=Number(r.create_time),d=new Date(Number.isFinite(numeric)?(numeric<1e12?numeric*1000:numeric):r.create_time);return {id:r.id,userName:r.user_name?.trim()||'--',avatar:r.user_avatar||'',createTime:Number.isNaN(d.getTime())?'':`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`,reason:r.public_reason?.trim()||''};});
            const now=Date.now();
            // MX mounts in the H5 document. Use H5's cache contract, not ccStorageOp's dzpk_cc_ namespace.
            try{
                const key='dzpk_h5_TRIBE_BLACK_USER_LIST_CACHE';
                const previous=JSON.parse(globalThis.localStorage.getItem(key)??'null');
                const tribeMap=previous?.version===1?previous.tribeMap??{}:{};
                globalThis.localStorage.setItem(key,JSON.stringify({version:1,updatedAt:now,tribeMap:{...tribeMap,[tribeId]:{updatedAt:now,total:result.total??users.length,users}}}));
            }catch{/* Storage restrictions must not prevent entry; H5 can fetch on open. */}
            this.safetyUpdated=now;
        }).finally(()=>{this.safetyTask=undefined;});
    }
    safetyGuard():void{const tribeId=this.data.record?.tribeId??0;if(tribeId>0&&!this.signal.aborted)this.transport.send('showPanel',{panelType:'safetyGuard',props:{tribeId}});}
    async supportChat():Promise<void>{
        let clubId=this.data.record?.clubId??0;
        if(this.data.record?.goldType===1){
            try{const wallet=await this.supportClub();if(wallet.club_id)clubId=wallet.club_id;}catch{this.signal.throwIfAborted();}
        }
        this.signal.throwIfAborted();
        this.transport.send('showPanel',{panelType:'supportChat',props:{tribeId:this.data.record?.tribeId??0,clubId}});
    }
    mttRegistration():void{this.data.mtt?.emit('registration');}
    openMttRecord():void {this.transport.send('showPanel',{panelType:'mttRecord',props:{matchId:this.target.matchID,tournamentName:this.data.mtt?.matchName}});}
    async mttAddOn():Promise<void>{
        const m=this.data.mtt;if(!m||!m.beginAddOn(m.currentAddOnMode))return;
        const room=new this.pb.Room();room.setRoomId(this.target.roomID);room.setMatchId(this.target.matchID);
        const body=new this.pb.ClientMessageAddOn();body.setRoom(room);body.setUseProp(false);body.setRatio(1);body.setMode(m.pendingAddOnMode);body.setUsedPropId(0);body.setPropType(0);body.setUseFree(false);
        try{await this.client.request(this.pb.Code.MSG_D_ADD_ON,this.target.roomID,this.target.matchID,body,this.pb.ServerMessageAddOn,this.signal);}
        catch(e){m.addOnPending=false;m.pendingAddOnMode=0;m.refresh();throw e;}
    }
    async mttAutoOp(enable:boolean):Promise<void>{
        const m=this.data.mtt,s=this.data.snapshot,p=s?.playersList.find(p=>p.seatId===s.myInfo?.seatId);
        if(!m||!p||(enable&&(!m.gameStarted||p.isAutoop)))return;
        const room=new this.pb.Room();room.setRoomId(this.target.roomID);room.setMatchId(this.target.matchID);
        const body=new this.pb.ClientMessageAutoOpActive();body.setRoom(room);body.setEnable(enable);
        await this.client.request(this.pb.Code.MSG_D_AUTO_OP_ACTIVE,this.target.roomID,this.target.matchID,body,this.pb.ServerMessageAutoOpActive,this.signal);
    }
    openJackpot():void {this.jackpotFeature.open();}
    leaveTable():void {
        if(this.data.mtt&&!this.data.mtt.eliminatedObserver)return;
        const room=new this.pb.Room();room.setRoomId(this.target.roomID);room.setMatchId(this.target.matchID);
        const body=new this.pb.ClientMessageLeave();body.setRoom(room);
        this.client.send(this.pb.Code.MSG_D_LEAVE,this.target.roomID,this.target.matchID,body,this.signal);
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
    replay(hand: number, refresh = false): Promise<ReplayHandData | null> {
        if (this.replayTask)
            return this.replayHand === hand ? this.replayTask : Promise.reject(new Error('牌谱正在加载，请稍候'));
        this.replayHand = hand;
        return this.replayTask = this.loadReplay(hand, refresh).finally(() => { this.replayTask = undefined; this.replayHand = -1; });
    }
    private async loadReplay(hand: number, refresh = false): Promise<ReplayHandData | null> {
        if (!Number.isInteger(hand) || hand < 1)
            throw new Error('无效手数');
        this.signal.throwIfAborted();
        this.data.replay.pendingHandNum = hand;
        const cached = refresh ? undefined : this.data.replay.getCached(hand) ?? await this.storage.get(hand, this.signal);
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
    peekPlayerProfile(userRID: number): PlayerProfile | undefined { return this.profiles.get(userRID); }
    prefetchPlayers(userRIDs: number[]): Promise<void> {
        const ids = [...new Set(userRIDs)].filter(id => Number.isSafeInteger(id) && id > 0 && !this.profiles.has(id) && !this.profileTasks.has(id));
        if (!ids.length) return Promise.resolve();
        const task = this.loadProfiles(ids);
        for (const id of ids) {
            const pending = task.then(profiles => profiles.get(id) ?? null).finally(() => { this.profileTasks.delete(id); });
            this.profileTasks.set(id, pending);
            // Entry prefetch has no immediate caller for each seat; keep failures retryable without an unhandled rejection.
            void pending.catch(() => undefined);
        }
        return task.then(() => undefined);
    }
    playerProfile(userRID: number): Promise<PlayerProfile | null> {
        if (!Number.isSafeInteger(userRID) || userRID <= 0) return Promise.reject(new Error('无效玩家'));
        const cached = this.profiles.get(userRID);
        if (cached) return Promise.resolve(cached);
        const pending = this.profileTasks.get(userRID);
        if (pending) return pending;
        const task = this.loadProfiles([userRID]).then(profiles => profiles.get(userRID) ?? null).finally(() => { this.profileTasks.delete(userRID); });
        this.profileTasks.set(userRID, task);
        return task;
    }
    private async loadProfiles(userRIDs: number[]): Promise<Map<number, PlayerProfile>> {
        const room = this.data.record;
        if (!room) throw new Error('房间数据已失效');
        const result = await this.post<{
            user_info_by_rid_resp?: PlayerProfile['basic'][];
            user_stats_by_user_rid_resp?: Array<{data?: PlayerProfile['stats']} & PlayerProfile['stats']> | ({data?: PlayerProfile['stats']} & PlayerProfile['stats']);
        }>('/api/misc/combine', {
            api_list: [24, 25],
            user_info_by_rid_req: { user_random_id: userRIDs },
            user_stats_by_user_rid_req: {
                game_type: room.gameType, poker_type: room.pokerType,
                gold_type: room.goldType, origin_type: room.originType,
                room_id: this.target.roomID, user_random_id: userRIDs
            }
        });
        const profiles = new Map<number, PlayerProfile>();
        const responses = result?.user_stats_by_user_rid_resp;
        const statsList = Array.isArray(responses) ? responses : responses ? [responses] : [];
        for (const userRID of userRIDs) {
            const basic = result?.user_info_by_rid_resp?.find(item => item?.random_num === userRID);
            const raw = statsList.find(item => (item?.data ?? item)?.user_random_id === userRID)
                ?? (userRIDs.length === 1 ? statsList.find(item => !(item?.data ?? item)?.user_random_id) : undefined);
            const stats = raw?.data ?? raw;
            if (basic || stats) {
                const profile = {basic, stats};
                this.profiles.set(userRID, profile);
                profiles.set(userRID, profile);
            }
        }
        return profiles;
    }
    private requireOther(userRID: number): void {
        if (!Number.isSafeInteger(userRID) || userRID <= 0 || userRID === this.userRID || !this.data.record) throw new Error('玩家或房间已失效');
    }
    private requireManager(userRID: number, action?: 'stand' | 'leave'): void {
        this.requireOther(userRID);
        const admin = this.data.record?.roomAdmin;
        if (!admin?.isAdmin || (action === 'stand' && admin.userStandUp !== 1) || (action === 'leave' && admin.userLeave !== 1)) throw new Error('没有房主操作权限');
    }
    private requireGift(userRID: number): void {
        this.requireOther(userRID);
        if (this.config.global.isChannelDiamondFreeMode || !this.data.snapshot?.playersList.some(p => p.userRid === this.userRID && p.seatId > 0)) throw new Error('当前不能赠送钻石');
    }
    async savePlayerRemark(userRID: number, remark: string): Promise<void> {
        this.requireOther(userRID);
        await this.post('/api/org/club/user/update', {club_id: this.data.record?.clubId || 0, user_id: userRID, remark_name: remark.trim(), remark_desc: ''});
        const profile = this.profiles.get(userRID);
        if (profile?.basic) profile.basic.remark_name = remark.trim();
    }
    private muteScope(): {club_id?: number; tribe_id?: number} {
        const club_id = this.data.record?.clubId || 0, tribe_id = this.data.record?.tribeId || 0;
        if (!club_id && !tribe_id) throw new Error('当前房间不支持禁言操作');
        return {...(club_id ? {club_id} : {}), ...(tribe_id ? {tribe_id} : {})};
    }
    async playerMuted(userRID: number): Promise<boolean> {
        this.requireManager(userRID);
        const result = await this.post<{ids?: number[]}>('/api/user/mute/list', {...this.muteScope(), user_ids: [userRID]});
        return !!result?.ids?.includes(userRID);
    }
    async setPlayerMuted(userRID: number, muted: boolean): Promise<void> {
        this.requireManager(userRID);
        await this.post('/api/user/mute', {...this.muteScope(), user_id: userRID, mute: muted});
    }
    async managePlayer(userRID: number, action: 'stand' | 'leave'): Promise<void> {
        this.requireManager(userRID, action);
        await this.post(action === 'stand' ? '/api/roomcenter/room/user_stand_up' : '/api/roomcenter/room/user_leave', {room_id: this.target.roomID, user_random_id: userRID});
    }
    async diamondBalance(): Promise<number> {
        const value = await this.post<{diamonds_wallet?: {diamonds?: number}}>('/api/user/user_diamonds_wallet', {});
        return Number(value?.diamonds_wallet?.diamonds || 0);
    }
    async giftDiamonds(userRID: number, amount: number): Promise<void> {
        this.requireGift(userRID);
        if (![10, 50, 100, 200, 500, 1000].includes(amount)) throw new Error('无效钻石数量');
        await this.post('/api/user/diamond/send', {target_user_id: userRID, send_type: 2, amount, room_id: this.target.roomID});
        this.signal.throwIfAborted();
        this.data.emoji.diamondGiftEvent({senderID:this.userRID,receiverID:userRID,amount}, 'local');
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
