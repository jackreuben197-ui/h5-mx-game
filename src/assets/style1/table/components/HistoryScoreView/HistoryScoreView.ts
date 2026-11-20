import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import type { HistoryHandModel, HistoryPlayerInfo } from '../../../../../logic/HistoryReplayModel.js';
import { getCardTypeName, PLAYER_POSITION_ABBR } from '../../../../../logic/HistoryReplayModel.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { HistoryCardsView } from '../HistoryCardsView/HistoryCardsView.js';
import { HistorySectionHeaderView } from '../HistorySectionHeaderView/HistorySectionHeaderView.js';
import { element, profitAmount } from '../../dom.js';
/** CC HistoryScoreSection: Score / Showdown / Showdown2 share the same row layout. */
export class HistoryScoreView {
    readonly root = componentBox(element('section', 'mx-history-score'),config);
    constructor(title: string, players: HistoryPlayerInfo[], model: HistoryHandModel, cardCount: number, mode: 'first' | 'dual' | 'second', formatAmount: (wire: number) => string) {
        const second = mode === 'second', dual = mode === 'dual';
        this.root.append(new HistorySectionHeaderView(title, second ? model.secondPublicCards : model.publicCards, players.length, model.haveSecondCard ? model.showdownPot / 2 : model.showdownPot, formatAmount).root);
        for (const player of players) {
            const row = element('article', 'mx-history-score-row');
            row.classList.toggle('mx-record-own', player.isMine);
            const position = element('div', 'mx-history-score-position');
            const badge = element('span', 'mx-history-position', PLAYER_POSITION_ABBR[player.playerPosition] ?? '');
            SpriteAtlas.paint(badge, config.paths.recordPosition);
            position.append(badge, element('span', 'mx-history-type', getCardTypeName(second ? player.maxCardType2 : player.maxCardType)));
            const hands = element('div', 'mx-history-score-hands');
            const indexes = second ? player.maxCardIndex2 : dual ? [...player.maxCardIndex, ...player.maxCardIndex2] : player.maxCardIndex;
            hands.append(element('span', 'mx-history-name', StringHelper.LengthNick(player.userName)), new HistoryCardsView(player.handCards.length ? player.handCards : Array<number>(cardCount).fill(0), indexes, 5).root);
            const boards = element('div', 'mx-history-boards');
            boards.append(new HistoryCardsView(second ? model.secondPublicCards : model.publicCards, second ? player.maxCardIndex2 : player.maxCardIndex).root);
            if (dual) boards.append(new HistoryCardsView(model.secondPublicCards, player.maxCardIndex2).root);
            // In CC dual-board mode all unselected cards stay dark even if one board has no index list.
            if (dual && indexes.length) {
                [player.maxCardIndex, player.maxCardIndex2].forEach((list, i) => {
                    if (!list.length) boards.children[i]?.querySelectorAll('.mx-card').forEach(card => card.classList.add('mx-card-dimmed'));
                });
            }
            const profits = element('div', 'mx-history-score-profits');
            const amounts = dual ? [player.winAnte2[0] ?? 0, player.winAnte2[1] ?? 0] : [second ? player.winAnte2[1] : player.winAnte];
            for (const amount of amounts) {
                const text = amount === undefined ? '' : formatAmount(amount);
                profits.append(profitAmount('span', amount ?? 0, text));
            }
            if (player.insuranceGain) profits.append(profitAmount('small', player.insuranceGain));
            row.append(position, hands, boards, profits);
            this.root.append(row);
        }
        if (model.insurancePool) {
            const insurance = element('p', 'mx-history-insurance');
            insurance.append(`${i18nMgr.Get('UITexasHistory_insurance', [], '保险')} `, profitAmount('span', model.insurancePool));
            this.root.append(insurance);
        }
    }
}
