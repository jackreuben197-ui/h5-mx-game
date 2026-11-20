import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { HistoryCardsView } from '../HistoryCardsView/HistoryCardsView.js';
import { element } from '../../dom.js';
export class HistorySectionHeaderView {
    readonly root = componentBox(element('header', 'mx-history-street-heading'),config);
    constructor(title: string, cards: number[], count: number, pot: number, formatAmount: (wire: number) => string) {
        const board = new HistoryCardsView(cards.filter(v => v > 0)).root;
        if (!cards.length) {
            board.classList.add('mx-history-empty-cards');
            board.append(element('span', ''), element('span', ''));
        }
        const people = element('span', 'mx-history-count', String(count));
        const peopleIcon = element('span', 'mx-record-icon');
        SpriteAtlas.paint(peopleIcon, config.paths.recordPeople);
        people.prepend(peopleIcon);
        const chips = element('span', 'mx-history-pot', formatAmount(pot));
        const chip = element('span', 'mx-record-icon');
        SpriteAtlas.paint(chip, config.paths.chip);
        chips.prepend(chip);
        this.root.append(element('h3', '', title), board, people, chips);
    }
}
