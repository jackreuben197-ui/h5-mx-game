import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import type { HistoryStreetModel } from '../../../../../logic/HistoryReplayModel.js';
import { PLAYER_POSITION_ABBR, PLAYER_ACTION_ABBR, formatRaiseTimes } from '../../../../../logic/HistoryReplayModel.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { HistorySectionHeaderView } from '../HistorySectionHeaderView/HistorySectionHeaderView.js';
import { element } from '../../dom.js';
export class HistoryStreetView {
    readonly root = componentBox(element('section', 'mx-history-street'),config);
    constructor(title: string, street: HistoryStreetModel, cards: number[]) {
        this.root.append(new HistorySectionHeaderView(title, cards, street.rows.length, street.pot).root);
        for (const row of street.rows) {
            const item = element('div', 'mx-history-action-row');
            item.classList.toggle('mx-record-own', row.isMine);
            const name = element('span', 'mx-history-name', StringHelper.LengthNick(row.nickName));
            name.title = row.nickName;
            const action = element('span', 'mx-history-action', row.action === 6 || row.action === 7 ? formatRaiseTimes(row.raiseTimes, 'B', 'R', 'B') : PLAYER_ACTION_ABBR[row.action] ?? '');
            action.dataset.action = String(row.action);
            const position = element('span', 'mx-history-position', PLAYER_POSITION_ABBR[row.playerPosition] ?? '');
            SpriteAtlas.paint(position, config.paths.recordPosition);
            const bet = element('span', 'mx-history-bet');
            bet.append(action, element('span', '', StringHelper.GetLongString(row.actionChip)));
            item.append(position, name, bet, element('span', 'mx-history-stack', `${title === 'Preflop' ? '' : 'P:'}${StringHelper.GetDecimalN(row.leftChips / 100)}`));
            this.root.append(item);
        }
    }
}
