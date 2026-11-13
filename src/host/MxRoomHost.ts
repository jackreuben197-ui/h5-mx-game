import { MttRoomLifecycle } from '../logic/MttRoomLifecycle.js';
import { EnterRoomRequest } from '../net/requests/EnterRoomRequest.js';
import { GameplayTableSettingDataProvider } from '../logic/GameplayTableSettingDataProvider.js';
import { EmojiService } from '../logic/EmojiService.js';
import { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import { DiamondModel, type DiamondConfig } from '../data/DiamondModel.js';
import { PrivateUcChargeStore, PrivateUcFee } from '../data/PrivateUcChargeStore.js';
import { RoomRecordsService } from '../logic/RoomRecordsService.js';
import { SetAutoOnTableRequest } from '../net/requests/SetAutoOnTableRequest.js';
import { BringOutRules } from '../logic/BringOutRules.js';
import { BringInRequest } from '../net/requests/BringInRequest.js';
import { StoreChipsRequest } from '../net/requests/StoreChipsRequest.js';
import { KeepSeatRequest } from '../net/requests/KeepSeatRequest.js';
import type { BuyInQuote, BuyInSelection } from '../core/Seating.js';
import { RoomBringOutRequest } from '../net/http/RoomBringOutRequest.js';
import { BringInRules } from '../logic/BringInRules.js';
import { SeatedDataBuilder } from '../logic/SeatedDataBuilder.js';
import { SeatedRequest } from '../net/requests/SeatedRequest.js';
import { StandupRequest } from '../net/requests/StandupRequest.js';
import { RoomWalletRequest } from '../net/http/RoomWalletRequest.js';
import type { Action, RoomHost, RoomTarget, TableSnapshot, TableUpdate } from '../core/types.js';
import { HostSessionData } from '../data/HostSessionData.js';
import { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import { ProtocolClient } from '../net/ProtocolClient.js';
import type { Packet } from '../net/PacketCodec.js';
import { ProtocolRuntime, type HoldemRuntime } from '../net/ProtocolRuntime.js';
import { HttpClient, type HttpOptions } from '../net/http/HttpClient.js';
import { UserInfoRequest } from '../net/http/UserInfoRequest.js';
import { SyncEnterRequest } from '../net/requests/SyncEnterRequest.js';
import { ActionRequest } from '../net/requests/ActionRequest.js';
import { AddTimeRequest } from '../net/requests/AddTimeRequest.js';
import { AgreePostRequest } from '../net/requests/AgreePostRequest.js';
import { ShowdownRequest } from '../net/requests/ShowdownRequest.js';
import { SettlementWatchRequest } from '../net/requests/SettlementWatchRequest.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import { canWatchPlayerCards, canWatchPublicCards } from '../logic/ViewPlayerCardsConfig.js';
import { DiamondConfigType, resolvePrivateUcDiamondConfigType } from '../logic/DiamondConfigType.js';
import { TexasMessageHandler } from '../net/messages/texas/TexasMessageHandler.js';
import { MessageContext } from '../net/messages/MessageContext.js';
import { EnterRoomProcedure } from '../logic/EnterRoomProcedure.js';
import { EnterRoomMapper } from '../logic/EnterRoomMapper.js';
import { BettingMapper } from '../logic/BettingMapper.js';
import type { HostTransport } from './HostTransport.js';
interface RoomContext {
  target: RoomTarget;
  signal: AbortSignal;
  receive: (event: TableUpdate) => void;
  ready: boolean;
  entered: boolean;
  boundary: number;
  authoritySeen: boolean;
  packets: Packet[];
  syncTask?: Promise<void>;
  resyncRequested?: boolean;
  pendingTurn?: string;
  walletClubID?: number;
  quote?: BuyInQuote;
  seatingBusy?: boolean;
  agreedPost?: string;
  showdownPending?: boolean;
  watchPending?: boolean;
}
/** HTTP / WS orchestration. Handlers update room data; projection drives observable UI models. */
export class MxRoomHost implements RoomHost {
  readonly globalConfig = new GlobalConfigStore();
  readonly privateUc = new PrivateUcChargeStore();
  readonly diamonds: DiamondModel;
  readonly session = new HostSessionData();
  readonly http: HttpClient;
  roomData = new ProtocolRoomData();
  private client: ProtocolClient;
  private runtime: ProtocolRuntime;
  private pb?: HoldemRuntime;
  private router?: TexasMessageHandler;
  private off: (() => void)[] = [];
  private revision = 0;
  private quoteID = 0;
  private tableSettingProvider?: GameplayTableSettingDataProvider;
  getTableSettings() { return this.roomData.tableSettings; }
  private updateTableSettings(): void { this.roomData.tableSettings.update(this.roomData.record,this.roomData.snapshot?.roomInfo,this.roomData.snapshot?.handInfo); }
  private current?: RoomContext;
  private mttLifecycle?: MttRoomLifecycle;
  private project(data: ProtocolRoomData, target: RoomTarget): TableSnapshot {
    const snapshot = new EnterRoomMapper(this.pb!).map(data,target,++this.revision);
    snapshot.roomLogo = this.session.roomLogo(data.record?.clubId || target.clubID || 0);
    snapshot.privateUc=this.globalConfig.isChannelDiamondFreeMode;
    if(snapshot.watch)snapshot.watch.privateUc=this.globalConfig.isChannelDiamondFreeMode;
    const own = data.snapshot?.operatorList.find(op=>op.seatId===data.snapshot?.myInfo?.seatId && !op.isInsurance && !op.isAgreeSecondPc);
    snapshot.canAddTime = (!data.mtt || data.mtt.delayTimeType !== 0) && !!own && own.delayTimes < this.globalConfig.resolveGameDelayTimes(data.record?.limitDelayTimes);
    if(snapshot.canAddTime&&data.record){
      const times=Math.min(5,own!.delayTimes+1),room=data.record,privateUc=this.globalConfig.isChannelDiamondFreeMode;
      const ext=this.diamonds.getDiamondConfigTypeExt(room.originType,room.shareTable,!!data.mtt,times);
      snapshot.addTimeCost=this.diamonds.getPrice(2,ext,data.snapshot?.roomInfo?.smallBlind??0,privateUc);
    }
    return snapshot;
  }
  private maybeAgreePost(context: RoomContext): void {
    const state=this.roomData.snapshot,seat=state?.myInfo?.seatId;
    const player=state?.playersList.find(p=>p.seatId===seat);
    if(!context.ready||!seat||player?.status!==this.pb?.Def.CanPlayStatus.NEED_POST){context.agreedPost=undefined;return;}
    const key=`${seat}:${state?.handInfo?.handNum??0}`;
    if(context.agreedPost===key)return;
    context.agreedPost=key;
    void this.agreePost(context.target,context.signal).catch(error=>this.report(error));
  }
  private watchCurrent(context: RoomContext, handNum: number): boolean {
    return this.current===context && context.ready && !context.signal.aborted &&
      this.roomData.watch.handNum===handNum && this.roomData.snapshot?.handInfo?.handNum===handNum &&
      this.roomData.snapshot.gameStatus===this.pb?.Def.GameStatus.HAND_END;
  }
  private publishWatch(context: RoomContext): void {
    if(this.current===context&&context.ready&&!context.signal.aborted)
      context.receive({type:'snapshot',snapshot:this.project(this.roomData,context.target)});
  }
  private async watchPrice(type: DiamondConfigType, ext: number, times=0): Promise<number> {
    const privateUc=this.globalConfig.isChannelDiamondFreeMode;
    if(!privateUc)await this.diamonds.reqDiamondConfig(type);
    const price=this.diamonds.getPrice(privateUc?resolvePrivateUcDiamondConfigType(type):type,ext,this.roomData.snapshot?.roomInfo?.smallBlind??0,privateUc);
    return privateUc&&type===DiamondConfigType.DiamondConfigTypePayWatchOtherCard
      ? this.privateUc.applyTieredPrice(PrivateUcFee.ViewOnePlayer,price,times):price;
  }
  private async prepareSettlementWatch(context: RoomContext): Promise<void> {
    const state=this.roomData.snapshot,record=this.roomData.record,watch=this.roomData.watch,handNum=watch.handNum;
    if(!state||!record||!handNum||context.target.matchID>0)return;
    const basic={shareTable:record.shareTable,originType:record.originType,tribeID:record.tribeId};
    const seated=(state.myInfo?.seatId??0)>0;
    const wantPeek=watch.peek&&canWatchPlayerCards(basic,seated,this.globalConfig);
    const wantReveal=watch.reveal&&canWatchPublicCards(basic,seated,this.globalConfig);
    watch.peek=false;watch.reveal=false;this.publishWatch(context);
    const request=new SettlementWatchRequest(this.client,this.pb!);
    await Promise.all([
      wantPeek?(async()=>{
        const times=await request.peekTimes(context.target,context.signal);
        const type=record.viewPlayerCards===2?DiamondConfigType.DiamondConfigTypePayWatchOtherCard:DiamondConfigType.DiamondConfigTypePayWatchOtherCardWatchAll;
        const ext=record.viewPlayerCards===2?(seated?3:1):(seated?12:11)+10*Math.min(times,4);
        const cost=await this.watchPrice(type,ext,times);
        if(!this.watchCurrent(context,handNum))return;
        watch.peekPayTimes=times;watch.peekCost=cost;watch.peek=true;this.publishWatch(context);
      })().catch(error=>this.report(error)):undefined,
      wantReveal?(async()=>{
        let free=0;
        if(this.globalConfig.isChannelDiamondFreeMode&&this.globalConfig.viewPublicCards.freeCount>0){
          const result=await this.http.request<{free_count?:number}>('/api/roomcenter/history/view_public_cards/free_count',{}, {signal:context.signal,clubID:record.clubId});
          free=Number(result?.free_count)||0;
        }
        const viewAll=this.globalConfig.viewPublicCards.viewType===2;
        const cost=free>0?0:await this.watchPrice(viewAll?DiamondConfigType.DiamondConfigTypeViewPublicCardsAll:DiamondConfigType.DiamondConfigTypeViewPublicCards,viewAll?0:watch.revealRound*1000);
        if(!this.watchCurrent(context,handNum)||(this.roomData.snapshot?.handInfo?.publicCardsList.length??5)>=5)return;
        watch.revealCost=cost;watch.revealFree=free>0;watch.reveal=true;this.publishWatch(context);
      })().catch(error=>this.report(error)):undefined,
    ]);
  }
  private records?: RoomRecordsService;
  private emojis?: EmojiService;
  constructor(
    private transport: HostTransport,
    options: { runtime?: HoldemRuntime; timeoutMs?: number; http?: HttpOptions } = {},
  ) {
    this.runtime = new ProtocolRuntime(options.runtime);
    void this.runtime.load().catch(() => undefined);
    this.http = new HttpClient(() => this.session.token, options.http);
    this.diamonds=new DiamondModel(async type=>{const result=await this.http.request<{data?:unknown}>('/api/config/diamond/config',{config_type:type});return result?.data??result;});
    this.client = new ProtocolClient(transport, () => this.session.token, options.timeoutMs);
    this.off.push(this.client.subscribe((packet) => this.receive(packet)));
    this.off.push(this.client.onError((error) => this.recover(error)));
    this.off.push(
      transport.subscribe((message) => {
        const configPayload=message.payload as {raw?:Record<string,unknown>;items?:Parameters<PrivateUcChargeStore['setFromH5Sync']>[0]['items']}|undefined;
        if(message.action==='syncGlobalConfig' && configPayload?.raw)this.globalConfig.setConfig(configPayload.raw);
        if(message.action==='syncDiamondConfig' && configPayload?.raw){
          for(const type of [2,8,9,17,30,31])this.diamonds.setFromH5Sync(type,(configPayload.raw[type]??{}) as Record<number,DiamondConfig>);
        }
        if(message.action==='syncPrivateUcChargeConfig')this.privateUc.setFromH5Sync({items:configPayload?.items});
        const previousToken = this.session.token;
        this.session.update(message.action, message.payload);
        if (message.action === 'syncUserClub' && this.current?.entered && this.roomData.snapshot && this.pb)
          this.current.receive({ type: 'snapshot', snapshot: this.project(this.roomData, this.current.target) });
        if (previousToken && previousToken !== this.session.token) {
          this.current = undefined;
          this.roomData.clear();
          this.diamonds.clearConfig();this.privateUc.setFromH5Sync({items:[]});this.globalConfig.setConfig({});
        }
        if (
          ['wsClosed', 'wsReconnecting', 'wsReconnectFailed'].includes(message.action) &&
          this.current?.entered
        ) {
          this.current.ready = false;
          this.disableActions(this.current);
        }
        if (message.action === 'wsReconnected' && this.current?.entered)
          void this.sync().catch((error) => this.report(error));
      }),
    );
  }
  getEmojis(): EmojiService | undefined {
    const c = this.current;
    if (!c?.entered || c.signal.aborted || !this.pb) return;
    if (!this.emojis || this.emojis.data !== this.roomData.emoji)
      this.emojis = new EmojiService(this.roomData, c.target, this.session, this.client, this.pb, this.http, c.signal, this.globalConfig, () => this.current === c && c.ready);
    return this.emojis;
  }
  getRecords(): RoomRecordsService | undefined {
    const c=this.current;
    if(!c?.entered || c.signal.aborted || !this.pb)return;
    if(!this.records || this.records.data!==this.roomData)
      this.records=new RoomRecordsService(this.roomData,c.target,this.session.userRID,this.client,this.pb,this.http,c.signal,this.transport,{global:this.globalConfig,diamonds:this.diamonds,privateUc:this.privateUc});
    return this.records;
  }
  private warmRoomPanels(context: RoomContext, refreshProps = false): void {
    if (this.current !== context || context.signal.aborted || !context.entered) return;
    void this.getRecords()?.jackpotFeature.preload();
    const playerIDs = this.roomData.snapshot?.playersList.filter(player => player.seatId > 0).map(player => player.userRid) ?? [];
    void this.getRecords()?.prefetchPlayers(playerIDs).catch(error => {
      if (!(error instanceof Error && error.name === 'AbortError')) console.warn('[MX player profile] Prefetch failed', error);
    });
    void this.getEmojis()?.refresh(refreshProps).catch(error => {
      if (!(error instanceof Error && error.name === 'AbortError')) console.warn('[MX props] Prefetch failed', error);
    });
  }
  private report(error: unknown): void {
    if (error instanceof Error && error.name === 'AbortError') return;
    this.transport.send('showToast', {
      type: 'fail',
      message: error instanceof Error ? error.message : '房间同步失败',
    });
  }
  async refreshUser(signal?: AbortSignal): Promise<void> {
    const { user } = await new UserInfoRequest(this.http).execute(signal);
    this.session.update('syncUser', {
      uid: user.p_u_id ?? this.session.userID,
      sex: user.sex ?? this.session.sex,
      randomId: user.un_id,
      nickname: user.nickname,
      avatar: user.avatar,
    });
  }
  async enter(
    target: RoomTarget,
    signal: AbortSignal,
    receive: (update: TableUpdate) => void,
  ): Promise<TableSnapshot> {
    if (!this.session.token) throw new Error('未收到 H5 登录上下文，请从 H5 房间入口进入');
    this.mttLifecycle?.destroy(); this.mttLifecycle=undefined;
    const context: RoomContext = (this.current = {
      target,
      signal,
      receive,
      ready: false,
      entered: false,
      boundary: 1002,
      authoritySeen: false,
      packets: [],
    });
    signal.addEventListener(
      'abort',
      () => {
        if (this.current === context) {
          this.current = undefined;
          this.roomData.clear();
        }
        context.packets = [];
      },
      { once: true },
    );
    const pb = (this.pb = await this.runtime.load());
    signal.throwIfAborted();
    this.router = new TexasMessageHandler(pb);
    const data = await new EnterRoomProcedure(this.client, pb).run(target, signal);
    signal.throwIfAborted();
    if (this.current !== context) throw new DOMException('房间会话已更换', 'AbortError');
    data.restoreSpecialOperations(pb.Def.Round.FLOP, pb.Def.Round.TURN);
    const snapshot = this.project(data,target);
    this.roomData = data;
    if(data.mtt){
      const active=()=>this.current===context&&!signal.aborted;
      this.mttLifecycle=new MttRoomLifecycle(data,target,this.client,pb,this.transport,signal,active,
        async(roomID,observer)=>{
          if(!active())return;
          context.ready=false;context.boundary=1002;context.authoritySeen=false;context.packets=[];
          target.roomID=roomID;target.observer=observer;
          const response=await new EnterRoomRequest(this.client,pb).execute(target,signal);
          if(!active())return;
          if(observer&&response.myInfo?.seatId)throw new Error('赛事观战响应座位无效');
          data.snapshot=response;data.record!.rid=target.roomID;
          data.mtt!.observer=observer;data.mtt!.applySnapshot(response.mttInfo,response.mttProgress,response.myInfo);
          data.mtt!.syncHandState(response.gameStatus);data.mtt!.setTableTransferWaiting(false);
          data.restoreSpecialOperations(pb.Def.Round.FLOP,pb.Def.Round.TURN);
          context.ready=true;
          context.receive({type:'transfer',snapshot:this.project(data,target)});
          for(const packet of context.packets.splice(0))this.apply(packet,context);
        },()=>{if(active())context.receive({type:'snapshot',snapshot:this.project(data,target)});},
        ()=>{if(active())context.receive({type:'closed',roomID:target.roomID,matchID:target.matchID,reason:''});});
      signal.addEventListener('abort',()=>this.mttLifecycle?.destroy(),{once:true});
    }
    this.updateTableSettings();
    context.entered = true;
    context.ready = true;
    this.transport.send('setHeartbeatMode', { mode: 'in-gameplay' });
    for (const packet of context.packets.splice(0)) {
      if (!context.ready) break;
      this.apply(packet, context);
    }
    this.maybeAgreePost(context);
    this.warmRoomPanels(context);
    return snapshot;
  }
  private receive(packet: Packet): void {
    const context = this.current;
    if(context&&!context.signal.aborted&&this.mttLifecycle?.global(packet))return;
    if (
      !context ||
      context.signal.aborted ||
      packet.roomID !== context.target.roomID ||
      packet.matchID !== context.target.matchID
    )
      return;
    if (packet.code === this.pb?.Code.MSG_S_LEAVE_NOTIFICATION) {
      const body = this.pb.ServerMessageLeaveNotification.deserializeBinary(packet.body).toObject();
      if(this.mttLifecycle?.leave(body))return;
      this.current = undefined;
      this.roomData.clear();
      context.receive({
        type: 'closed',
        roomID: packet.roomID,
        matchID: packet.matchID,
        reason: `房间已退出（${body.reason}）`,
      });
      return;
    }
    if (!context.ready) {
      if (packet.code === context.boundary) {
        // The full snapshot supersedes everything before this exact wire position.
        context.authoritySeen = true;
        context.packets = [];
      } else if (context.authoritySeen && this.router?.accepts(packet.code)) {
        if (context.packets.length >= 1000) {
          this.recover(new Error('房间消息积压，请重新进入'));
          return;
        }
        context.packets.push(packet);
      }
      return;
    }
    this.apply(packet, context);
  }
  private apply(packet: Packet, context: RoomContext): void {
    if (this.current !== context || context.signal.aborted || !this.router?.accepts(packet.code))
      return;
    // Transaction: a malformed delta never leaves half-mutated seats behind.
    const original = this.roomData.snapshot;
    this.roomData.snapshot = structuredClone(original);
    try {
      const message = new MessageContext(this.roomData, this.pb!, this.session);
      if (!this.router.dispatch(packet, message)) {
        this.roomData.snapshot = original;
        return;
      }
      const snapshot = this.project(this.roomData,context.target);
      snapshot.presentation = message.presentation;
      if (message.presentation === 'deal')
        snapshot.dealOrder = [...(this.roomData.snapshot?.handInfo?.dealOrderList ?? [])];
      if (
        [
          this.pb!.Code.MSG_S_ACTION_ALL,
          this.pb!.Code.MSG_S_START_INFO,
          this.pb!.Code.MSG_S_HAND_CLEAR,
          this.pb!.Code.MSG_S_WINNER,
          this.pb!.Code.MSG_S_PUBLIC_CARDS,
          this.pb!.Code.MSG_S_AGREE_SECOND_PCS_TRIGGED,
          this.pb!.Code.MSG_S_INSURANCE_TRIGGED,
        ].some((code) => code === packet.code)
      )
        context.pendingTurn = undefined;
      this.updateTableSettings();
      context.receive({ type: 'snapshot', snapshot });
      if(packet.code===this.pb!.Code.MSG_S_WINNER)
        void this.prepareSettlementWatch(context);
      this.maybeAgreePost(context);
      if (packet.code === this.pb!.Code.MSG_D_SEATED || packet.code === this.pb!.Code.MSG_S_SEATED_OTHERS)
        this.warmRoomPanels(context, packet.code === this.pb!.Code.MSG_D_SEATED);
    } catch (error) {
      this.roomData.snapshot = original;
      this.recover(error);
    }
  }
  private disableActions(context: RoomContext): void {
    if (!this.pb || !this.roomData.snapshot) return;
    const snapshot = this.project(this.roomData,context.target);
    context.receive({
      type: 'snapshot',
      snapshot: { ...snapshot, actions: [], betting: undefined },
    });
  }
  private recover(error: unknown): void {
    this.report(error);
    const context = this.current;
    if (!context?.entered || context.signal.aborted) return;
    context.ready = false;
    this.disableActions(context);
    if (context.syncTask) context.resyncRequested = true;
    else void this.sync().catch((error) => this.report(error));
  }
  sync(): Promise<void> {
    const context = this.current;
    if (!context?.entered || context.signal.aborted) return Promise.resolve();
    if (context.syncTask) return context.syncTask;
    context.ready = false;
    context.boundary = this.pb!.Code.MSG_D_SYNC_ENTER;
    context.authoritySeen = false;
    context.packets = [];
    this.disableActions(context);
    const task = (async () => {
      const snapshot = await new SyncEnterRequest(this.client, this.pb!).execute(
        context.target,
        context.signal,
      );
      if (this.current !== context || context.signal.aborted) return;
      const candidate = new ProtocolRoomData();
      candidate.record = this.roomData.record;
      candidate.mtt = this.roomData.mtt;
      candidate.snapshot = snapshot;
      if(this.roomData.watch.handNum===snapshot.handInfo?.handNum&&snapshot.gameStatus===this.pb!.Def.GameStatus.HAND_END)
        Object.assign(candidate.watch,this.roomData.watch);
      else this.roomData.watch.clear();
      const mapped = this.project(candidate,context.target);
      // Keep room-scoped panel subscriptions/cache stable across authoritative resync.
      this.roomData.snapshot = snapshot;
      this.roomData.mtt?.applySnapshot(this.roomData.snapshot?.mttInfo,this.roomData.snapshot?.mttProgress,this.roomData.snapshot?.myInfo);
      if(this.roomData.snapshot)this.roomData.mtt?.syncHandState(this.roomData.snapshot.gameStatus);
      this.roomData.restoreSpecialOperations(this.pb!.Def.Round.FLOP, this.pb!.Def.Round.TURN);
      this.updateTableSettings();
      this.roomData.report.roomersFetched = false;
      context.pendingTurn = undefined;
      context.ready = true;
      context.receive({ type: 'snapshot', snapshot: mapped });
      this.maybeAgreePost(context);
      this.warmRoomPanels(context);
      for (const packet of context.packets.splice(0)) {
        if (!context.ready) break;
        this.apply(packet, context);
      }
    })();
    context.syncTask = task.finally(() => {
      context.syncTask = undefined;
      if (context.resyncRequested && this.current === context && !context.signal.aborted) {
        context.resyncRequested = false;
        void this.sync().catch((error) => this.report(error));
      }
    });
    return context.syncTask;
  }
  async command(
    target: RoomTarget,
    action: Action,
    signal: AbortSignal,
    amount?: number,
  ): Promise<void> {
    const context = this.current;
    if (
      !context?.ready ||
      context.signal.aborted ||
      context.target.roomID !== target.roomID ||
      context.target.matchID !== target.matchID
    )
      throw new Error('房间正在同步，请稍后操作');
    const mapper = new BettingMapper(this.pb!);
    const turn = mapper.map(this.roomData).betting?.id;
    if (!turn || context.pendingTurn) return; // CC ignores a stale/double click while awaiting authority.
    const request = mapper.resolve(this.roomData, action, amount);
    // Do not confuse the lobby's selected club with the wallet actually bound to this table.
    if (this.roomData.record?.goldType === 1 && context.walletClubID === undefined) {
      const wallet = await new RoomWalletRequest(this.http).execute(target.roomID, signal);
      if (!Number.isSafeInteger(wallet.club_id) || wallet.club_id < 0)
        throw new Error('带入钱包信息无效');
      if (
        this.current !== context ||
        !context.ready ||
        mapper.map(this.roomData).betting?.id !== turn
      )
        throw new Error('操作时机已改变');
      context.walletClubID = wallet.club_id;
    }
    context.pendingTurn = turn;
    try {
      await new ActionRequest(this.client, this.pb!).execute(
        { ...target, clubID: context.walletClubID ?? 0 },
        request.action,
        request.amount,
        signal,
      );
    } catch (error) {
      // A timeout may have executed remotely: reconcile before permitting another action.
      if (this.current === context && !signal.aborted)
        void this.sync().catch((error) => this.report(error));
      throw error;
    }
  }
  private seatContext(target: RoomTarget, seat?: number): RoomContext {
    const c = this.current;
    if(!c?.ready || c.signal.aborted || c.target.roomID !== target.roomID || c.target.matchID !== target.matchID)
      throw new Error('房间正在同步，请稍后重试');
    if(seat !== undefined) {
      if(!Number.isInteger(seat) || seat < 1 || seat > (this.roomData.record?.seatCount ?? 0)) throw new Error('座位无效');
      if(this.roomData.snapshot?.myInfo?.seatId) throw new Error('你已在座位上');
      if(this.roomData.snapshot?.playersList.some(p => p.seatId === seat)) throw new Error('该座位已被占用');
    }
    return c;
  }
  async prepareSeat(target: RoomTarget, seat: number, signal: AbortSignal): Promise<BuyInQuote> {
    if(seat===0)return this.prepareBringIn(target,signal);
    const c = this.seatContext(target, seat);
    if(c.seatingBusy) throw new Error('坐下请求正在处理');
    c.quote = undefined;
    await this.refreshUser(signal);
    const result = await new RoomBringOutRequest(this.http).execute(target.roomID, signal);
    signal.throwIfAborted();
    if(this.seatContext(target, seat) !== c) throw new Error('房间会话已更换');
    this.tableSettingProvider ??= new GameplayTableSettingDataProvider(this.http,this.globalConfig);
    const permissions = await this.tableSettingProvider.getData(this.roomData.record!,target.clubID || this.roomData.record!.clubId,signal);
    signal.throwIfAborted();
    if(this.seatContext(target,seat)!==c)throw new Error('房间会话已更换');
    this.updateTableSettings();
    this.roomData.tableSettings.roomPermissions=permissions;
    const info = this.roomData.snapshot!.roomInfo!;
    const score = this.roomData.record?.goldType === 3;
    if(!score && this.roomData.record?.goldType !== 1) throw new Error('当前钱包类型的带入流程尚未接入');
    // CC restricts wallets to the entry club only in channel packages.
    // A normal alliance table may be funded by a different member club.
    const channelClubID = this.globalConfig.isChannelDiamondFreeMode ? (target.clubID || this.roomData.record!.clubId) : 0;
    const wallets = (result.wallet ?? []).filter(w => !this.globalConfig.isChannelDiamondFreeMode || (channelClubID > 0 && w.club_id === channelClubID));
    if(!score && !wallets.length) throw new Error('未找到可用的支付钱包');
    const last = result.last_bring_out;
    const compatible = last && (score || wallets.some(w => w.club_id === last.club_id)) ? last : undefined;
    // CC Sitdown return-table branch: bring out plus fee, less deposit must be positive.
    const returnAmount = compatible && compatible.to_wallet + compatible.fee - info.deposit > 0
      ? compatible.to_wallet + compatible.fee : undefined;
    const bringToTable = returnAmount === undefined ? 0 : returnAmount - info.deposit;
    const autoReturn = returnAmount !== undefined && (
      score || info.retainType === 0 || info.retainType === 2 ||
      (info.retainType === 1 && bringToTable >= info.limitRetainMinRate * info.smallBlind * 2)
    );
    if(!score && returnAmount !== undefined && compatible && compatible.to_wallet > (wallets.find(w=>w.club_id===compatible.club_id)?.gold ?? 0))
      throw new Error('钱包余额不足以返场');
    if(info.antiCheatType === 3 || info.antiCheatType === 4) throw new Error('视频/人脸验证桌的坐下流程尚未接入');
    const limits = new BringInRules(info).caculateCanBringMinMax();
    const min = returnAmount ?? limits.minAmount, max = returnAmount ?? limits.maxAmount;
    if(!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min < 0 || max < min || limits.step <= 0)
      throw new Error('当前带入范围无效');
    const quote: BuyInQuote = { funding:score?'score':'wallet',scoreClubID:score?(compatible?.club_id ?? (wallets.length===1?wallets[0]!.club_id:target.clubID ?? this.roomData.record!.clubId)):undefined,id:++this.quoteID,seat,roomName:this.roomData.record!.name,smallBlind:info.smallBlind,
      min,max,step:limits.step,wallets,deposit:limits.needDeposit ? info.deposit : 0,returnOrNew:result.return_table && (!last || compatible) ? 1 : 0,returnAmount,returnClubID:returnAmount !== undefined ? compatible?.club_id : undefined,
      canAuto:!score && info.retainType === 0 && returnAmount === undefined,autoReturn,
      security:{ip:info.limitIp,gps:info.limitGps,delay:info.delaySeeCard,media:info.antiCheatType >= 2} };
    c.quote = quote;
    return structuredClone(quote);
  }
  async sitDown(target: RoomTarget, selection: BuyInSelection, signal: AbortSignal): Promise<void> {
    const c = this.seatContext(target), q = c.quote;
    if(!q || q.id !== selection.quoteID || c.seatingBusy) throw new Error('带入信息已失效，请重新选择座位');
    if(q.mode==='add') {
      if(this.roomData.snapshot?.myInfo?.seatId!==q.seat)throw new Error('座位已变更');
      const info=this.roomData.snapshot!.roomInfo!, mine=this.roomData.snapshot!.myInfo!;
      const limits=new BringInRules(info,mine.totalChips,this.roomData.snapshot!.playersList.find(p=>p.seatId===q.seat)?.deposit??0).caculateCanBringMinMax();
      if(selection.amount<limits.minAmount||selection.amount>limits.maxAmount)throw new Error('带入范围已改变，请重新打开');
    } else this.seatContext(target, q.seat);
    const wallet = q.wallets.find(w => w.club_id === selection.clubID);
    if((q.funding==='score' ? selection.clubID!==(q.returnClubID??q.scoreClubID??0) : !wallet) || (q.returnClubID !== undefined && q.returnClubID !== selection.clubID)) throw new Error('支付钱包已变更');
    if(!Number.isSafeInteger(selection.amount) || selection.amount < q.min || selection.amount > q.max ||
       (selection.amount !== q.max && (selection.amount-q.min)%q.step !== 0)) throw new Error('带入金额超出范围');
    if(selection.autoAmount !== 0 && (!q.canAuto || !Number.isSafeInteger(selection.autoAmount) || selection.autoAmount < q.min || selection.autoAmount > q.max))
      throw new Error('自动补充金额无效');
    c.seatingBusy = true;
    try {
      if(q.mode==='add') {
        await new BringInRequest(this.client,this.pb!).execute(target,selection.amount,!!this.roomData.record?.limitBringIn,signal);
        c.quote=undefined;
        if(selection.autoAmount>0) {
          try{await new SetAutoOnTableRequest(this.client,this.pb!).execute(target,selection.autoAmount,signal);}
          catch(error){this.report(new Error('补充筹码已成功，自动充值设置失败：'+(error instanceof Error?error.message:String(error))));}
        }
      } else {
        const data = new SeatedDataBuilder().build(target,this.roomData.snapshot!.roomInfo!,q,selection);
        await new SeatedRequest(this.client,this.pb!).execute(target,data,signal);
      }
      if(this.current === c) {
        c.walletClubID = selection.clubID; c.quote = undefined;
        // Seated has already updated the authority and emitted the live seat move,
        // just as CC does. Immediate SyncEnter would cancel that move before the
        // buy-in dialog closes. Keep the existing add-chips reconciliation only.
        if(q.mode==='add') await this.sync();
      }
    } catch(error) {
      if(this.current === c && !signal.aborted) { c.quote = undefined; void this.sync().catch(e=>this.report(e)); }
      throw error;
    } finally { c.seatingBusy = false; }
  }
  private async prepareBringIn(target: RoomTarget, signal: AbortSignal): Promise<BuyInQuote> {
    const c=this.seatContext(target);
    if(c.seatingBusy)throw new Error('座位请求正在处理');
    const seat=this.roomData.snapshot?.myInfo?.seatId;
    if(!seat)throw new Error('请先坐下');
    c.quote=undefined;
    const [,wallet]=await Promise.all([this.refreshUser(signal),new RoomWalletRequest(this.http).execute(target.roomID,signal)]);
    signal.throwIfAborted();
    if(this.seatContext(target)!==c||this.roomData.snapshot?.myInfo?.seatId!==seat)throw new Error('座位已变更');
    const info=this.roomData.snapshot.roomInfo!,mine=this.roomData.snapshot.myInfo!,player=this.roomData.snapshot.playersList.find(p=>p.seatId===seat);
    const limits=new BringInRules(info,mine.totalChips,player?.deposit??0).caculateCanBringMinMax();
    if(limits.maxAmount<limits.minAmount||limits.step<=0)throw new Error('已达到当前最大带入额度');
    const score=this.roomData.record?.goldType===3;
    const q:BuyInQuote={funding:score?'score':'wallet',scoreClubID:score?(wallet?.club_id??c.walletClubID??target.clubID??this.roomData.record!.clubId):undefined,mode:'add',id:++this.quoteID,seat,roomName:this.roomData.record!.name,smallBlind:info.smallBlind,
      min:limits.minAmount,max:limits.maxAmount,step:limits.step,wallets:score?[]:[wallet],returnOrNew:0,
      deposit:limits.needDeposit?info.deposit-(player?.deposit??0):0,canAuto:!score&&info.retainType===0,
      security:{ip:info.limitIp,gps:info.limitGps,delay:info.delaySeeCard,media:info.antiCheatType>=2}};
    c.quote=q;return structuredClone(q);
  }
  showRules(target:RoomTarget,insurance:boolean):void {
    this.seatContext(target);const info=this.roomData.snapshot!.roomInfo!,room=this.roomData.record!;
    this.transport.send('showPanel',{panelType:'gameRule',props:{ruleType:insurance?2:1,gameInfo:insurance?{insurance_mode:info.insuranceMode}:{game_type:room.gameType,poker_type:room.pokerType,room_critical_hit:!!info.criticalHit}}});
  }
  async storeChips(target:RoomTarget,amount:number,signal:AbortSignal):Promise<void> {
    const c=this.seatContext(target),s=this.roomData.snapshot!,info=s.roomInfo!,player=s.playersList.find(p=>p.seatId===s.myInfo?.seatId);
    if(c.seatingBusy||!player||info.retainType!==2)throw new Error('当前不能带出筹码');
    if(!new BringOutRules(player.chip,this.roomData.record!.retainMinRate,info.smallBlind).valid(amount))throw new Error('带出金额超出范围，请重新选择');
    c.seatingBusy=true;
    try{await new StoreChipsRequest(this.client,this.pb!).execute(target,amount,signal);if(this.current===c)await this.sync();}
    catch(error){if(this.current===c&&!signal.aborted)void this.sync().catch(e=>this.report(e));throw error;}
    finally{c.seatingBusy=false;}
  }
  async keepSeat(target:RoomTarget,keep:boolean,signal:AbortSignal):Promise<void> {
    const c=this.seatContext(target),duration=this.roomData.record?.keepSeatDuration??0;
    if(c.seatingBusy||!this.roomData.snapshot?.myInfo?.seatId)throw new Error('当前不能留座离桌');
    if(keep&&duration<=0)throw new Error('当前牌桌未配置留座时间');
    c.seatingBusy=true;
    try{await new KeepSeatRequest(this.client,this.pb!).execute(target,keep,duration,signal);}
    finally{c.seatingBusy=false;}
  }
  async addTime(target:RoomTarget,signal:AbortSignal):Promise<void> {
    const c=this.seatContext(target),s=this.roomData.snapshot!;
    const op=s.operatorList.find(o=>o.seatId===s.myInfo?.seatId && !o.isAgreeSecondPc);
    if(this.roomData.mtt?.delayTimeType===0||!op||op.delayTimes>=this.globalConfig.resolveGameDelayTimes(this.roomData.record?.limitDelayTimes))throw new Error('当前不能加时');
    await new AddTimeRequest(this.client,this.pb!).execute(target,op.delayTimes,signal);
    if(this.current!==c||signal.aborted)return;
    // The 1014 reply is also projected by TexasMessageHandler.AddTime.
  }
  async agreePost(target:RoomTarget,signal:AbortSignal):Promise<void> {
    this.seatContext(target);
    const s=this.roomData.snapshot!,p=s.playersList.find(p=>p.seatId===s.myInfo?.seatId);
    if(p?.status!==this.pb!.Def.CanPlayStatus.NEED_POST)return;
    await new AgreePostRequest(this.client,this.pb!).execute(target,signal);
  }
  async showdown(target:RoomTarget,cardIndex:number,signal:AbortSignal):Promise<void> {
    const c=this.seatContext(target),s=this.roomData.snapshot!,seat=s.myInfo?.seatId;
    const p=s.playersList.find(p=>p.seatId===seat);
    if(c.showdownPending||!p||(p.status!==this.pb!.Def.CanPlayStatus.NORMAL&&p.status!==this.pb!.Def.CanPlayStatus.AGREE_POST)||p.action===this.pb!.Def.Action.NONE||p.action===this.pb!.Def.Action.FOLD||!p.cardsList[cardIndex]||p.cardsList[cardIndex]<=0)throw new Error('当前不能亮出这张牌');
    const hand=s.handInfo?.handNum;
    const selection=[...((p as typeof p & {showCardsSelection?:number[]}).showCardsSelection??new Array(p.cardsList.length).fill(0))];
    selection[cardIndex]=selection[cardIndex]===1?0:1;
    c.showdownPending=true;
    try{
      await new ShowdownRequest(this.client,this.pb!).execute(target,selection,signal);
      const latest=this.roomData.snapshot;
      if(this.current===c&&!signal.aborted&&latest&&latest.handInfo?.handNum===hand&&latest.myInfo?.seatId===seat){
        const current=latest.playersList.find(v=>v.seatId===seat) as (typeof p & {showCardsSelection?:number[]})|undefined;
        if(current){current.showCardsSelection=selection;c.receive({type:'snapshot',snapshot:this.project(this.roomData,target)});}
      }
    }finally{c.showdownPending=false;}
  }
  async agreeSecondPcs(target:RoomTarget,agree:boolean,signal:AbortSignal):Promise<void>{
    this.seatContext(target);const vote=this.roomData.secondPcs;
    if(!vote.state.active||vote.state.pending||vote.state.deadline<=Date.now()/1000)return;
    vote.state={...vote.state,pending:true};
    const pb=this.pb!,room=new pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new pb.ClientMessageAgreeSecondPcsActive();body.setRoom(room);body.setAgree(agree);
    try {await this.client.request(pb.Code.MSG_D_AGREE_SECOND_PCS_ACTIVE,target.roomID,target.matchID,body,pb.ServerMessageAgreeSecondPcsActive,signal);}
    catch(error){if(!signal.aborted)vote.state={...vote.state,pending:false};throw error;}
  }
  async joinSquid(target:RoomTarget,signal:AbortSignal):Promise<void>{
    this.seatContext(target);if(!this.roomData.squid.state.showJoin)return;
    const pb=this.pb!,room=new pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new pb.ClientMessageSquidInActive();body.setRoom(room);body.setEnable(true);
    await this.client.request(pb.Code.MSG_D_SQUID_IN_ACTIVE,target.roomID,target.matchID,body,pb.ServerMessageSquidInActive,signal);
  }
  async buyInsurance(target:RoomTarget,buyList:import('@silenthill/agreement-web').PotInsuranceBuy.AsObject[],confirm:boolean,signal:AbortSignal):Promise<void>{
    this.seatContext(target);if(!this.roomData.insurance.state.operator)return;
    const pb=this.pb!,room=new pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new pb.ClientMessageBuyInsuranceActive();body.setRoom(room);body.setConfirm(confirm);body.setStep(true);
    body.setBuyList(buyList.map(item=>{const buy=new pb.PotInsuranceBuy();buy.setPotId(item.potId);buy.setRound(item.round);buy.setActiveAmount(item.activeAmount);buy.setActiveOutsList(item.activeOutsList);buy.setPassiveAmount(item.passiveAmount);buy.setPassiveOutsList(item.passiveOutsList);buy.setInsurEv(item.insurEv);return buy;}));
    // Submit all pot drafts together; replies/broadcasts update the room-scoped state.
    this.client.send(pb.Code.MSG_D_BUY_INSURANCE_ACTIVE,target.roomID,target.matchID,body,signal);
  }
  async watchSettlement(target:RoomTarget,kind:'peek'|'reveal',signal:AbortSignal):Promise<void>{
    const context=this.seatContext(target),watch=this.roomData.watch,handNum=watch.handNum;
    if(!this.watchCurrent(context,handNum)||context.watchPending||!watch[kind])throw new Error('本手看牌操作已失效');
    context.watchPending=true;
    watch[kind]=false;this.publishWatch(context);
    const request=new SettlementWatchRequest(this.client,this.pb!);
    try{
      if(kind==='peek'){
        await request.peek(target,signal);
        // CC ViewPlayerCards acknowledges the purchase; ShowViewCards (1127) reveals opponents.
        if(this.current===context&&!signal.aborted)
          this.transport.send('showToast',{type:'success',message:i18nMgr.Get('UITexas_LookCardFlipSuccessTips',[],'翻牌成功，详情可去牌谱查看')});
      }else{
        const count=this.roomData.snapshot?.handInfo?.publicCardsList.length??0;
        if(count>=5)throw new Error('公共牌已经全部显示');
        const round=this.globalConfig.viewPublicCards.viewType===2?0:count===0?this.pb!.Def.Round.PREFLOP:count===3?this.pb!.Def.Round.FLOP:count===4?this.pb!.Def.Round.TURN:-1;
        if(round<0)throw new Error('公共牌状态无效');
        const result=await request.reveal(target,round,signal);
        if(this.watchCurrent(context,handNum)){
          const hand=this.roomData.snapshot!.handInfo!;
          hand.publicCardsList=[...hand.publicCardsList,...result.publicCardsList];
          if(result.publicCards2List.length)hand.secondPublicCardsList=[...hand.publicCardsList.slice(0,5-result.publicCards2List.length),...result.publicCards2List];
          watch.revealRound=Number(result.round)||0;
          watch.reveal=hand.publicCardsList.length<5;
          this.publishWatch(context);
          if(watch.reveal)void this.prepareSettlementWatch(context);
        }
      }
    }catch(error){if(this.watchCurrent(context,handNum)){watch[kind]=true;this.publishWatch(context);}throw error;}
    finally{context.watchPending=false;}
  }
  async standup(target: RoomTarget, signal: AbortSignal): Promise<boolean> {
    const c = this.seatContext(target);
    if(!this.roomData.snapshot?.myInfo?.seatId) return false;
    if(c.seatingBusy) throw new Error('座位请求正在处理');
    c.seatingBusy = true;
    try {
      const pending=await new StandupRequest(this.client,this.pb!).execute(target,signal);
      if(pending&&this.current===c&&this.roomData.snapshot?.myInfo){
        this.roomData.snapshot.myInfo.willStandup=true;
        c.receive({type:'snapshot',snapshot:this.project(this.roomData,target)});
      }
      return pending;
    }
    finally { c.seatingBusy = false; }
  }
  destroy(): void {
    this.mttLifecycle?.destroy();
    this.off.forEach((off) => off());
    this.client.destroy();
    this.current = undefined;
    this.roomData.clear();
    this.session.clear();
  }
}
