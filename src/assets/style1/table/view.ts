import { GameplayTableSettingView } from './components/GameplayTableSettingView/GameplayTableSettingView.js';
import { RecordDialogView } from './components/RecordDialogView/RecordDialogView.js';
import desktop from './layouts/desktop.json';
import {desktopScale} from './layouts/landscape-layout.js';
import { InsuranceRulesView } from './components/InsuranceRulesView/InsuranceRulesView.js';
import { GameRulesView } from './components/GameRulesView/GameRulesView.js';
import { TableEffectAnchors } from '../effects/TableEffectAnchors.js';
import { bindTableAppearance, renderedTableAppearance } from './appearance/TableAppearanceContext.js';
import { classicFelt, cardBacks } from './appearance/TableSkin.js';
import { imageReady } from './resources.js';
import { getBrand } from './appearance/BrandManifest.js';
import { TableMediaView } from './components/TableMediaView/TableMediaView.js';
import './media.css';
import { TableToolsView } from './components/TableToolsView/TableToolsView.js';
import { TableChatView } from './components/TableChatView/TableChatView.js';
import './mtt.css';
import { MttReportView } from './components/MttReportView/MttReportView.js';
import { MttTableStateView } from './components/MttTableStateView/MttTableStateView.js';
import './jackpot.css';
import { JackpotView } from './components/JackpotView/JackpotView.js';
import { CPErrorCode } from '../../../i18n/CPErrorCode.js';
import './mushroom-boom.css';
import { MushroomBoomView } from './components/MushroomBoomView/MushroomBoomView.js';
import { SquidView } from './components/SquidView/SquidView.js';
import './squid.css';
import './special-operations.css';
import { AgreeSecondPcsView } from './components/AgreeSecondPcsView/AgreeSecondPcsView.js';
import { InsuranceView } from './components/InsuranceView/InsuranceView.js';
import type { RoomEmojis } from '../../../core/RoomEmojis.js';
import { EmojiController } from '../../../logic/EmojiController.js';
import { EmojiView } from './components/EmojiView/EmojiView.js';
import { SeatEmojiView } from './components/SeatEmojiView/SeatEmojiView.js';
import './emoji.css';
import type { RoomRecords, SpecialOperations } from '../../../core/RoomRecords.js';
import { ReportController } from '../../../logic/ReportController.js';
import { HistoryController } from '../../../logic/HistoryController.js';
import { ReportView } from './components/ReportView/ReportView.js';
import { HistoryView } from './components/HistoryView/HistoryView.js';
import { PlayerInfoView } from './components/PlayerInfoView/PlayerInfoView.js';
import './records.css';
import './components/GameRulesView/layout.css';
import './player-info.css';
import { DeskBackgroundView } from './components/DeskBackgroundView/DeskBackgroundView.js';
import { AllInTestView } from './components/AllInTestView/AllInTestView.js';
import { SpineEffects } from '../effects/SpineEffects.js';
import { SeatPositionMotion } from './SeatPositionMotion.js';
import defaultSettings, { TexasGamePersonalSettings as Settings } from '../../../data/TexasGamePersonalSettings.js';
import { AppearanceResources } from './AppearanceResources.js';
import { BringOutView } from './components/BringOutView/BringOutView.js';
import { PersonalSettingsView } from './components/PersonalSettingsView/PersonalSettingsView.js';
import { CardView } from './components/CardView/CardView.js';
import { i18nMgr } from '../../../i18n/i18nMgr.js';
import type { SeatingActions } from '../../../core/Seating.js';
import { BuyInController } from '../../../logic/BuyInController.js';
import { BuyInView } from './components/BuyInView/BuyInView.js';
import { StringHelper } from '../../../logic/StringHelper.js';
import { ChipFormatter } from '../../../logic/ChipFormatter.js';
import { TableSound } from '../audio/TableSound.js';
import { SoundControlView } from './components/SoundControlView/SoundControlView.js';
import type { Action, TableSnapshot } from '../../../core/types.js';
import { TableData } from '../../../data/TableData.js';
import { TableInfoData } from '../../../data/TableInfoData.js';
import { TablePresenter } from '../../../logic/TablePresenter.js';
import { BindingScope } from '../../../binding/BindingScope.js';
import { bindEvent } from '../../../binding/bindEvent.js';
import type { TableLayout } from '../../../ui/TableLayout.js';
import type { TableUiConfig } from '../../../ui/TableUiConfig.js';
import { defaultTableUi } from './layouts/DefaultTableUi.js';
import { SeatView, type SeatComponent } from './components/SeatView/SeatView.js';
import { PublicCardsView } from './components/PublicCardsView/PublicCardsView.js';
import { PotView } from './components/PotView/PotView.js';
import { NavigationView } from './components/NavigationView/NavigationView.js';
import { SettlementWatchView } from './components/SettlementWatchView/SettlementWatchView.js';
import { TableMenuView } from './components/TableMenuView/TableMenuView.js';
import { TableToastView } from './components/TableToastView/TableToastView.js';
import { RoomInfoView } from './components/RoomInfoView/RoomInfoView.js';
import { entryButtonsLayout } from './layouts/entry-buttons-layout.js';
import { TableConfirmDialog } from './components/TableConfirmDialog/TableConfirmDialog.js';
import { ActionControls } from './action-controls.js';
import { SpriteAtlas } from './SpriteAtlas.js';
import { element, place } from './dom.js';
import { resources } from './resources.js';
import type { TableComponents } from '../../../ui/TableComponents.js';
import './table.css';
import './settings.css';
import './dialog-glass.css';
import './appearance/appearance.css';
import './layouts/desktop.css';
export { prepare } from './resources.js';
export class TableView {
  readonly root = element('section', 'mx-table');
  readonly below = element('div', 'mx-effects mx-effects-below');
  readonly above = element('div', 'mx-effects mx-effects-above');
  private effects = new SpineEffects(this.above);
  readonly data = new TableData();
  private presenter = new TablePresenter(this.data);
  private bindings = new BindingScope(this);
  private viewport = element('div', 'mx-viewport');
  private stage = element('div', 'mx-stage');
  private seats = element('div', 'mx-seats');
  private bets = element('div', 'mx-bets');
  private actionBubbles=element('div','mx-action-bubbles');
  private roomInfo = new RoomInfoView();
  private info = this.roomInfo.root;
  private roomSettings?:GameplayTableSettingView;
  private roomSettingsDialog?:RecordDialogView;
  private previousTable?: TableSnapshot;
  private seatViews = new Map<number, SeatComponent>();
  private remarkNames = new Map<number,string>();
  private allInTest?: AllInTestView;
  private mttReport?: MttReportView;
  private report?: ReportView;
  private history?: HistoryView;
  private gameRules = new GameRulesView();
  private insuranceRules: InsuranceRulesView;
  private playerInfo: PlayerInfoView;
  private emoji?: EmojiView;
  private seatEmoji?: SeatEmojiView;
  private layout: TableLayout;
  private layoutStyles = new Set<string>();
  private controlStyles = new Set<string>();
  private deskBackground = new DeskBackgroundView(() => this.layout.unit);
  private bringOut: BringOutView;
  requestSeat(seat:number):void {void this.buyIn.open(seat);}
  private buyIn: BuyInController;
  private buyInView: BuyInView;
  private showBB = false;
  private settings: Settings;
  private appearanceObserver?: MutationObserver;
  private personalSettings: PersonalSettingsView;
  private settingsOff: (() => void)[] = [];
  private appearanceGeneration = 0;
  private refreshAppearance:()=>Promise<void>=async()=>{};
  private get tableAppearance() { return renderedTableAppearance(this.root,this.settings); }
  private menu: TableMenuView;
  private toast = new TableToastView();
  private confirmDialog = new TableConfirmDialog();
  private secondPcs?: AgreeSecondPcsView;
  private insurance?: InsuranceView;
  private squid?:SquidView;
  private jackpot?:JackpotView;
  private mtt?:MttTableStateView;
  private chat?:TableChatView;
  private tableTools?:TableToolsView;
  private mushroomBoom?:MushroomBoomView;
  private sound = new TableSound();
  private soundControl: SoundControlView;
  private board: ReturnType<NonNullable<TableComponents['publicCards']>>;
  private secondBoard = new PublicCardsView(this.data.secondPublicCards);
  private pot: ReturnType<NonNullable<TableComponents['pot']>>;
  private controls: ReturnType<NonNullable<TableComponents['actions']>>;
  private media?: TableMediaView;
  private navigation: ReturnType<NonNullable<TableComponents['navigation']>>;
  private settlementWatch: SettlementWatchView;
  private resize: ResizeObserver;
  private entryFrame=0;
  private entryObserver=new ResizeObserver(()=>this.queueEntryButtons());
  private onVisible = () => {
    if (!document.hidden) this.presenter.restore();
  };
  constructor(
    command: (action: Action, amount?: number) => Promise<void>,
    leave: () => void,
    navigate?: (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => void,
    private options: { ui?: TableUiConfig; preferences?: Settings; specialOperations?: SpecialOperations; emojis?: RoomEmojis; records?: RoomRecords; testControls?: HTMLElement; layout?: 'portrait' | 'auto'; components?: TableComponents; seating?: SeatingActions } = {},
  ) {
    this.settings=options.preferences??defaultSettings;
    this.layout=(options.ui??defaultTableUi).createLayout(this.tableAppearance.layout);
    this.showBB=this.settings.showBB;
    bindTableAppearance(this.root,this.settings);
    this.root.style.setProperty('--mx-accent',getBrand(this.settings.brandID).accent);
    this.personalSettings=new PersonalSettingsView(this.settings);
    const repaint=(root:HTMLElement)=>{
      const paint=(card:HTMLElement)=>CardView.paint(card,Number(card.dataset.cardValue),card.dataset.smallBack==='true');
      if(root.matches('.mx-card[data-card-value]'))paint(root);
      root.querySelectorAll<HTMLElement>('.mx-card[data-card-value]').forEach(paint);
    };
    this.appearanceObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)repaint(node);})));
    this.appearanceObserver.observe(this.root,{subtree:true,childList:true});
    // New previews start muted; an explicitly saved sound choice takes priority.
    if (import.meta.env.DEV && !this.settings.hasSavedSoundPreference) this.settings.soundOn = false;
    this.soundControl = new SoundControlView(this.sound,this.settings);
    // CC keeps the sound switch in personal settings, not as a table overlay.
    this.soundControl.root.hidden = true;
    const components = options.components ?? {};
    this.bringOut=new BringOutView(async amount=>{if(!options.seating?.storeChips)throw new Error('当前入口不支持带出');await options.seating.storeChips(amount);});
    this.buyIn = new BuyInController(options.seating); this.buyInView = new BuyInView(this.buyIn,options.records,this.confirmDialog);
    const roomSettings=this.roomSettings=new GameplayTableSettingView(this.buyIn.settings);
    const roomDialog=this.roomSettingsDialog=new RecordDialogView(()=>i18nMgr.Get('UITableSetting_title'),()=>{roomSettings.show(null);roomDialog.show(false);});
    roomDialog.root.classList.add('mx-room-details');roomDialog.footer.hidden=true;roomDialog.body.append(roomSettings.root);
    this.info.type='button';this.info.onclick=()=>{roomSettings.show('rules');roomDialog.show(true);};
    this.root.append(roomDialog.root);

    this.playerInfo = new PlayerInfoView(options.records, options.emojis, (userRID, remark, nickname) => {
      if (remark) this.remarkNames.set(userRID, remark); else this.remarkNames.delete(userRID);
      for (const seat of this.seatViews.values()) {
        const data = this.data.seats.get(Number(seat.root.dataset.seat));
        const state = data.state;
        if (state.player?.userRid === userRID && !state.mine) data.state = {...state, player: {...state.player, name: remark || nickname}};
      }
    }, this.confirmDialog);
    this.seats.onclick = event => {
      const returnButton=(event.target as HTMLElement).closest<HTMLElement>('.mx-return-game');
      if(returnButton){
        if(options.records?.data.mtt){void options.records.mttAutoOp?.(false).catch(e=>this.toast.show(e));return;}
        const state=this.data.info.snapshot,p=state?.players.find(v=>v.seat===state.mySeat);
        if(p){
          if(p.chips>0&&p.keepSeatReason!==3)void options.seating?.keepSeat?.(false).catch(error=>this.toast.show(error));
          else void this.buyIn.open(0);
        }
        return;
      }
      const card=(event.target as HTMLElement).closest<HTMLElement>('.mx-seat-mine .mx-card-slot');
      if(card){
        const index=Number(card.dataset.cardIndex);
        if(Number.isInteger(index))void options.seating?.showdown?.(index).catch(error=>this.toast.show(error));
        return;
      }
      const avatar = (event.target as HTMLElement).closest<HTMLElement>('.mx-avatar-hit');
      if (avatar) {
        const seatID = Number(avatar.closest<HTMLElement>('.mx-seat')?.dataset.seat);
        const player = this.data.info.snapshot?.players.find(item => item.seat === seatID);
        if (player) void this.playerInfo.open(player);
        return;
      }
      const seat = (event.target as HTMLElement).closest<HTMLElement>('.mx-empty-seat');
      if(seat&&options.records?.data.mtt){if(options.records.data.mtt.observer)options.records.mttRegistration?.();return;}
      if(seat && !this.data.info.snapshot?.matchID && !this.data.info.snapshot?.mySeat) void this.buyIn.open(Number(seat.dataset.seat));
    };
    this.seats.onkeydown = event => { if(event.key==='Enter'||event.key===' ') { const seat=(event.target as HTMLElement).closest<HTMLElement>('.mx-empty-seat'); if(seat){event.preventDefault();seat.click();} } };
    this.board =
      components.publicCards?.(this.data.publicCards) ?? new PublicCardsView(this.data.publicCards);
    this.pot = components.pot?.(this.data.pot) ?? new PotView(this.data.pot);
    this.controls = components.actions?.(command) ?? new ActionControls(command, SpriteAtlas.paint, this.confirmDialog, options.seating?.addTime,this.settings);
    this.settlementWatch=new SettlementWatchView(kind=>options.seating?.watchSettlement?.(kind)??Promise.reject(new Error('当前入口不支持看牌')),
      error=>this.toast.show(error));
    const ruleData = (options.records ?? options.specialOperations)?.data;
    this.insuranceRules = new InsuranceRulesView(ruleData);
    if (options.records) {
      this.mttReport = new MttReportView(options.records);
      this.report = new ReportView(new ReportController(options.records), () => this.showBB);
      this.history = new HistoryView(new HistoryController(options.records), () => this.showBB);
    }
    if (options.emojis) {
      this.emoji = new EmojiView(new EmojiController(options.emojis));
      this.seatEmoji = new SeatEmojiView(options.emojis, new TableEffectAnchors(this.root,id=>options.emojis!.seatForUser(id)).avatar, this.sound);
    }
    const onNavigate = (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => {
      if(action==='report'&&options.records?.data.mtt){this.mttReport?.open();return;}
      if (action === 'report' && this.report) { this.emoji?.controller.close(); this.history?.controller.close(); this.report.open(); }
      else if (action === 'replay' && this.history) { this.emoji?.controller.close(); this.report?.controller.close(); this.history.open(); }
      else if (action === 'emoji' && this.emoji) {
        this.report?.controller.close(); this.history?.controller.close();
        if (!this.emoji.open()) this.toast.show(i18nMgr.Get('adaptation10016', [], '请先坐下'));
      } else if((action==='camera'||action==='voice'||action==='effect')&&options.records?.media)void options.records.media.toggle(action).catch(error=>this.toast.show(error));
      else navigate?.(action);
    };
    this.navigation = components.navigation?.(onNavigate) ?? new NavigationView(onNavigate);
    if(options.records?.media){this.media=new TableMediaView(options.records.media,this.root,error=>this.toast.show(error));this.root.append(this.media.root);}
    this.root.style.backgroundImage = `url("${resources.desk}")`;
    const exit=()=>{try{options.records?.leaveTable?.();leave();}catch(error){this.toast.show(error);}};
    const requestLeave=()=>{
      const d=(options.specialOperations??options.records)?.data,r=d?.record;
      if(r?.calltime===1&&d?.callTime.state.stay)this.confirmDialog.open({owner:'calltime-leave',message:()=>StringHelper.Format(i18nMgr.Get('UICallTimeQuitRoom'),[r.calltimeWinLine,r.calltimeLimit,r.calltimeWinLine]),cancel:()=>CPErrorCode.LanguageDescription(10013),commit:()=>i18nMgr.Get('UITexas_LeaveTheTable'),onCancel:()=>{},onCommit:exit});
      else exit();
    };
    this.menu = new TableMenuView(requestLeave, () => {
        this.settings.setShowBBToStorage(!this.settings.showBB);
        this.showBB = this.settings.showBB;
        const snapshot = this.data.info.snapshot;
        if (snapshot) this.presenter.present({ ...snapshot, showBB: this.showBB, presentation: 'sync' });
        return this.showBB;
      }, options.seating ? async () => { if(this.squid)this.squid.standup();else await options.seating!.standup(); } : undefined, {
        settings:()=>this.personalSettings.open(),
        rules: insurance => {
          if (insurance) this.insuranceRules.open();
          else {
            const state = this.data.info.snapshot;
            this.gameRules.open({
              gameType: state?.gameType,
              pokerType: state?.pokerType,
              criticalHit: !!ruleData?.snapshot?.roomInfo?.criticalHit,
            });
          }
        },
        bringIn:()=>this.buyIn.open(0),
        bringOut:()=>{const state=this.data.info.snapshot;if(state)this.bringOut.open(state);},
        keepSeat:async keep=>{if(options.records?.data.mtt){await options.records.mttAutoOp?.(true);return;}if(!options.seating?.keepSeat)throw new Error('当前入口不支持留座');await options.seating.keepSeat(keep);},
      }, error=>this.toast.show(error));
    this.settingsOff.push(this.settings.on(Settings.SHOW_BB,()=>{
      this.showBB=this.settings.showBB;const snapshot=this.data.info.snapshot;
      if(snapshot)this.presenter.present({...snapshot,showBB:this.showBB,presentation:'sync'});
    }));
    const appearance=this.refreshAppearance=async()=>{
      const generation=++this.appearanceGeneration;
      try {
        const appearance=this.tableAppearance;
        const solid=appearance.style==='solid';
        const felt=classicFelt;
        const [url]=await Promise.all([solid?imageReady(felt).then(()=>felt):AppearanceResources.desk(this.settings.deskType),AppearanceResources.cards(this.settings.tableCardType),appearance.cardBack==='original'?Promise.resolve():imageReady(cardBacks[appearance.cardBack]!)]);
        if(generation!==this.appearanceGeneration)return;
        this.root.dataset.felt=solid?'solid':'legacy';
        this.root.style.backgroundColor=solid?appearance.feltColor:'';
        this.root.style.backgroundImage=solid?'none':`url("${url}")`;
        this.root.style.setProperty('--mx-felt-image',`url("${url}")`);
        void this.deskBackground.show(solid?0:this.settings.deskType, url);
        this.root.querySelectorAll<HTMLElement>('.mx-card[data-card-value]').forEach(card=>CardView.paint(card,Number(card.dataset.cardValue),card.dataset.smallBack==='true'));
      }catch(error){if(generation===this.appearanceGeneration)this.toast.show(error);}
    };
    this.settingsOff.push(this.settings.on(Settings.DESK_TYPE_CHANGE,()=>void appearance()),this.settings.on(Settings.POKER_CARD_TYPE_CHANGE,()=>void appearance()));
    const applyLayout=()=>{
      const a=this.tableAppearance;
      this.layout=(options.ui??defaultTableUi).createLayout(a.layout);
      this.root.dataset.tableLayout=this.layout.id;
      this.root.style.setProperty('--mx-table-text-scale',String(a.tableTextSize/100));
      this.resizeTable();
      const state=this.data.info.snapshot;if(state)this.onTable(state);
    };
    this.settingsOff.push(this.settings.on(Settings.APPEARANCE_CHANGE,()=>{applyLayout();void appearance();}),this.settings.on(Settings.ACCOUNT_CHANGE,()=>{this.personalSettings.close();applyLayout();void appearance();}));
    this.root.dataset.tableLayout=this.layout.id;
    this.root.style.setProperty('--mx-table-text-scale',String(this.tableAppearance.tableTextSize/100));
    void appearance();
    this.stage.append(
      this.below,
      this.seats,
      this.pot.total,
      this.pot.pool,
      this.info,
      this.board.root,
      this.secondBoard.root,
      this.bets,
      this.above,
      this.menu.root,
    );
    this.viewport.append(this.stage);
    this.root.append(this.deskBackground.root, this.viewport, this.controls.root, this.actionBubbles, this.settlementWatch.root, this.navigation.root, this.soundControl.root, this.menu.overlay, this.toast.root, this.buyInView.root, this.personalSettings.root, this.bringOut.root, this.sound.root);
    if (this.mttReport) this.root.append(this.mttReport.dialog.root);
    if (this.report && this.history) this.root.append(this.report.root, this.history.root);
    this.root.append(this.gameRules.root, this.insuranceRules.root);
    if (this.emoji && this.seatEmoji) this.root.append(this.emoji.root, this.seatEmoji.root);
    this.root.append(this.playerInfo.root);
    this.root.append(this.confirmDialog.root);
    if(options.records){this.tableTools=new TableToolsView(options.records,()=>void this.buyIn.open(0));this.root.append(this.tableTools.root);}
    const specialOperations = options.specialOperations ?? options.records;
    if (specialOperations && options.seating) {
      this.secondPcs = new AgreeSecondPcsView(specialOperations, options.seating, error => this.toast.show(error));
      this.insurance = new InsuranceView(specialOperations, options.seating, error => this.toast.show(error));
      this.squid=new SquidView(specialOperations,options.seating,this.confirmDialog,error=>this.toast.show(error),()=>this.queueEntryButtons());
      this.stage.append(this.squid.root);
      this.jackpot=new JackpotView(specialOperations.data,()=>options.records?.openJackpot?.(),()=>queueMicrotask(()=>{if(this.root.isConnected)this.resizeTable();}));
      this.stage.append(this.jackpot.root);
      if(options.records){this.chat=new TableChatView(options.records,e=>this.toast.show(e));this.root.append(this.chat.button,this.chat.support,this.chat.dialog.root,this.chat.danmu.root);}
      if(options.records?.data.mtt){this.mtt=new MttTableStateView(options.records,e=>this.toast.show(e),()=>this.refreshRoomInfo());this.stage.append(this.mtt.root);}
      this.mushroomBoom=new MushroomBoomView(specialOperations.data,this.stage);
      this.root.append(this.mushroomBoom.guide.surface.root);
      // Match the lower settlement layer so the shared mask stays on the upper dialog.
      this.root.prepend(this.squid.result.root);
      this.root.append(this.secondPcs.root, this.insurance.root,this.squid.intro.root);
    }
    if (import.meta.env.DEV && options.testControls) {
      this.allInTest = new AllInTestView(this.effects, this.seatViews);
      options.testControls.append(this.allInTest.root);
    }
    this.bindings.bind({ table: this.data.info });
    this.resize = new ResizeObserver(() => {
      this.resizeTable();
      this.presenter.restore();
    });
    this.resize.observe(this.root);
    this.resize.observe(this.viewport);
    this.entryObserver.observe(this.info);
    document.addEventListener('visibilitychange', this.onVisible);
  }
  render(state: TableSnapshot): void {
    if (this.data.info.snapshot === state) return;
    this.resizeTable();
    this.presenter.present({ ...state, players: state.players.map(player => player.userRid && this.remarkNames.has(player.userRid) && player.seat !== state.mySeat ? {...player, name: this.remarkNames.get(player.userRid)!} : player), showBB: this.showBB });
  }
  @bindEvent(TableInfoData.CHANGE, 'table')
  private onTable(state: TableSnapshot | null): void {
    if (!state) return;
    if (this.playerInfo.currentSeat && !state.players.some(player => player.seat === this.playerInfo.currentSeat && player.userRid === this.playerInfo.currentUserRID)) this.playerInfo.close();
    if (!!state.secondCommunity?.length !== !!this.previousTable?.secondCommunity?.length) this.resizeTable();
    const positionMode = SeatPositionMotion.mode(this.previousTable, state);
    this.previousTable = state;
    for (const [id, view] of this.seatViews)
      if (id > state.seatCount) {
        view.destroy();
        this.seatViews.delete(id);
      }
    for (let id = 1; id <= state.seatCount; id++)
      if (!this.seatViews.has(id)) {
        const data = this.data.seats.get(id),
          delta = (group: HTMLElement) => this.deltaToOrigin(group);
        const view = this.options.components?.seat?.(data, delta) ?? new SeatView(data, delta, this.effects);
        this.seatViews.set(id, view);
        this.seats.append(view.root);
      }
    for (const [id, position] of this.layout.positions(state,this.tableAppearance.publicCardSize/100)){
      const seat=this.seatViews.get(id);
      seat?.setActionLayer?.(this.layout.elevatedActionBubbles?this.actionBubbles:null,this.layout.unit);
      seat?.setBetLayer?.(this.layout.elevatedBets?this.bets:null);
      seat?.place(position, positionMode);
    }
    this.refreshRoomInfo();
    const controls=this.layout.controls(state,this.tableAppearance.betButtonSize/100);
    if(controls.scale!==undefined)this.controls.setScale?.(controls.scale);
    // Layout coordinates override the component's scaled default positions.
    this.applyLayoutStyles(this.controls.root,controls.styles,this.controlStyles);
    this.sound.present(state);
    this.navigation.render?.(state);
    this.media?.render();
    this.controls.render(state);
    this.settlementWatch.render(state);
    this.menu.render(state);
    this.tableTools?.render(state);
    this.allInTest?.update(state);
    this.queueEntryButtons();
  }
  private resizeTable(): void {
    const box = this.root.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const landscape = this.options.layout === 'auto' && box.width > box.height;
    const orientation=landscape?'landscape':'portrait';
    const orientationChanged=this.root.dataset.orientation!==orientation;
    this.root.dataset.orientation=orientation;
    this.root.style.setProperty('--mx-pc-scale',String(landscape?desktopScale(box.width,box.height):1));
    this.root.style.setProperty('--mx-table-text-scale',String(this.tableAppearance.tableTextSize/100));
    if(orientationChanged)void this.refreshAppearance();
    this.chat?.resize(box.width,box.height);
    this.root.style.setProperty('--mx-chat-unit',`${landscape?desktop.avatarSize/desktop.avatarDesignSize*desktopScale(box.width,box.height):1/3}px`);
    this.personalSettings.onFrameResize(box.width,box.height);
    this.roomSettingsDialog?.onFrameResize(box.width,box.height);
    this.mttReport?.onFrameResize(box.width,box.height);
    this.report?.onFrameResize(box.width,box.height);
    this.history?.onFrameResize(box.width,box.height);
    this.playerInfo.onFrameResize(box.width,box.height);
    this.emoji?.onFrameResize(box.width,box.height);
    this.bringOut.onFrameResize(box.width,box.height);
    this.buyInView.onFrameResize(box.width,box.height);
    const { width, height } = this.viewport.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const navigationBox=this.navigation.root.getBoundingClientRect();
    const contentBottom=!navigationBox.height?height:Math.min(height,navigationBox.top-box.top);
    const navigationInset=landscape&&navigationBox.height?box.bottom-navigationBox.top:box.height-contentBottom;
    this.root.style.setProperty('--mx-navigation-inset',`${navigationInset}px`);
    this.layout.resize(width, landscape ? height : box.height, landscape, contentBottom);
    const l = this.layout;
    this.root.style.setProperty('--mx-pc-stage-unit',String(l.unit));
    const fixedBoardSlots = l.id === 'classic' && !landscape;
    if (this.board instanceof PublicCardsView) this.board.setFixedSlots(fixedBoardSlots);
    // Only the first board has placeholder slots; the optional second run renders actual cards.
    this.secondBoard.setFixedSlots(false);
    this.root.style.setProperty('--mx-side-bubble-unit', `${landscape?desktop.avatarSize/desktop.avatarDesignSize*desktopScale(box.width,box.height):l.id==='original'?1/3:1}px`);
    this.settlementWatch.resize(l.unit,landscape ? 0 : box.height - contentBottom);
    this.menu.resize(l.unit, l.height, l.suggest, landscape);
    this.menu.root.style.setProperty('--mx-menu-scale',String(l.menuScale));
    this.squid?.resize(l.suggest);
    this.jackpot?.resize(l.width,l.height,l.suggest);
    this.mtt?.resize(l.width,l.height,l.suggest);
    queueMicrotask(()=>this.mushroomBoom?.mushroom.resize());
    this.toast.setScale(l.unit);
    Object.assign(this.stage.style, {
      left: '0px',
      top: '0px',
      width: `${l.width}px`,
      height: `${l.height}px`,
      transform: `scale(${l.unit})`,
    });
    const content=l.content({dual:!!this.data.info.snapshot?.secondCommunity?.length,
      boardSize:this.tableAppearance.publicCardSize/100,jackpotHeight:this.jackpot?.extraHeight??0,textSize:this.tableAppearance.tableTextSize/100});
    for(const [node,point] of [[this.board.root,content.board],[this.secondBoard.root,content.secondBoard],
      [this.pot.total,content.total],[this.pot.pool,content.pool],[this.info,content.info]] as const){
      place(node,point.x,point.y);
      node.style.transform=point.scale===undefined?'':`scale(${point.scale})`;
    }
    this.applyLayoutStyles(this.root,content.styles,this.layoutStyles);
    this.queueEntryButtons();
  }
  private queueEntryButtons():void {
    if(this.entryFrame)return;
    this.entryFrame=requestAnimationFrame(()=>{
      this.entryFrame=0;
      const state=this.data.info.snapshot;
      if(!state||!this.root.isConnected)return;
      const bounds=this.seatViews.get(state.mySeat||1)?.entryActionsBounds?.();
      const info=this.info.getBoundingClientRect(),stage=this.stage.getBoundingClientRect();
      if(!bounds||!info.height||!this.layout.unit)return;
      const mtt=!!this.mtt?.returnVisible;
      const obstacles=[...(this.board instanceof PublicCardsView?this.board.cardBounds():[]),...this.secondBoard.cardBounds(),
        this.pot.total.getBoundingClientRect(),this.pot.pool.getBoundingClientRect(),...(this.layout.landscape?(this.jackpot?.bounds()??[]):[])];
      const styles=entryButtonsLayout({info,stage,avatarTop:bounds.avatarTop,unit:this.layout.unit,seatScale:bounds.scale,
        join:!!this.squid?.joinVisible,returning:mtt||bounds.returnVisible,mtt,mttScale:this.layout.suggest,obstacles});
      for(const [name,value]of Object.entries(styles))this.root.style.setProperty(name,value);
      this.root.dataset.entryActions='true';
    });
  }
  private applyLayoutStyles(node: HTMLElement, values: Record<string,string>, previous: Set<string>): void {
    for(const name of previous)if(!(name in values))node.style.removeProperty(name);
    previous.clear();
    for(const [name,value] of Object.entries(values)){node.style.setProperty(name,value);previous.add(name);}
  }
  private refreshRoomInfo(): void {
    const state = this.data.info.snapshot;
    if (!state) return;
    this.roomInfo.render(() => {
      const m = this.options.records?.data.mtt;
      const blind = (sb: number, ante = 0) => `${StringHelper.GetLongString(sb)}/${StringHelper.GetLongString(sb * 2)}${ante > 0 ? `(${StringHelper.GetLongString(ante)})` : ''}`;
      const lines = [state.name, [i18nMgr.Get(`GameType_${state.gameType ?? 0}`), i18nMgr.Get(`PokerType_${state.pokerType ?? 0}`), i18nMgr.Get(`BetType_${state.limitBetType ?? 0}`)].join('-'), `${state.roomID}-${state.handNum}`,
        `${i18nMgr.Get(m ? 'UITexasReport_Text_MatchCurrBlindTip' : 'adaptation20006')} ${blind(state.smallBlind ?? 0, this.options.records?.data.snapshot?.roomInfo?.ante ?? 0)}`];
      if (m?.nextSmallBlind) {
        lines.push(`${i18nMgr.Get('UITexasReport_Text_MatchNextBlindTip')} ${blind(m.nextSmallBlind, m.nextAnte)}`);
        const seconds = m.getUpBlindRemainingSeconds();
        if (seconds > 0) lines.push(`${i18nMgr.Get('UITexasReport_Text_MatchZmsysjTip')} ${seconds}s`);
      }
      const extra = [...(this.squid?.infoLines() ?? []), ...(this.mushroomBoom?.infoLines() ?? []), ...(this.jackpot?.infoLines() ?? [])];
      const room = this.options.records?.data;
      const details = lines.slice(3);
      if ((room?.record?.insuranceOn ?? 0) > 0) details.push(i18nMgr.Get('UITexas_InsuranceMode'));
      if (room?.snapshot?.roomInfo?.delaySeeCard) details.push(i18nMgr.Get('adaptation20088'));
      return { compact: this.layout.compactRoomInfo, name: state.name,
        game: i18nMgr.Get((state.pokerType ?? 0) === 2 ? 'PokerType_2' : (state.gameType ?? 0) > 0 ? 'UITexasInfo_Omaha' : 'GameType_0'),
        id: lines[2]!, details: details.concat(extra), legacy: lines.concat(extra) };
    });
    this.queueEntryButtons();
  }
  private deltaToOrigin(group: HTMLElement): { x: number; y: number } {
    const rect = group.getBoundingClientRect(),
      stage = this.stage.getBoundingClientRect(),
      scale = Number(group.closest<HTMLElement>('.mx-seat')?.dataset.scale ?? 1),
      l = this.layout;
    return {
      x: (l.origin.x - (rect.left + rect.width*Number(group.dataset.anchorX??0) - stage.left) / l.unit) / scale,
      y: (l.origin.y - (rect.top + rect.height*Number(group.dataset.anchorY??0) - stage.top) / l.unit) / scale,
    };
  }
  destroy(): void {
    this.entryObserver.disconnect();
    cancelAnimationFrame(this.entryFrame);
    this.roomInfo.destroy();
    this.media?.destroy();
    this.secondPcs?.destroy();
    this.insurance?.destroy();
    this.squid?.destroy();
    this.mushroomBoom?.destroy();
    this.chat?.destroy();
    this.tableTools?.destroy();
    this.jackpot?.destroy();
    this.mtt?.destroy();
    this.appearanceGeneration++;
    this.deskBackground.destroy();
    this.appearanceObserver?.disconnect();
    this.settingsOff.forEach(off=>off());
    this.personalSettings.destroy();
    this.mttReport?.destroy();
    this.report?.destroy();
    this.history?.destroy();
    this.gameRules.destroy();
    this.roomSettings?.destroy();this.roomSettingsDialog?.destroy();
    this.insuranceRules.destroy();
    this.playerInfo.destroy();
    this.emoji?.destroy(); this.seatEmoji?.destroy();
    this.bringOut.destroy();
    this.resize.disconnect();
    document.removeEventListener('visibilitychange', this.onVisible);
    this.bindings.destroy();
    this.allInTest?.destroy();
    this.seatViews.forEach((v) => v.destroy());
    this.effects.destroy();
    this.board.destroy();
    this.secondBoard.destroy();
    this.pot.destroy();
    this.controls.destroy();
    this.settlementWatch.destroy();
    this.navigation.destroy?.();
    this.buyIn.destroy();
    this.buyInView.destroy();
    this.soundControl.destroy();
    this.menu.destroy();
    this.toast.destroy();
    this.confirmDialog.destroy();
    this.sound.destroy();
    this.data.destroy();
    this.root.remove();
  }
}
