import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { CardView } from '../CardView/CardView.js';
import { element } from '../../dom.js';
/** CC maxcard_idx: public cards 0..4, hole cards start at 5. */
export class HistoryCardsView {
    readonly root = componentBox(element('div', 'mx-history-cards'),config);
    constructor(values: number[], indexes?: number[], offset = 0) {
        this.root.style.setProperty('--card-count', String(values.length));
        this.root.classList.toggle('mx-history-public-cards',offset===0);
        values.forEach((value, index) => {
            if (offset === 0 && !value) return;
            const card = new CardView(value).root;
            card.classList.toggle('mx-card-dimmed', !!indexes?.length && !indexes.includes(offset + index));
            this.root.append(card);
        });
    }
}
