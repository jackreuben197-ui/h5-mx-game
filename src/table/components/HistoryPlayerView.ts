import type { HistoryHandModel, HistoryPlayerInfo } from '../../logic/HistoryReplayModel.js';
import { getCardTypeName, PLAYER_ACTION_ABBR, getActionNumByName, formatRaiseTimes } from '../../logic/HistoryReplayModel.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { HistoryCardsView } from './HistoryCardsView.js';
import { element } from '../dom.js';
export class HistoryPlayerView {
    readonly root = element('article', 'mx-history-player');
    constructor(player: HistoryPlayerInfo, model: HistoryHandModel) {
        this.root.classList.toggle('mx-record-own', player.isMine);
        const identity = element('div', 'mx-history-identity');
        const avatar = element('span', 'mx-record-avatar');
        SpriteAtlas.paint(avatar, 'avatar');
        if (player.headPic) {
            const img = element('img', ''); img.src = player.headPic; img.alt = ''; img.loading = 'lazy';
            img.onerror = () => img.remove(); avatar.append(img);
        }
        identity.append(avatar, element('span', 'mx-history-name', StringHelper.LengthNick(player.userName)));
        const hands = element('div', 'mx-history-overview-hands');
        // CC overview shows two backs for unknown hands and leaves all known cards bright.
        hands.append(new HistoryCardsView(player.handCards?.length ? player.handCards : [0, 0], undefined, 5).root);
        const caption = element('div', 'mx-history-caption');
        const type = element('span', 'mx-history-handtype', getCardTypeName(player.maxCardType) || i18nMgr.Get('UITexas_fold'));
        SpriteAtlas.paint(type, 'recordPosition');
        caption.append(type);
        const last = model.lastActions.get(player.seatID);
        if (last && getActionNumByName(last.actName) !== 10) {
            const action = getActionNumByName(last.actName);
            const keys = ['', 'UISB', 'UIBB', 'UITexas_call', 'adaptation10315', '', 'UITexas_Bet', 'adaptation10045', '', 'adaptation30074', 'UITexas_fold', 'adaptation10179'];
            const label = keys[action] ? i18nMgr.Get(keys[action]!) : action === 5 ? 'Straddle' : PLAYER_ACTION_ABBR[action] ?? '';
            caption.append(element('span', 'mx-history-last-action', action === 6 || action === 7 ? formatRaiseTimes(last.raiseTimes, label, i18nMgr.Get('adaptation10045')) : label));
        }
        hands.append(caption);
        const boards = element('div', 'mx-history-boards');
        boards.append(new HistoryCardsView(model.publicCards).root);
        if (model.haveSecondCard) boards.append(new HistoryCardsView(model.secondPublicCards).root);
        const profits = element('div', 'mx-history-overview-profits');
        const values = model.haveSecondCard ? player.winAnte2 : [player.winAnte];
        for (const value of values) profits.append(element('span', value > 0 ? 'mx-profit-positive' : value < 0 ? 'mx-profit-negative' : '', StringHelper.GetSignedLongString(value)));
        this.root.append(identity, hands, boards, profits);
    }
}
