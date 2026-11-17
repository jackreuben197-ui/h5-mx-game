import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { uniqueId } from '../../../../../core/uniqueId.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { element } from '../../dom.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
/** Shared glass frame; only the central body scrolls. */
export class RecordDialogView {
    readonly root = componentBox(element('div', 'mx-record-overlay mx-dialog-overlay'),config);
    readonly panel = element('section', 'mx-record-panel mx-dialog-glass');
    readonly header = element('header', 'mx-record-header');
    readonly body = element('div', 'mx-record-body');
    readonly footer = element('footer', 'mx-record-footer');
    readonly status = element('p', 'mx-record-status');
    private title = element('h2', '');
    private closeButton = element('button', 'mx-record-close');
    private previousFocus?: HTMLElement;
    private openingAnimation?: Animation;
    constructor(title: () => string, close: () => void, private dock?: 'left' | 'right', private designTop = 0) {
        this.root.hidden = true;
        if (dock) this.root.dataset.dock = dock;
        SpriteAtlas.paint(this.closeButton, config.paths.recordClose);
        const id = `mx-record-${uniqueId()}`;
        this.title.id = id;
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('aria-labelledby', id);
        const refresh = { refreshLanguage: () => { this.title.textContent = title(); this.closeButton.setAttribute('aria-label', i18nMgr.Get('MX_Close', [], '关闭')); } };
        this.refreshTitle = () => refresh.refreshLanguage();
        i18nMgr.register(refresh);
        this.titleBinding = refresh;
        refresh.refreshLanguage();
        this.closeButton.type = 'button';
        this.closeButton.onclick = close;
        this.status.setAttribute('role', 'status');
        this.header.append(this.title, this.closeButton);
        this.panel.append(this.header, this.status, this.body, this.footer);
        this.root.append(this.panel);
        this.root.onclick = event => { if (event.target === this.root)
            close(); };
        this.root.onkeydown = event => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                close();
                return;
            }
            if (event.key !== 'Tab')
                return;
            const focusable = Array.from(this.panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')).filter(node => node.getClientRects().length);
            const first = focusable[0], last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
    }
    private titleBinding: {
        refreshLanguage: () => void;
    };
    readonly refreshTitle: () => void;
    show(open: boolean): void {
        if (open === !this.root.hidden)
            return;
        if (open) {
            this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
            this.root.hidden = false;
            this.root.scrollLeft = 0;
            if (this.dock) {
                this.openingAnimation?.cancel();
                this.openingAnimation = this.panel.animate([
                    { transform: `translateX(${this.dock === 'right' ? '100%' : '-100%'})` },
                    { transform: 'translateX(0)' },
                ], { duration: config.layout.slideMs, easing: 'cubic-bezier(.25,.46,.45,.94)' });
            }
            // Focusing an offscreen close button must not scroll the sliding panel into view.
            this.closeButton.focus({ preventScroll: true });
        }
        else {
            this.openingAnimation?.cancel();
            this.openingAnimation = undefined;
            this.root.hidden = true;
            this.previousFocus?.focus({ preventScroll: true });
        }
    }
    onFrameResize(width: number, height: number): void {
        // CC UIViewUtil.alignTableDialog: visibleHeight * designTop / config.layout.designHeight.
        // CSS max() combines it with the live H5/device top safe area.
        this.root.style.setProperty('--record-design-top', `${height * this.designTop / config.layout.designHeight}px`);
        const panelWidth = Math.min(width * config.layout.widthRatio, config.layout.maxWidth);
        const unit = this.dock ? panelWidth / config.layout.designWidth : Math.min(width / config.layout.screenWidth, height / config.layout.panelHeight, config.layout.maxWidth / config.layout.designWidth);
        this.root.style.setProperty('--record-unit', `${unit}px`);
        this.root.style.setProperty('--record-width', `${(this.dock ? panelWidth : Math.min(width - config.layout.widthGap, config.layout.designWidth * unit))}px`);
        this.root.style.setProperty('--record-height', `${(this.dock ? height : Math.min(height - config.layout.heightGap, config.layout.panelHeight * unit))}px`);
        this.root.dataset.short = String(height < config.layout.shortHeight * unit);
    }
    destroy(): void { this.openingAnimation?.cancel(); this.root.onclick = null; this.root.onkeydown = null; this.closeButton.onclick = null; this.root.remove(); }
}
