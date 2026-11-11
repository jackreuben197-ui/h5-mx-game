import type { ReplayHandData } from '../../data/ReplayHandData.js';
import { HistoryController } from '../../logic/HistoryController.js';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { RecordDialogView } from './RecordDialogView.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { HistoryScoreView } from './HistoryScoreView.js';
import { HistoryPlayerView } from './HistoryPlayerView.js';
import { HistoryStreetView } from './HistoryStreetView.js';
import { element } from '../dom.js';
const t = (key: string, fallback: string) => i18nMgr.Get(key, [], fallback);
export class HistoryView {
    readonly dialog: RecordDialogView;
    readonly root: HTMLElement;
    private bindings = new BindingScope(this);
    private room = element('div', 'mx-record-room');
    private previous = element('button', 'mx-history-page-button');
    private next = element('button', 'mx-history-page-button');
    private page = element('span', '');
    private slider = element('input', '');
    private details = element('button', 'mx-history-details');
    private detailsLabel = element('span', '');
    private detailsArrow = element('span', 'mx-record-icon');
    private balanceLabel = element('span', 'mx-history-balance-label');
    private balanceValue = element('span', '');
    private renderedHand?: number;
    private renderedData?: ReplayHandData;
    private renderedDetails?: boolean;
    private renderedLanguage?: string;
    private collect = element('button', '');
    private peek = element('button', '');
    private reveal = element('button', '');
    private balance = element('span', 'mx-history-balance');
    private retry = element('button', '');
    constructor(readonly controller: HistoryController) {
        this.dialog = new RecordDialogView(() => t('UITexas_History_paipu', '牌谱'), () => controller.close(), 'right');
        this.root = this.dialog.root;
        this.root.classList.add('mx-history-overlay');
        this.dialog.header.append(this.room);
        SpriteAtlas.paint(this.previous, 'recordPrev');
        SpriteAtlas.paint(this.next, 'recordNext');
        SpriteAtlas.paint(this.detailsArrow, 'recordDetails');
        this.details.append(this.detailsLabel, this.detailsArrow);
        const diamond = element('span', 'mx-record-icon');
        SpriteAtlas.paint(diamond, 'recordDiamond');
        const balanceLine = element('span', 'mx-history-balance-value');
        balanceLine.append(diamond, this.balanceValue);
        this.balance.append(this.balanceLabel, balanceLine);
        const pages = element('div', 'mx-record-pages');
        const thumb = element('span', '');
        SpriteAtlas.paint(thumb, 'recordSlider');
        this.slider.style.setProperty('--thumb-image', thumb.style.backgroundImage);
        this.slider.style.setProperty('--thumb-size', thumb.style.backgroundSize);
        this.slider.style.setProperty('--thumb-position', thumb.style.backgroundPosition);
        this.slider.type = 'range';
        this.slider.min = '1';
        this.slider.step = '1';
        this.slider.oninput = () => { this.page.textContent = `${this.slider.value}/${controller.state.total}`; this.updateSlider(); };
        this.slider.onchange = () => void controller.go(Number(this.slider.value));
        this.previous.onclick = () => void controller.go(controller.state.page - 1);
        this.next.onclick = () => void controller.go(controller.state.page + 1);
        this.details.onclick = () => controller.details();
        this.collect.onclick = () => void controller.collect();
        this.peek.onclick = () => void controller.watch('peek');
        this.reveal.onclick = () => void controller.watch('reveal');
        this.retry.onclick = () => void controller.go(controller.state.page);
        for (const button of [this.previous, this.next, this.details, this.collect, this.peek, this.reveal, this.retry])
            button.type = 'button';
        const track = element('div', 'mx-history-page-track');
        track.append(this.slider, this.page);
        pages.append(this.previous, track, this.next);
        const actions = element('div', 'mx-record-tabs');
        actions.append(this.collect, this.retry);
        const watch = element('div', 'mx-record-tabs mx-history-watch');
        watch.append(this.peek, this.reveal);
        const controls = element('div', 'mx-history-footer-actions');
        controls.append(watch, actions);
        this.balance.hidden = true;
        this.dialog.footer.append(this.balance, controls, pages);
        this.bindings.bind({ panel: controller });
        i18nMgr.register(this);
    }
    refreshLanguage(): void { this.render(); }
    @bindEvent(HistoryController.CHANGE, 'panel')
    private render(): void {
        const { state, records } = this.controller;
        this.dialog.show(state.open);
        if (!state.open) {
            this.renderedData = undefined;
            this.renderedHand = undefined;
            this.dialog.body.replaceChildren();
            this.room.replaceChildren();
            this.balance.hidden = true;
            return;
        }
        const { data, model } = state;
        const busy = state.loading || !!state.buying || state.collecting;
        this.previous.disabled = busy || state.page <= 1;
        this.next.disabled = busy || state.page >= state.total;
        this.slider.disabled = busy || state.total < 2;
        this.slider.max = String(Math.max(1, state.total));
        this.slider.value = String(state.page);
        this.slider.setAttribute('aria-label', t('UITexasReport_hand', '手数'));
        this.previous.setAttribute('aria-label', t('MX_PreviousHand', '上一手'));
        this.next.setAttribute('aria-label', t('MX_NextHand', '下一手'));
        this.page.textContent = `${state.page}/${state.total}`;
        this.updateSlider();
        this.detailsLabel.textContent = t('MX_HistoryDetails', '查看详情');
        this.detailsArrow.style.transform = state.details ? 'scaleY(-1)' : '';
        this.details.setAttribute('aria-expanded', String(state.details));
        this.details.setAttribute('aria-pressed', String(state.details));
        this.details.disabled = !model;
        this.collect.textContent = state.collecting ? '…' : t(state.collected ? 'MX_Collected' : 'MX_Collect', state.collected ? '已收藏' : '收藏');
        const star = element('span', 'mx-record-icon');
        SpriteAtlas.mask(star, 'recordFavorite', state.collected ? '#ffd957' : '#fff');
        this.collect.prepend(star);
        this.collect.setAttribute('aria-pressed', String(state.collected));
        this.collect.disabled = !model?.hasMe || !state.collectReady || busy || !!state.quoteLoading;
        this.collect.hidden = !model?.hasMe;
        const quote = state.quote;
        const price = (value: number | undefined) => value === undefined ? '…' : quote?.privateUc ? (value > 0 ? `UC ${value}` : '') : `◆ ${value}`;
        if (quote?.privateUc && !state.collected && quote.collectPrice)
            this.collect.append(` · UC ${quote.collectPrice}`);
        this.peek.textContent = `${t('UITexas_payLookHandCard', '偷偷看')} ${price(quote?.peekPrice)}`;
        this.reveal.textContent = `${t('UIViewAllPublicCards', '发发看')} ${quote?.freeCount ? t('UIMIneVIPFreeTip', '免费') + ' ' + quote.freeCount : price(quote?.revealPrice)}`;
        this.peek.hidden = !quote?.canPeek;
        this.reveal.hidden = !quote?.canReveal;
        this.peek.disabled = busy || !!state.quoteLoading;
        this.reveal.disabled = busy || !!state.quoteLoading;
        // Wallet balance is independent of the hand. Keep the last confirmed value while pricing loads.
        if (quote) {
            this.balance.hidden = quote.privateUc || quote.balance === undefined;
            this.balanceValue.textContent = quote.balance !== undefined ? quote.balance.toLocaleString('en-US') : '';
        }
        this.balanceLabel.textContent = t('UITexasRecord_DiamondTotalCount', '钻石总数');
        for (const button of [this.peek, this.reveal]) {
            if (!quote?.privateUc) {
                const [label, cost] = (button.textContent ?? '').split('◆');
                if (cost !== undefined) {
                    const icon = element('span', 'mx-record-icon'); SpriteAtlas.paint(icon, 'recordDiamond');
                    button.replaceChildren(document.createTextNode(label!), icon, document.createTextNode(cost));
                }
            }
        }
        this.retry.textContent = t('MX_Retry', '重试');
        this.retry.hidden = !state.error;
        this.dialog.status.textContent = state.error || (state.loading ? t('MX_Loading', '加载中…') : '');
        this.dialog.body.setAttribute('aria-busy', String(state.loading));
        this.root.dataset.pending = String(!data && (state.loading || !!state.error));
        // Quotes, collection state and loading flags must not rebuild the cards or reset scrolling.
        if (!data || !model) {
            if (!this.renderedData) {
                this.room.textContent = String(records.target.roomID);
                if (!state.loading && !state.error) this.dialog.body.replaceChildren(element('p', 'mx-record-empty', t('UICareerRecordNon', '暂无数据')));
            }
            return;
        }
        const language = i18nMgr.getCurrentLocale();
        if (this.renderedData === data && this.renderedDetails === state.details && this.renderedLanguage === language) return;
        this.room.replaceChildren();
        {
            const name = element('span', 'mx-history-room-name', data.s.name);
            const roomIcon = element('span', 'mx-record-icon'); SpriteAtlas.paint(roomIcon, 'recordRoom'); name.prepend(roomIcon);
            const count = element('span', 'mx-history-room-count', `${model.playerCount}/${data.s.table.seatcount}`);
            const people = element('span', 'mx-record-icon'); SpriteAtlas.paint(people, 'recordPeople'); count.prepend(people);
            this.room.append(element('span', '', `${data.s.rid}-${data.s.hand}`), element('span', '', `${StringHelper.GetLongString(data.s.table.sb.bet)}/${StringHelper.GetLongString(data.s.table.bb.bet)}`), name, count);
        }
        const content = this.dialog.body;
        const scroll = this.renderedHand === state.page ? content.scrollTop : 0;
        this.renderedHand = state.page;
        this.renderedData = data;
        this.renderedDetails = state.details;
        this.renderedLanguage = language;
        content.replaceChildren();
        const cardCount = Math.max(2, data.d?.length ?? 0, ...model.players.map(player => player.handCards?.length ?? 0));
        const players = element('div', 'mx-history-players');
        players.append(...model.players.map(player => new HistoryPlayerView(player, model).root));
        content.append(players, this.details);
        if (state.details) {
            if (model.hasResult) content.append(new HistoryScoreView(t('UITexas_History_paipu', '牌谱'), model.players, model, cardCount, model.haveSecondCard ? 'dual' : 'first').root);
            content.append(element('h3', 'mx-history-process-title', t('UITexas_History_xxgc', '详细过程')));
            for (const [title, street, count] of [['Preflop', model.preflop, 0], ['Flop', model.flop, 3], ['Turn', model.turn, 4], ['River', model.river, 5]] as const) {
                if (street.rows.length)
                    content.append(new HistoryStreetView(title, street, model.publicCards.slice(0, count)).root);
            }
            if (model.hasResult) {
                content.append(new HistoryScoreView('Showdown', model.winners, model, cardCount, 'first').root);
                if (model.haveSecondCard) content.append(new HistoryScoreView('Showdown2', model.winners, model, cardCount, 'second').root);
            }
        }
        content.scrollTop = scroll;
    }
    private updateSlider(): void { this.slider.style.setProperty('--progress', `${Number(this.slider.max) > 1 ? (Number(this.slider.value) - 1) / (Number(this.slider.max) - 1) * 100 : 0}%`); }
    open(): void { this.controller.open(); }
    onFrameResize(width: number, height: number): void { this.dialog.onFrameResize(width, height); }
    destroy(): void { this.bindings.destroy(); this.controller.destroy(); this.dialog.destroy(); }
}
