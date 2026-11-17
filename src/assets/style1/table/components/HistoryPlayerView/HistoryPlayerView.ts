import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import type { HistoryHandModel, HistoryPlayerInfo } from '../../../../../logic/HistoryReplayModel.js';
import { getCardTypeName, PLAYER_ACTION_ABBR, formatRaiseTimes } from '../../../../../logic/HistoryReplayModel.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { HistoryCardsView } from '../HistoryCardsView/HistoryCardsView.js';
import { element, profitClass } from '../../dom.js';
export class HistoryPlayerView {
    readonly root = componentBox(element('article', 'mx-history-player'),config);
    constructor(player: HistoryPlayerInfo, model: HistoryHandModel) {
        this.root.classList.toggle('mx-record-own', player.isMine);
        const identity = element('div', 'mx-history-identity');
        const avatar = element('span', 'mx-record-avatar');
        SpriteAtlas.paint(avatar, config.paths.avatar);
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
        SpriteAtlas.paint(type, config.paths.recordPosition);
        caption.append(type);
        const preflop = model.preflop.rows.filter(row => row.playerId === player.playerId).at(-1);
        // Each street has its own final action, rather than repeating the hand's last action.
        if(preflop)caption.append(this.action(preflop));
        hands.append(caption);
        const boards = element('div', 'mx-history-boards');
        boards.append(new HistoryCardsView(model.publicCards).root);
        if (model.haveSecondCard) boards.append(new HistoryCardsView(model.secondPublicCards).root);
        const streetActions=element('div','mx-history-overview-actions');
        for(const street of [model.flop,model.turn,model.river]){
            const cell=element('span','');
            const action=street.rows.filter(row=>row.playerId===player.playerId).at(-1);
            if(action)cell.append(this.action(action));
            streetActions.append(cell);
        }
        boards.append(streetActions);
        const profits = element('div', 'mx-history-overview-profits');
        const values = model.haveSecondCard ? player.winAnte2 : [player.winAnte];
        for (const value of values) profits.append(element('span', profitClass(value), StringHelper.GetSignedLongString(value)));
        this.root.append(identity, hands, boards, profits);
    }
    private action(row: import('../../../../../logic/HistoryReplayModel.js').HistoryActionInfo): HTMLElement {
        const node=element('span','mx-history-last-action');
        const keys = ['', 'UISB', 'UIBB', 'UITexas_call', 'adaptation10315', '', 'UITexas_Bet', 'adaptation10045', '', 'adaptation30074', 'UITexas_fold', 'adaptation10179'];
        const label=keys[row.action]?i18nMgr.Get(keys[row.action]!):PLAYER_ACTION_ABBR[row.action]??'';
        const action=row.action===6||row.action===7?formatRaiseTimes(row.raiseTimes,label,i18nMgr.Get('adaptation10045')):label;
        node.append(element('span','',action),element('span','',StringHelper.GetLongString(row.actionChip)));
        return node;
    }
}
