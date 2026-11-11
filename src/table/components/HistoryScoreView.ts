import type { HistoryHandModel, HistoryPlayerInfo } from '../../logic/HistoryReplayModel.js';
import { getCardTypeName, PLAYER_POSITION_ABBR } from '../../logic/HistoryReplayModel.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { HistoryCardsView } from './HistoryCardsView.js';
import { HistorySectionHeaderView } from './HistorySectionHeaderView.js';
import { element } from '../dom.js';
/** CC HistoryScoreSection: Score / Showdown / Showdown2 share the same row layout. */
export class HistoryScoreView {
    readonly root = element('section', 'mx-history-score');
    constructor(title: string, players: HistoryPlayerInfo[], model: HistoryHandModel, cardCount: number, mode: 'first' | 'dual' | 'second') {
        const second = mode === 'second', dual = mode === 'dual';
        this.root.append(new HistorySectionHeaderView(title, second ? model.secondPublicCards : model.publicCards, players.length, model.haveSecondCard ? model.showdownPot / 2 : model.showdownPot).root);
        for (const player of players) {
            const row = element('article', 'mx-history-score-row');
            row.classList.toggle('mx-record-own', player.isMine);
            const position = element('div', 'mx-history-score-position');
            const badge = element('span', 'mx-history-position', PLAYER_POSITION_ABBR[player.playerPosition] ?? '');
            SpriteAtlas.paint(badge, 'recordPosition');
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
            if (dual) profits.append(...[0, 1].map(i => element('span', '', StringHelper.GetDecimalN((player.winAnte2[i] ?? 0) / 100))));
            else profits.append(element('span', '', second ? (player.winAnte2.length > 1 ? StringHelper.GetLongString(player.winAnte2[1]!) : '') : StringHelper.GetLongString(player.winAnte)));
            if (player.insuranceGain) profits.append(element('small', '', StringHelper.GetSignedLongString(player.insuranceGain)));
            row.append(position, hands, boards, profits);
            this.root.append(row);
        }
        if (model.insurancePool) this.root.append(element('p', 'mx-history-insurance', `${i18nMgr.Get('UITexasHistory_insurance', [], '保险')} ${StringHelper.GetSignedLongString(model.insurancePool)}`));
    }
}
