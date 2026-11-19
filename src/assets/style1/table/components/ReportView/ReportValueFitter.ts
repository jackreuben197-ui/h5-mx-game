import { element } from '../../dom.js';

/** Keep each numeric line inside its column without changing the column width. */
export class ReportValueFitter {
    private values = new Map<HTMLElement, HTMLElement>();
    private observer = new ResizeObserver(() => this.refresh());
    private frame = 0;

    wrap(value: string | HTMLElement): HTMLElement {
        const viewport = element('span', 'mx-report-value');
        const text = element('span', 'mx-report-value-text');
        text.append(value);
        viewport.append(text);
        this.values.set(viewport, text);
        this.observer.observe(viewport);
        this.observer.observe(text);
        return viewport;
    }

    private refresh(): void {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            for (const [viewport, text] of this.values) {
                const available = viewport.clientWidth;
                const natural = text.offsetWidth;
                if (!available || !natural) continue;
                const scale = Math.min(1, available / natural);
                text.style.transform = `scale(${scale})`;
            }
        });
    }

    clear(): void {
        this.observer.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.values.clear();
    }
}
