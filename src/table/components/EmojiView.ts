import { EmojiController } from '../../logic/EmojiController.js';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import type { EmojiSpineRenderer } from '../../effects/spine/EmojiSpineRenderer.js';
import { EmojiItemView } from './EmojiItemView.js';
import { element } from '../dom.js';
export class EmojiView {
    readonly root = element('div', 'mx-emoji-overlay mx-dialog-overlay');
    private panel = element('section', 'mx-emoji-panel mx-dialog-glass');
    private grid = element('div', 'mx-emoji-grid');
    private categories = element('div', 'mx-emoji-categories');
    private status = element('p', 'mx-emoji-status');
    private retry = element('button', 'mx-emoji-retry');
    private layer = element('div', 'mx-emoji-preview-layer');
    private bindings = new BindingScope(this);
    private items: EmojiItemView[] = [];
    private renderer?: EmojiSpineRenderer;
    private pending?: Promise<EmojiSpineRenderer>;
    private animation?: Animation;
    private rendered = '';
    private dead = false;
    private previousFocus?: HTMLElement;
    constructor(readonly controller: EmojiController) {
        this.root.hidden = true; this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-modal', 'true');
        this.status.setAttribute('role', 'status'); this.categories.setAttribute('role', 'tablist');
        this.retry.type = 'button'; this.retry.onclick = () => void controller.refresh();
        this.panel.append(this.grid, this.categories, this.layer, this.status, this.retry); this.root.append(this.panel);
        this.root.onclick = event => { if (event.target === this.root) controller.close(); };
        this.root.onkeydown = event => {
            if (event.key === 'Escape') { event.stopPropagation(); controller.close(); }
            if (event.key !== 'Tab') return;
            const buttons = Array.from(this.panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(b => !b.hidden);
            const first = buttons[0], last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({preventScroll: true}); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({preventScroll: true}); }
        };
        this.bindings.bind({panel: controller}); i18nMgr.register(this);
    }
    private engine(): Promise<EmojiSpineRenderer> {
        return this.pending ??= import('../../effects/spine/EmojiSpineRenderer.js').then(({EmojiSpineRenderer}) => {
            if (this.dead) throw new DOMException('Disposed', 'AbortError');
            return this.renderer = new EmojiSpineRenderer(this.layer, () => { this.status.textContent = i18nMgr.Get('MX_EmojiLoadFailed', [], '表情加载失败，请重新打开'); });
        }).catch(error => { this.pending = undefined; throw error; });
    }
    refreshLanguage(): void { this.render(); }
    @bindEvent(EmojiController.CHANGE, 'panel')
    private render(): void {
        if (this.dead) return;
        const {state, service} = this.controller;
        this.panel.setAttribute('aria-label', i18nMgr.Get('UITexas_mainmenu_emoji', [], '表情'));
        this.retry.textContent = i18nMgr.Get('MX_Retry', [], '重试'); this.retry.hidden = !state.error; this.retry.disabled = state.loading;
        if (!state.open) {
            const wasOpen = !this.root.hidden; this.root.hidden = true; this.animation?.cancel();
            this.items.forEach(item => item.destroy()); this.items = []; this.renderer?.clear(); this.rendered = '';
            if (wasOpen) this.previousFocus?.focus({preventScroll: true}); return;
        }
        if (this.root.hidden) {
            this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
            this.root.hidden = false;
            this.animation = this.panel.animate([{transform: 'translateY(100%)', opacity: .5}, {transform: 'translateY(0)', opacity: 1}], {duration: 260, easing: 'cubic-bezier(.25,.46,.45,.94)'});
        }
        const categories = this.controller.categories;
        this.status.textContent = state.error || (state.loading && !categories.length ? i18nMgr.Get('MX_Loading', [], '加载中…') : !categories.length ? i18nMgr.Get('MX_EmojiEmpty', [], '暂无可用表情') : '');
        this.items.forEach(item => item.setBusy(state.sending));
        const key = JSON.stringify([categories, state.category, service.config.isChannelDiamondFreeMode, i18nMgr.getCurrentLocale()]);
        if (key === this.rendered) return; this.rendered = key;
        this.categories.replaceChildren(...categories.map((category, index) => {
            const button = element('button', 'mx-emoji-category'); button.type = 'button'; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(category.id === state.category));
            button.setAttribute('aria-label', category.name || `${i18nMgr.Get('UITexas_mainmenu_emoji', [], '表情')} ${index + 1}`);
            const icon = element('img', ''); icon.src = category.icon; icon.alt = ''; icon.onerror = () => { icon.hidden = true; button.textContent = category.name || String(index + 1); }; button.append(icon);
            button.onclick = () => this.controller.select(category.id); return button;
        }));
        this.items.forEach(item => item.destroy()); this.items = []; this.grid.replaceChildren(); this.grid.scrollTop = 0;
        const category = categories.find(c => c.id === state.category);
        if (category?.items.length) {
            const renderer = this.engine();
            this.items = category.items.map(item => new EmojiItemView(item, service.config.isChannelDiamondFreeMode, renderer, this.grid, () => void this.controller.send(item.data)));
            this.items.forEach(item => { this.grid.append(item.root); item.setBusy(state.sending); });
        }
        if (!this.panel.contains(document.activeElement)) this.categories.querySelector<HTMLButtonElement>('[aria-selected=true]')?.focus({preventScroll: true});
    }
    open(): boolean { return this.controller.open(); }
    onFrameResize(width: number, height: number): void {
        const unit = Math.min(width / 1242, height / 2290, 600 / 964);
        this.root.style.setProperty('--emoji-unit', `${unit}px`);
        this.root.style.setProperty('--emoji-bottom', `${Math.min(height * .085, 230 * unit)}px`);
    }
    destroy(): void { this.controller.destroy(); this.dead = true; this.bindings.destroy(); this.items.forEach(item => item.destroy()); this.renderer?.destroy(); this.animation?.cancel(); this.root.remove(); }
}
