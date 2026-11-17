import config from './config.json';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { element } from '../../dom.js';

export class RecordPaginationView {
    readonly root = element('div', 'mx-record-pages');
    private readonly previous = element('button', 'mx-record-page-button');
    private readonly slider = element('input', 'mx-record-page-slider');
    private readonly next = element('button', 'mx-record-page-button');
    private readonly count = element('span', 'mx-record-page-count');
    private current = 0;
    private total = -1;

    constructor(select: (page: number) => void) {
        this.previous.type = this.next.type = 'button';
        SpriteAtlas.paint(this.previous, config.paths.previous);
        SpriteAtlas.paint(this.next, config.paths.next);

        const thumb = element('span', '');
        SpriteAtlas.paint(thumb, config.paths.thumb);
        this.slider.style.setProperty('--thumb-image', thumb.style.backgroundImage);
        this.slider.style.setProperty('--thumb-size', thumb.style.backgroundSize);
        this.slider.style.setProperty('--thumb-position', thumb.style.backgroundPosition);
        this.slider.type = 'range';
        this.slider.min = '1';
        this.slider.step = '1';
        this.slider.oninput = () => this.paintPosition();
        this.slider.onchange = () => {
            const page = this.slider.valueAsNumber;
            if (page !== this.current) select(page);
        };
        this.previous.onclick = () => select(this.current - 1);
        this.next.onclick = () => select(this.current + 1);
        this.root.append(this.previous, this.slider, this.next, this.count);
    }

    labels(slider: string, previous: string, next: string): void {
        this.slider.setAttribute('aria-label', slider);
        this.previous.setAttribute('aria-label', previous);
        this.next.setAttribute('aria-label', next);
    }

    update(page: number, total: number, busy: boolean): void {
        // Unrelated record updates can arrive while the user is dragging.
        if (this.total !== total) this.slider.max = String(Math.max(1, total));
        if (this.current !== page || this.total !== total || busy) this.slider.value = String(page);
        this.current = page;
        this.total = total;
        this.previous.disabled = busy || page <= 1;
        this.next.disabled = busy || page >= total;
        this.slider.disabled = busy || total < 2;
        this.paintPosition();
    }

    private paintPosition(): void {
        const page = this.total > 0 ? this.slider.valueAsNumber : 0;
        const progress = this.total > 1 ? (page - 1) / (this.total - 1) * 100 : 0;
        this.count.textContent = `${page}/${this.total}`;
        this.slider.style.setProperty('--progress', `${progress}%`);
    }
}
