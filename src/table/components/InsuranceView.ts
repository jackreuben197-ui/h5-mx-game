import type { InsurancePotLimit } from '@silenthill/agreement-web';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import type { SpecialOperations } from '../../core/RoomRecords.js';
import type { SeatingActions } from '../../core/Seating.js';
import { InsuranceData } from '../../data/InsuranceData.js';
import { InsuranceChoices } from '../../logic/InsuranceChoices.js';
import { handCardCount } from '../../logic/HandCardCount.js';
import { InsuranceRules, PoolType } from '../../logic/InsuranceRules.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { CardView } from './CardView.js';
import { DialogSurface } from './DialogSurface.js';
const normal = new URL('../../assets/raw/ui/insuranceOption.png', import.meta.url).href;
const selected = new URL('../../assets/raw/ui/insuranceOptionSelected.png', import.meta.url).href;
const displayOrder = [PoolType.THIRD, PoolType.HALF, PoolType.ALL, PoolType.EIGHTH, PoolType.FIFTH, PoolType.MIN_MONEY];
/** Shared insurance UI with per-pot drafts and one final purchase. */
export class InsuranceView {
  private surface = new DialogSurface('mx-insurance', 390);
  readonly root = this.surface.root;
  private bindings = new BindingScope(this);
  private header = element('header', 'mx-insurance-header');
  private outs = element('div', 'mx-insurance-outs');
  private details = element('div', 'mx-insurance-details');
  private options = element('div', 'mx-insurance-options');
  private delay = element('button', 'mx-insurance-delay');
  private delayRing = element('span', 'mx-insurance-delay-ring');
  private delayCost = element('span', 'mx-insurance-delay-cost');
  private delayTotal = 0;
  private lastDelay = 0;
  private cancel = element('button', 'mx-insurance-cancel');
  private buy = element('button', 'mx-insurance-buy');
  private rules = new InsuranceRules(0, 2, 0, []);
  private key = '';
  private index = 0;
  private pool = PoolType.THIRD;
  private choices = new InsuranceChoices(this.rules, []);
  private finished = false;
  private delayPending = false;
  private timer: ReturnType<typeof setInterval>;
  constructor(private records: SpecialOperations, private actions: SeatingActions, private failed: (error: unknown) => void) {
    const footer = element('footer', 'mx-insurance-footer');
    const diamond=element('span','mx-insurance-delay-diamond');SpriteAtlas.paint(diamond,'recordDiamond');
    this.delay.append(this.delayRing,diamond,this.delayCost);
    this.cancel.style.backgroundImage = `url("${normal}")`;
    SpriteAtlas.paint(this.buy, 'dialogConfirm');
    i18nLabel.bind(this.buy, () => i18nMgr.Get('adaptation10326', [], '购买'));
    this.cancel.onclick = () => this.advance(false);
    this.buy.onclick = () => this.advance(true);
    this.delay.onclick = () => {
      if (!this.actions.addTime || this.delayPending) return;
      this.delayPending = true; this.tick();
      void this.actions.addTime().catch(this.failed).finally(() => { this.delayPending = false; this.tick(); });
    };
    footer.append(this.delay, this.cancel, this.buy);
    this.surface.content.append(this.header, this.outs, this.details, this.options, footer);
    this.bindings.bind({ insurance: records.data.insurance });
    this.timer = setInterval(() => this.tick(), 200);
  }
  @bindEvent(InsuranceData.NOTICE, {dataSource: 'insurance', initIgnore: true})
  private notice(message: string): void { this.failed(message); }
  private get state() { return this.records.data.insurance.state; }
  private get pot(): InsurancePotLimit.AsObject | undefined { return this.state.operator?.insuranceLimitList[this.index]; }
  @bindEvent(InsuranceData.CHANGE, 'insurance')
  private render(): void {
    const { operator, round, status } = this.state;
    if (!operator) {
      this.surface.show(false); this.key = '';
      if (status) this.failed(CPErrorCode.ServerErrorDescription(status));
      return;
    }
    const key = `${this.records.data.snapshot?.handInfo?.handNum}:${round}:${operator.seatId}`;
    if (key !== this.key) {
      this.key = key; this.index = 0; this.finished = false;
      this.delayTotal = Math.max(operator.leftOpTime, this.records.data.record?.insuranceOpDuration ?? 30, 1);
      this.lastDelay=operator.delayTimes;
      this.rules = new InsuranceRules(round, 2, this.records.data.record?.insuranceForceBuyRatio ?? 0, this.records.data.record?.insuranceOddsList ?? []);
      this.choices = new InsuranceChoices(this.rules, operator.insuranceLimitList);
      this.selectInitial();
    }
    this.surface.show(!this.finished && !!this.pot);
    if (this.finished || !this.pot) return;
    this.renderPot(); this.tick();
  }
  private enabled(type: PoolType): boolean { return !!this.pot && this.choices.enabled(this.pot,type); }
  private selectInitial(): void { this.pool = this.pot ? this.choices.get(this.pot) : PoolType.NONE; }
  private label(key: string, className = '', suffix = ''): HTMLElement {
    const node = element('div', className);
    i18nLabel.bind(node, () => i18nMgr.Get(key) + suffix);
    return node;
  }
  private playerStatus(mine:boolean,count:number):HTMLElement {
    const node=element('div','');i18nLabel.bind(node,()=>mine?i18nMgr.Get('UIInsurance_InsureIn'):`${count}${i18nMgr.Get('UIInsurance_ge')}outs`);return node;
  }
  private cards(values: number[]): HTMLElement {
    const row = element('div', 'mx-insurance-cards');
    row.append(...values.map(card => new CardView(card).root)); return row;
  }
  private renderPot(): void {
    const pot = this.pot!, snapshot = this.records.data.snapshot!, operator = this.state.operator!;
    const title = this.label('UIInsurance_zhuchi', 'mx-insurance-title');
    i18nLabel.bind(title, () => `${i18nMgr.Get('UIInsurance_zhuchi')} ${i18nMgr.Get('adaptation10179')}`);
    const tabs = element('nav', 'mx-insurance-tabs');
    if (operator.insuranceLimitList.length > 1) operator.insuranceLimitList.forEach((_pot, index) => {
      const tab = element('button', '');
      i18nLabel.bind(tab, () => `${i18nMgr.Get('UIInsurance_zhuchi2')} ${index + 1}`);
      tab.classList.toggle('selected', index === this.index);
      tab.onclick = () => { this.index = index; this.selectInitial(); this.renderPot(); };
      tabs.append(tab);
    });
    const players = element('div', 'mx-insurance-players');
    const ids = [operator.seatId, ...pot.outsDetailList.map(detail => detail.seatId).filter(id => id !== operator.seatId)];
    for (const id of ids) {
      const player = snapshot.playersList.find(player => player.seatId === id);
      const block = element('div', 'mx-insurance-player'), name = element('div', ''); name.textContent = player?.name ?? '';
      const cards = operator.playerCardsList.find(player => player.seatId === id)?.cardsList ?? player?.cardsList ?? [];
      const count = pot.outsDetailList.find(detail => detail.seatId === id)?.outsCardsList.length ?? 0;
      block.append(name, this.cards(cards.slice(0, handCardCount(this.records.data.record?.gameType ?? 0))), this.playerStatus(id === operator.seatId,count));
      players.append(block);
    }
    this.header.replaceChildren(title, tabs, players, this.label('UIInsurance_publicCard'), this.cards(Array.from({ length: 5 }, (_, i) => snapshot.handInfo?.publicCardsList[i] ?? 0)));
    const { overOuts, equalOuts } = this.rules._splitOuts(pot);
    this.outs.replaceChildren();
    for (const [values, key] of [[overOuts, 'UIInsurance_fanchao'], [equalOuts, 'UIInsurance_pingfen']] as const) {
      if (!values.length) continue;
      this.rules._sortCards(values);
      const group = element('section', ''), label = element('div','mx-insurance-odds'), odds=element('span','');
      odds.textContent=`1:${this.rules._oddsFor(pot,values.length)}`;label.append(this.label(key),odds);
      group.append(label, this.cards(values)); this.outs.append(group);
    }
    const sorting = element('div', 'mx-insurance-sorting');
    for (const [graphics, key] of [[false, 'UISortByNumber'], [true, 'UISortByGraphics']] as const) {
      const button = element('button', '');
      button.setAttribute('aria-pressed', String(graphics === this.rules._sortByGraphics));
      i18nLabel.bind(button, () => i18nMgr.Get(key, [], graphics ? '按花色排序' : '按数字排序'));
      button.onclick = () => { this.rules._sortByGraphics = graphics; this.renderPot(); };
      sorting.append(button);
    }
    this.outs.append(sorting);
    this.details.replaceChildren(this.label('UITexasIns_LowWaterChooseTips', 'mx-insurance-choose'),
      this.label('UIInsurance_yitouru', '', StringHelper.GetLongString(pot.bet + pot.insuranced)),
      this.label('UIInsurance_peifue', '', this.rules._floorTrim(this.rules._compensateAmount(pot, this.pool))),
      this.label('UIInsurance_yitouru', '', this.rules._floorTrim(this.rules._realPayAmount(pot, this.pool))));
    this.options.replaceChildren(...displayOrder.map(type => {
      const button = element('button', 'mx-insurance-option'); button.disabled = !this.enabled(type);
      button.dataset.pool = String(type);
      const price = element('span', 'mx-insurance-premium'), title = element('span', 'mx-insurance-option-title');
      price.textContent = this.rules._floorTrim(this.rules._realPayAmount(pot, type));
      price.style.fontSize = `${Math.min(12, 78 / Math.max(1, price.textContent.length * 0.62))}px`;
      title.style.backgroundImage = `url("${type === this.pool ? selected : normal}")`;
      i18nLabel.bind(title, () => type === PoolType.ALL ? i18nMgr.Get('UIInsurance_all') : type === PoolType.MIN_MONEY ? i18nMgr.Get('UIInsurance_baoben') : (({[PoolType.THIRD]:'1/3',[PoolType.HALF]:'1/2',[PoolType.FIFTH]:'1/5',[PoolType.EIGHTH]:'1/8'} as Partial<Record<PoolType,string>>)[type] ?? ''));
      button.append(price, title); button.onclick = () => { this.choices.select(pot,type); this.pool = type; this.renderPot(); }; return button;
    }));
    i18nLabel.bind(this.cancel, () => {
      const amount = pot.insuranced > 0 ? this.rules._riverForcePayAmount(pot) : this.rules.round === this.rules.flopRound && this.rules.forceBuyRatio > 0 ? pot.min : 0;
      return i18nMgr.Get('UIInsurance_GiveUp') + (amount > 0 ? `\n${i18nMgr.Get('UITexasIns_InsAmount')}(${this.rules._floorTrim(amount / 100)})` : '');
    });
    this.buy.disabled = !this.enabled(this.pool);
    this.surface.fit();
  }
  private advance(buy: boolean): void {
    if (!this.pot || this.finished) return;
    this.send(buy);
  }
  private send(buy: boolean): void {
    if (this.finished) return;
    const purchases = this.choices.purchases(buy);
    this.finished = true; this.surface.show(false);
    void this.actions.buyInsurance?.(purchases, true).catch(this.failed);
  }
  private tick(): void {
    const operator = this.state.operator;
    if (!operator || this.finished) return;
    const left = Math.max(0, Math.ceil(operator.opDeadline - Date.now() / 1000));
    if (!left) { this.send(false); return; }
    const { global, diamonds } = this.records.config, room = this.records.data.record;
    this.delay.disabled = this.delayPending || operator.delayTimes >= global.resolveGameDelayTimes(room?.limitDelayTimes);
    const ext = diamonds.getDiamondConfigTypeExt(room?.originType ?? 0, room?.shareTable ?? 0, false, Math.min(5, operator.delayTimes + 1));
    const cost = diamonds.getPrice(2, ext, this.records.data.snapshot?.roomInfo?.smallBlind ?? 0, global.isChannelDiamondFreeMode);
    if(operator.delayTimes!==this.lastDelay){this.delayTotal+=this.lastDelay===0?30:20;this.lastDelay=operator.delayTimes;}
    this.delayCost.textContent=global.isChannelDiamondFreeMode&&!cost?'':String(cost);
    this.delayRing.style.maskImage=`conic-gradient(#000 ${Math.min(1,left/this.delayTotal)*360}deg,transparent 0deg)`;
    this.delay.dataset.remaining=String(left);
    this.delay.setAttribute('aria-label', i18nMgr.Get('UIInsurance_delay'));
  }
  destroy(): void { clearInterval(this.timer); this.bindings.destroy(); this.surface.destroy(); }
}
