import type { RoomEmojis } from '../core/RoomEmojis.js';
import { EmojiController } from '../logic/EmojiController.js';
import { EmojiView } from './components/EmojiView.js';
import { SeatEmojiView } from './components/SeatEmojiView.js';
import './emoji.css';
import type { RoomRecords } from '../core/RoomRecords.js';
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
import settings, { TexasGamePersonalSettings as Settings } from '../data/TexasGamePersonalSettings.js';
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
import { TableMenuView } from './components/TableMenuView.js';
import { ActionControls } from './action-controls.js';
import { SpriteAtlas } from './SpriteAtlas.js';
import { element, place } from './dom.js';
import { resources } from './resources.js';
import type { TableComponents } from './TableComponents.js';
import './table.css';
import './settings.css';
import './dialog-glass.css';
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
  private showBB = settings.showBB;
  private personalSettings = new PersonalSettingsView();
  private settingsOff: (() => void)[] = [];
  private appearanceGeneration = 0;
  private menu: TableMenuView;
  private sound = new TableSound();
  private soundControl: SoundControlView;
  private board: ReturnType<NonNullable<TableComponents['publicCards']>>;
  private pot: ReturnType<NonNullable<TableComponents['pot']>>;
  private controls: ReturnType<NonNullable<TableComponents['actions']>>;
  private navigation: ReturnType<NonNullable<TableComponents['navigation']>>;
  private resize: ResizeObserver;
  private onVisible = () => {
    if (!document.hidden) this.presenter.restore();
  };
  constructor(
    command: (action: Action, amount?: number) => Promise<void>,
    leave: () => void,
    navigate?: (action: 'report' | 'replay' | 'emoji' | 'voice') => void,
    private options: { emojis?: RoomEmojis; records?: RoomRecords; testControls?: HTMLElement; layout?: 'portrait' | 'auto'; components?: TableComponents; seating?: SeatingActions } = {},
  ) {
    // Preview starts muted without overwriting the CC production preference.
    if (import.meta.env.DEV) settings.soundOn = false;
    this.soundControl = new SoundControlView(this.sound);
    const components = options.components ?? {};
    this.bringOut=new BringOutView(async amount=>{if(!options.seating?.storeChips)throw new Error('当前入口不支持带出');await options.seating.storeChips(amount);});
    this.buyIn = new BuyInController(options.seating); this.buyInView = new BuyInView(this.buyIn);
    this.playerInfo = new PlayerInfoView(options.records, options.emojis, (userRID, remark, nickname) => {
      if (remark) this.remarkNames.set(userRID, remark); else this.remarkNames.delete(userRID);
      for (const seat of this.seatViews.values()) {
        const data = this.data.seats.get(Number(seat.root.dataset.seat));
        const state = data.state;
        if (state.player?.userRid === userRID && !state.mine) data.state = {...state, player: {...state.player, name: remark || nickname}};
      }
    });
    this.seats.onclick = event => {
      const avatar = (event.target as HTMLElement).closest<HTMLElement>('.mx-avatar-hit');
      if (avatar) {
        const seatID = Number(avatar.closest<HTMLElement>('.mx-seat')?.dataset.seat);
        const player = this.data.info.snapshot?.players.find(item => item.seat === seatID);
        if (player) void this.playerInfo.open(player);
        return;
      }
      const seat = (event.target as HTMLElement).closest<HTMLElement>('.mx-empty-seat');
      if(seat && !this.data.info.snapshot?.mySeat) void this.buyIn.open(Number(seat.dataset.seat));
    };
    this.seats.onkeydown = event => { if(event.key==='Enter'||event.key===' ') { const seat=(event.target as HTMLElement).closest<HTMLElement>('.mx-empty-seat'); if(seat){event.preventDefault();seat.click();} } };
    this.board =
      components.publicCards?.(this.data.publicCards) ?? new PublicCardsView(this.data.publicCards);
    this.pot = components.pot?.(this.data.pot) ?? new PotView(this.data.pot);
    this.controls = components.actions?.(command) ?? new ActionControls(command, SpriteAtlas.paint);
    if (options.records) {
      this.report = new ReportView(new ReportController(options.records));
      this.history = new HistoryView(new HistoryController(options.records));
    }
    if (options.emojis) {
      this.emoji = new EmojiView(new EmojiController(options.emojis));
      this.seatEmoji = new SeatEmojiView(options.emojis, this.root, this.sound);
    }
    const onNavigate = (action: 'report' | 'replay' | 'emoji' | 'voice') => {
      if (action === 'report' && this.report) { this.emoji?.controller.close(); this.history?.controller.close(); this.report.open(); }
      else if (action === 'replay' && this.history) { this.emoji?.controller.close(); this.report?.controller.close(); this.history.open(); }
      else if (action === 'emoji' && this.emoji) {
        this.report?.controller.close(); this.history?.controller.close();
        if (!this.emoji.open()) this.menu.status.textContent = i18nMgr.Get('adaptation10016', [], '请先坐下');
      } else navigate?.(action);
    };
    this.navigation = components.navigation?.(onNavigate) ?? new NavigationView(onNavigate);
    this.root.style.backgroundImage = `url("${resources.desk}")`;
    this.menu = new TableMenuView(leave, () => {
        settings.setShowBBToStorage(!settings.showBB);
        this.showBB = settings.showBB;
        const snapshot = this.data.info.snapshot;
        if (snapshot) this.presenter.present({ ...snapshot, showBB: this.showBB, presentation: 'sync' });
        return this.showBB;
      }, options.seating ? async () => {
        const pending = await options.seating!.standup();
        return pending ? i18nMgr.Get("MX_StandUpAfterThisHand", [], "本手结束后站起") : i18nMgr.Get("MX_StandUpRequested", [], "已请求站起");
      } : undefined, {
        settings:()=>this.personalSettings.open(),
        rules:(insurance)=>options.seating?.rules?.(insurance),
        bringIn:()=>this.buyIn.open(0),
        bringOut:()=>{const state=this.data.info.snapshot;if(state)this.bringOut.open(state);},
        keepSeat:async keep=>{if(!options.seating?.keepSeat)throw new Error('当前入口不支持留座');await options.seating.keepSeat(keep);},
      });
    this.settingsOff.push(settings.on(Settings.SHOW_BB,()=>{
      this.showBB=settings.showBB;const snapshot=this.data.info.snapshot;
      if(snapshot)this.presenter.present({...snapshot,showBB:this.showBB,presentation:'sync'});
    }));
    const appearance=async()=>{
      const generation=++this.appearanceGeneration;
      try {
        const [url]=await Promise.all([AppearanceResources.desk(settings.deskType),AppearanceResources.cards(settings.pokerCardType)]);
        if(generation!==this.appearanceGeneration)return;
        this.root.style.backgroundImage=`url("${url}")`;
        void this.deskBackground.show(settings.deskType, url);
        this.stage.querySelectorAll<HTMLElement>('.mx-card[data-card-value]').forEach(card=>CardView.paint(card,Number(card.dataset.cardValue),card.dataset.smallBack==='true'));
      }catch(error){this.menu.status.textContent=error instanceof Error?error.message:String(error);}
    };
    this.settingsOff.push(settings.on(Settings.DESK_TYPE_CHANGE,()=>void appearance()),settings.on(Settings.POKER_CARD_TYPE_CHANGE,()=>void appearance()));
    void appearance();
    this.stage.append(
      this.below,
      this.seats,
      this.pot.total,
      this.pot.pool,
      this.info,
      this.board.root,
      this.above,
      this.menu.root,
    );
    this.viewport.append(this.stage);
    this.root.append(this.deskBackground.root, this.viewport, this.controls.root, this.navigation.root, this.soundControl.root, this.menu.overlay, this.menu.status, this.buyInView.root, this.personalSettings.root, this.bringOut.root, this.sound.root);
    if (this.report && this.history) this.root.append(this.report.root, this.history.root);
    if (this.emoji && this.seatEmoji) this.root.append(this.emoji.root, this.seatEmoji.root);
    this.root.append(this.playerInfo.root);
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
    i18nLabel.bind(this.info, () => [state.name, i18nMgr.Get("MX_HoldEmRegularNoLimit", [], "德州-普通-无限注"), `${state.roomID}-${state.handNum}`, `${i18nMgr.Get("adaptation20006")} ${StringHelper.GetLongString(state.smallBlind ?? 0)}/${StringHelper.GetLongString((state.smallBlind ?? 0) * 2)}`].join('\n'));
    const own = this.layout.positions(state).get(state.mySeat);
    if (own && !this.layout.landscape) this.controls.root.style.top = `${(own.y + own.cardsY * own.scale) * this.layout.unit - 28}px`;
    this.sound.present(state);
    this.controls.render(state);
    this.menu.render(state);
    this.allInTest?.update(state);
  }
  private resizeTable(): void {
    const box = this.root.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
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
    this.layout.resize(width, landscape ? height : height + this.navigation.root.getBoundingClientRect().height, landscape);
    const l = this.layout;
    this.menu.resize(l.unit, l.height, l.suggest);
    Object.assign(this.stage.style, {
      left: '0px',
      top: '0px',
      width: `${l.width}px`,
      height: `${l.height}px`,
      transform: `scale(${l.unit})`,
    });
    if (landscape) {
      const scale = Math.min(1, l.width / 1900);
      place(this.board.root, l.width / 2, l.height * 0.54);
      this.board.root.style.transform = `scale(${scale})`;
      place(this.pot.total, l.width / 2, l.height * 0.385);
      place(this.pot.pool, l.width / 2, l.height * 0.44);
      place(this.info, l.width / 2 - 420 * scale, l.height * 0.44);
    } else {
      place(this.board.root, l.width / 2, l.height / 2 - (l.suggest === 1 ? 176 : 0));
      this.board.root.style.transform = `scale(${l.suggest})`;
      place(this.pot.total, l.width / 2, 697.8 * l.suggest);
      place(this.pot.pool, l.width / 2, 775.6 * l.suggest);
      place(this.info, l.width / 2, 1000 * l.suggest);
    }
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
    this.appearanceGeneration++;
    this.deskBackground.destroy();
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
    this.pot.destroy();
    this.controls.destroy();
    this.navigation.destroy?.();
    this.buyIn.destroy();
    this.buyInView.destroy();
    this.soundControl.destroy();
    this.menu.destroy();
    this.sound.destroy();
    this.data.destroy();
    this.root.remove();
  }
}
