import { bindTableAppearance } from './appearance/TableAppearanceContext.js';
import { classicFelt, purpleFelt, cardBacks } from './appearance/TableSkin.js';
import { imageReady } from './resources.js';
import { getBrand } from './appearance/BrandManifest.js';
import { TableMediaView } from './components/TableMediaView.js';
import './media.css';
import { TableToolsView } from './components/TableToolsView.js';
import { TableChatView } from './components/TableChatView.js';
import './mtt.css';
import { MttTableStateView } from './components/MttTableStateView.js';
import './jackpot.css';
import { JackpotView } from './components/JackpotView.js';
import { CPErrorCode } from '../i18n/CPErrorCode.js';
import './mushroom-boom.css';
import { MushroomBoomView } from './components/MushroomBoomView.js';
import { SquidView } from './components/SquidView.js';
import './squid.css';
import './special-operations.css';
import { AgreeSecondPcsView } from './components/AgreeSecondPcsView.js';
import { InsuranceView } from './components/InsuranceView.js';
import type { RoomEmojis } from '../core/RoomEmojis.js';
import { EmojiController } from '../logic/EmojiController.js';
import { EmojiView } from './components/EmojiView.js';
import { SeatEmojiView } from './components/SeatEmojiView.js';
import './emoji.css';
import type { RoomRecords, SpecialOperations } from '../core/RoomRecords.js';
import { ReportController } from '../logic/ReportController.js';
import { HistoryController } from '../logic/HistoryController.js';
import { ReportView } from './components/ReportView.js';
import { HistoryView } from './components/HistoryView.js';
import { PlayerInfoView } from './components/PlayerInfoView.js';
import './records.css';
import './player-info.css';
import { DeskBackgroundView } from './components/DeskBackgroundView.js';
import { AllInTestView } from './components/AllInTestView.js';
import { SpineEffects } from '../effects/SpineEffects.js';
import { SeatPositionMotion } from './SeatPositionMotion.js';
import defaultSettings, { TexasGamePersonalSettings as Settings } from '../data/TexasGamePersonalSettings.js';
import { AppearanceResources } from './AppearanceResources.js';
import { BringOutView } from './components/BringOutView.js';
import { PersonalSettingsView } from './components/PersonalSettingsView.js';
import { CardView } from './components/CardView.js';
import { i18nLabel } from '../i18n/i18nLabel.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import type { SeatingActions } from '../core/Seating.js';
import { BuyInController } from '../logic/BuyInController.js';
import { BuyInView } from './components/BuyInView.js';
import { StringHelper } from '../logic/StringHelper.js';
import { ChipFormatter } from '../logic/ChipFormatter.js';
import { TableSound } from '../audio/TableSound.js';
import { SoundControlView } from './components/SoundControlView.js';
import type { Action, TableSnapshot } from '../core/types.js';
import { TableData } from '../data/TableData.js';
import { TableInfoData } from '../data/TableInfoData.js';
import { TablePresenter } from '../logic/TablePresenter.js';
import { BindingScope } from '../binding/BindingScope.js';
import { bindEvent } from '../binding/bindEvent.js';
import { TableLayout } from './TableLayout.js';
import { SeatView, type SeatComponent } from './components/SeatView.js';
import { PublicCardsView } from './components/PublicCardsView.js';
import { PotView } from './components/PotView.js';
import { NavigationView } from './components/NavigationView.js';
import { SettlementWatchView } from './components/SettlementWatchView.js';
import { TableMenuView } from './components/TableMenuView.js';
import { TableToastView } from './components/TableToastView.js';
import { TableConfirmDialog } from './components/TableConfirmDialog.js';
import { ActionControls } from './action-controls.js';
import { SpriteAtlas } from './SpriteAtlas.js';
import { element, place } from './dom.js';
import { resources } from './resources.js';
import type { TableComponents } from './TableComponents.js';
import './table.css';
import './settings.css';
import './dialog-glass.css';
import './appearance/appearance.css';
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
  private info = element('div', 'mx-room-info');
  private previousTable?: TableSnapshot;
  private seatViews = new Map<number, SeatComponent>();
  private remarkNames = new Map<number,string>();
  private allInTest?: AllInTestView;
  private report?: ReportView;
  private history?: HistoryView;
  private playerInfo: PlayerInfoView;
  private emoji?: EmojiView;
  private seatEmoji?: SeatEmojiView;
  private layout = new TableLayout();
  private deskBackground = new DeskBackgroundView(() => this.layout.unit);
  private bringOut: BringOutView;
  private buyIn: BuyInController;
  private buyInView: BuyInView;
  private showBB = false;
  private settings: Settings;
  private appearanceObserver?: MutationObserver;
  private personalSettings: PersonalSettingsView;
  private settingsOff: (() => void)[] = [];
  private appearanceGeneration = 0;
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
  private onVisible = () => {
    if (!document.hidden) this.presenter.restore();
  };
  constructor(
    command: (action: Action, amount?: number) => Promise<void>,
    leave: () => void,
    navigate?: (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => void,
    private options: { preferences?: Settings; specialOperations?: SpecialOperations; emojis?: RoomEmojis; records?: RoomRecords; testControls?: HTMLElement; layout?: 'portrait' | 'auto'; components?: TableComponents; seating?: SeatingActions } = {},
  ) {
    this.settings=options.preferences??defaultSettings;
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
    // Preview starts muted without overwriting the CC production preference.
    if (import.meta.env.DEV) this.settings.soundOn = false;
    this.soundControl = new SoundControlView(this.sound,this.settings);
    // CC keeps the sound switch in personal settings, not as a table overlay.
    this.soundControl.root.hidden = true;
    const components = options.components ?? {};
    this.bringOut=new BringOutView(async amount=>{if(!options.seating?.storeChips)throw new Error('当前入口不支持带出');await options.seating.storeChips(amount);});
    this.buyIn = new BuyInController(options.seating); this.buyInView = new BuyInView(this.buyIn,options.records,this.confirmDialog);
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
    if (options.records) {
      this.report = new ReportView(new ReportController(options.records));
      this.history = new HistoryView(new HistoryController(options.records));
    }
    if (options.emojis) {
      this.emoji = new EmojiView(new EmojiController(options.emojis));
      this.seatEmoji = new SeatEmojiView(options.emojis, this.root, this.sound);
    }
    const onNavigate = (action: 'report' | 'replay' | 'emoji' | 'effect' | 'voice' | 'camera') => {
      if(action==='report'&&options.records?.data.mtt){options.records.openMttRecord?.();return;}
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
        rules:(insurance)=>options.seating?.rules?.(insurance),
        bringIn:()=>this.buyIn.open(0),
        bringOut:()=>{const state=this.data.info.snapshot;if(state)this.bringOut.open(state);},
        keepSeat:async keep=>{if(options.records?.data.mtt){await options.records.mttAutoOp?.(true);return;}if(!options.seating?.keepSeat)throw new Error('当前入口不支持留座');await options.seating.keepSeat(keep);},
      }, error=>this.toast.show(error));
    this.settingsOff.push(this.settings.on(Settings.SHOW_BB,()=>{
      this.showBB=this.settings.showBB;const snapshot=this.data.info.snapshot;
      if(snapshot)this.presenter.present({...snapshot,showBB:this.showBB,presentation:'sync'});
    }));
    const appearance=async()=>{
      const generation=++this.appearanceGeneration;
      try {
        const appearance=this.settings.tableAppearance;
        const solid=appearance.style==='solid';
        const felt=appearance.feltColor==='#57427f'?purpleFelt:classicFelt;
        const [url]=await Promise.all([solid?imageReady(felt).then(()=>felt):AppearanceResources.desk(this.settings.deskType),AppearanceResources.cards(this.settings.tableCardType),appearance.cardBack==='original'?Promise.resolve():imageReady(cardBacks[appearance.cardBack]!)]);
        if(generation!==this.appearanceGeneration)return;
        this.root.dataset.felt=solid?'solid':'legacy';
        this.root.dataset.feltTone=solid&&appearance.feltColor==='#57427f'?'flat-purple':'shaded';
        this.root.style.backgroundColor=solid?appearance.feltColor:'';
        this.root.style.backgroundImage=solid?'none':`url("${url}")`;
        this.root.style.setProperty('--mx-felt-image',`url("${url}")`);
        void this.deskBackground.show(solid?0:this.settings.deskType, url);
        this.root.querySelectorAll<HTMLElement>('.mx-card[data-card-value]').forEach(card=>CardView.paint(card,Number(card.dataset.cardValue),card.dataset.smallBack==='true'));
      }catch(error){if(generation===this.appearanceGeneration)this.toast.show(error);}
    };
    this.settingsOff.push(this.settings.on(Settings.DESK_TYPE_CHANGE,()=>void appearance()),this.settings.on(Settings.POKER_CARD_TYPE_CHANGE,()=>void appearance()));
    const applyLayout=()=>{
      const a=this.settings.tableAppearance;
      this.layout.profile=a.layout;
      this.root.dataset.tableLayout=a.layout;
      this.root.style.setProperty('--mx-table-text-scale',String(a.tableTextSize/100));
      this.resizeTable();
      const state=this.data.info.snapshot;if(state)this.onTable(state);
    };
    this.settingsOff.push(this.settings.on(Settings.APPEARANCE_CHANGE,()=>{applyLayout();void appearance();}),this.settings.on(Settings.ACCOUNT_CHANGE,()=>{this.personalSettings.close();applyLayout();void appearance();}));
    this.layout.profile=this.settings.appearance.layout;
    this.root.dataset.tableLayout=this.layout.profile;
    this.root.style.setProperty('--mx-table-text-scale',String(this.settings.tableAppearance.tableTextSize/100));
    void appearance();
    this.stage.append(
      this.below,
      this.seats,
      this.pot.total,
      this.pot.pool,
      this.info,
      this.board.root,
      this.secondBoard.root,
      this.above,
      this.menu.root,
    );
    this.viewport.append(this.stage);
    this.root.append(this.deskBackground.root, this.viewport, this.controls.root, this.settlementWatch.root, this.navigation.root, this.soundControl.root, this.menu.overlay, this.toast.root, this.buyInView.root, this.personalSettings.root, this.bringOut.root, this.sound.root);
    if (this.report && this.history) this.root.append(this.report.root, this.history.root);
    if (this.emoji && this.seatEmoji) this.root.append(this.emoji.root, this.seatEmoji.root);
    this.root.append(this.playerInfo.root);
    this.root.append(this.confirmDialog.root);
    if(options.records){this.tableTools=new TableToolsView(options.records,()=>void this.buyIn.open(0));this.root.append(this.tableTools.root);}
    const specialOperations = options.specialOperations ?? options.records;
    if (specialOperations && options.seating) {
      this.secondPcs = new AgreeSecondPcsView(specialOperations, options.seating, error => this.toast.show(error));
      this.insurance = new InsuranceView(specialOperations, options.seating, error => this.toast.show(error));
      this.squid=new SquidView(specialOperations,options.seating,this.confirmDialog,error=>this.toast.show(error));
      this.stage.append(this.squid.root);
      this.jackpot=new JackpotView(specialOperations.data,()=>options.records?.openJackpot?.(),()=>queueMicrotask(()=>{if(this.root.isConnected)this.resizeTable();}));
      this.stage.append(this.jackpot.root);
      if(options.records){this.chat=new TableChatView(options.records,e=>this.toast.show(e));this.root.append(this.chat.button,this.chat.support,this.chat.dialog.root,this.chat.danmu.root);}
      if(options.records?.data.mtt){this.mtt=new MttTableStateView(options.records,e=>this.toast.show(e),()=>this.refreshRoomInfo());this.stage.append(this.mtt.root);}
      this.mushroomBoom=new MushroomBoomView(specialOperations.data,this.stage);
      this.root.append(this.mushroomBoom.guide.surface.root);
      this.root.append(this.secondPcs.root, this.insurance.root,this.squid.result.root,this.squid.intro.root);
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
    for (const [id, position] of this.layout.positions(state))
      this.seatViews.get(id)?.place(position, positionMode);
    this.refreshRoomInfo();
    const own = this.layout.positions(state).get(state.mySeat);
    for(const property of ['left','right','width'])this.controls.root.style.removeProperty(property);
    for(const name of ['--mx-op-upper-y','--mx-op-fold-x','--mx-op-main-x'])this.controls.root.style.removeProperty(name);
    const buttonScale=this.settings.tableAppearance.betButtonSize/100;
    if(this.layout.landscape)this.controls.setScale?.(.24*buttonScale);
    if (own && !this.layout.landscape) {
      const operationTop = (own.y - 210 * own.scale) * this.layout.unit - 28;
      this.controls.root.style.top = `${operationTop}px`;
      this.controls.root.style.setProperty('--mx-operation-row-y', `${operationTop}px`);
      // CC Operation.adjustPostion places freeCallNode 910 scaled units above my seat.
      this.controls.root.style.setProperty('--mx-raise-center-y', `${(own.y - 910 * own.scale) * this.layout.unit}px`);
      this.controls.setScale?.(own.scale * this.layout.unit * buttonScale);
      const profile=this.layout.modern;
      if(profile){
        this.controls.root.style.left=`calc(${own.x*this.layout.unit}px - 35%)`;
        this.controls.root.style.right=`calc(65% - ${own.x*this.layout.unit}px)`;
        const u=Math.min(this.layout.width/440,this.layout.height/782)*this.layout.unit;
        const rowY=own.y*this.layout.unit+profile.heroOperationY*u;
        this.controls.root.style.top=`${rowY-28}px`;
        this.controls.root.style.setProperty('--mx-operation-row-y',`${rowY-28}px`);
        this.controls.root.style.setProperty('--mx-raise-center-y',`${Math.max(160*u,rowY-180*u)}px`);
        this.controls.setScale?.(41.25/137*u*buttonScale);
        let upperY=profile.heroRaiseLift*u;
        if(profile.id==='classic'){
          const handTop=(own.y+own.cardsY*own.scale)*this.layout.unit-35.5*u;
          upperY=Math.max(65*u,rowY-handTop+(6+41.25*buttonScale/2)*u);
          this.controls.root.style.setProperty('--mx-classic-quick-lift',`${upperY-65*u}px`);
        }
        this.controls.root.style.setProperty('--mx-op-upper-y',`${upperY}px`);
        this.controls.root.style.setProperty('--mx-op-fold-x',`${-103*u}px`);
        this.controls.root.style.setProperty('--mx-op-main-x',`${103*u}px`);
      }
    }
    this.sound.present(state);
    this.settlementWatch.setScale(this.layout.unit);
    this.navigation.render?.(state);
    this.media?.render();
    this.controls.render(state);
    this.settlementWatch.render(state);
    this.menu.render(state);
    this.tableTools?.render(state);
    this.allInTest?.update(state);
  }
  private resizeTable(): void {
    const box = this.root.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    this.chat?.resize(box.width,box.height);
    this.root.style.setProperty('--mx-chat-unit',`${box.width/1440}px`);
    this.personalSettings.onFrameResize(box.width,box.height);
    this.report?.onFrameResize(box.width,box.height);
    this.history?.onFrameResize(box.width,box.height);
    this.playerInfo.onFrameResize(box.width,box.height);
    this.emoji?.onFrameResize(box.width,box.height);
    this.bringOut.onFrameResize(box.width,box.height);
    this.buyInView.onFrameResize(box.width,box.height);
    const landscape = this.options.layout === 'auto' && box.width > box.height;
    this.root.dataset.orientation = landscape ? 'landscape' : 'portrait';
    const { width, height } = this.viewport.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    this.layout.resize(width, landscape ? height : box.height, landscape, height);
    const l = this.layout;
    this.menu.resize(l.unit, l.height, l.suggest);
    this.menu.root.style.setProperty('--mx-menu-scale', String(l.menuScale));
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
    const dual=!!this.data.info.snapshot?.secondCommunity?.length;
    const boardSize=this.settings.tableAppearance.publicCardSize/100;
    l.publicCardScale=boardSize;
    if (landscape) {
      const scale = Math.min(1, l.width / 1900) * (dual ? .85 : 1);
      const gap=176*scale*boardSize+24;
      const center=l.height*(dual ? .48 : .54);
      place(this.board.root, l.width / 2, center-(dual ? gap/2 : 0));
      this.board.root.style.transform = `scale(${scale})`;
      place(this.secondBoard.root,l.width/2,center+gap/2);
      this.secondBoard.root.style.transform=`scale(${scale})`;
      place(this.pot.total, l.width / 2, l.height * (dual ? .23 : .385));
      place(this.pot.pool, l.width / 2, l.height * (dual ? .29 : .44));
      place(this.info, l.width / 2 - 650 * scale, l.height * 0.44);
    } else {
      const scale=l.suggest*(dual ? .85 : 1);
      const gap=176*scale*boardSize+24;
      const center=dual ? l.height*.45 : l.height/2-(l.suggest===1?176:0);
      place(this.board.root, l.width / 2, center-(dual ? gap/2 : 0));
      this.board.root.style.transform = `scale(${scale})`;
      place(this.secondBoard.root,l.width/2,center+gap/2);
      this.secondBoard.root.style.transform=`scale(${scale})`;
      place(this.pot.total, l.width / 2, (697.8+(this.jackpot?.extraHeight??0)) * l.suggest);
      place(this.pot.pool, l.width / 2, (775.6+(this.jackpot?.extraHeight??0)) * l.suggest);
      place(this.info, l.width / 2, ((dual ? 517.8 : 1000)+(this.jackpot?.extraHeight??0)) * l.suggest);
    }
    const profile=l.modern;
    if(profile){
      const u=Math.min(l.width/440,l.height/782);
      this.root.style.setProperty('--mx-layout-unit',`${u}px`);
      this.root.style.setProperty('--mx-felt-bottom',`${208*u*l.unit}px`);
      const scale=(profile.id==='classic'?59.5:50.59)/120*u*boardSize*(dual?.85:1);
      const y=profile.boardY/782*l.height;
      const boardGap=(71.02/50.59*120)*scale+10*u;
      place(this.board.root,l.width/2,y-(dual?boardGap/2:0));
      place(this.secondBoard.root,l.width/2,y+boardGap/2);
      this.board.root.style.transform=this.secondBoard.root.style.transform=`scale(${scale})`;
      place(this.pot.total,l.width/2,profile.potY/782*l.height);
      place(this.pot.pool,l.width/2,profile.potY/782*l.height+22*u);
      const infoY=Math.max(profile.infoY/782*l.height,dual?y+boardGap/2+88*scale+75:0);
      place(this.info,l.width/2,infoY);
      if(dual&&profile.id==='classic'){
        place(this.pot.total,l.width/2,Math.max(profile.potY/782*l.height,infoY+100));
        place(this.pot.pool,l.width/2,Math.max(profile.potY/782*l.height,infoY+100)+22*u);
      }
      this.root.style.setProperty('--mx-avatar-radius',profile.avatarRadius);
      this.root.style.setProperty('--mx-hero-card-height',`${120*profile.heroCardHeight/profile.heroCardWidth}px`);
      this.root.style.setProperty('--mx-ring-hand-type-y',`${(profile.heroCardsY+profile.heroCardHeight/2+8)*199/profile.avatar}px`);
      this.root.style.setProperty('--mx-ring-win-x',`${-120*199/profile.avatar}px`);
      this.root.style.setProperty('--mx-ring-win-y',`${profile.heroCardsY*199/profile.avatar-56.5}px`);
      this.root.style.setProperty('--mx-hero-info-y',`${profile.heroInfoY*199/profile.avatar}px`);
    } else {
      this.board.root.style.transform+=` scale(${boardSize})`;
      this.secondBoard.root.style.transform+=` scale(${boardSize})`;
    }
  }
  private refreshRoomInfo(): void {
    const state = this.data.info.snapshot;
    if (!state) return;
    i18nLabel.bind(this.info, () => {
      const m = this.options.records?.data.mtt;
      const blind = (sb: number, ante = 0) => `${StringHelper.GetLongString(sb)}/${StringHelper.GetLongString(sb * 2)}${ante > 0 ? `(${StringHelper.GetLongString(ante)})` : ''}`;
      const lines = [state.name, [i18nMgr.Get(`GameType_${state.gameType ?? 0}`), i18nMgr.Get(`PokerType_${state.pokerType ?? 0}`), i18nMgr.Get(`BetType_${state.limitBetType ?? 0}`)].join('-'), `${state.roomID}-${state.handNum}`,
        `${i18nMgr.Get(m ? 'UITexasReport_Text_MatchCurrBlindTip' : 'adaptation20006')} ${blind(state.smallBlind ?? 0, this.options.records?.data.snapshot?.roomInfo?.ante ?? 0)}`];
      if(this.layout.modern){lines[0]+=` · ${lines[2]}`;lines.splice(2,1);}
      if (m?.nextSmallBlind) {
        lines.push(`${i18nMgr.Get('UITexasReport_Text_MatchNextBlindTip')} ${blind(m.nextSmallBlind, m.nextAnte)}`);
        const seconds = m.getUpBlindRemainingSeconds();
        if (seconds > 0) lines.push(`${i18nMgr.Get('UITexasReport_Text_MatchZmsysjTip')} ${seconds}s`);
      }
      return lines.concat(this.squid?.infoLines() ?? [], this.mushroomBoom?.infoLines() ?? [], this.jackpot?.infoLines() ?? []).join('\n');
    });
  }
  private deltaToOrigin(group: HTMLElement): { x: number; y: number } {
    const rect = group.getBoundingClientRect(),
      stage = this.stage.getBoundingClientRect(),
      scale = Number(group.closest<HTMLElement>('.mx-seat')?.dataset.scale ?? 1),
      l = this.layout;
    return {
      x: (l.origin.x - (rect.left - stage.left) / l.unit) / scale,
      y: (l.origin.y - (rect.top - stage.top) / l.unit) / scale,
    };
  }
  destroy(): void {
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
    this.report?.destroy();
    this.history?.destroy();
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
