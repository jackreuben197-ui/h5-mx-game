import { SpriteAtlas } from '../SpriteAtlas.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { HistoryCardsView } from './HistoryCardsView.js';
import { element } from '../dom.js';
export class HistorySectionHeaderView {
    readonly root = element('header', 'mx-history-street-heading');
    constructor(title: string, cards: number[], count: number, pot: number) {
        const board = new HistoryCardsView(cards.filter(v => v > 0)).root;
        if (!cards.length) {
            board.classList.add('mx-history-empty-cards');
            board.append(element('span', ''), element('span', ''));
        }
        const people = element('span', 'mx-history-count', String(count));
        const peopleIcon = element('span', 'mx-record-icon');
        SpriteAtlas.paint(peopleIcon, 'recordPeople');
        people.prepend(peopleIcon);
        const chips = element('span', 'mx-history-pot', StringHelper.GetLongString(pot));
        const chip = element('span', 'mx-record-icon');
        SpriteAtlas.paint(chip, 'chip');
        chips.prepend(chip);
        this.root.append(element('h3', '', title), board, people, chips);
    }
}
