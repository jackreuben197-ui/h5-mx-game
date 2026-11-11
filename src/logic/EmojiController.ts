import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import { BindingScope } from '../binding/BindingScope.js';
import { bindEvent } from '../binding/bindEvent.js';
import { TexasGameRoomDataEmoji } from '../data/TexasGameRoomDataEmoji.js';
import { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { RoomEmojis } from '../core/RoomEmojis.js';
import type { UserPropData } from '../data/UserPropData.js';
import { EmojiPropRules } from './EmojiPropRules.js';
export class EmojiController extends EventSource {
    static readonly CHANGE = 'EMOJI_PANEL_CHANGE';
    @observable(EmojiController.CHANGE)
    state = {open: false, loading: false, sending: false, category: -1, error: ''};
    private bindings = new BindingScope(this);
    private generation = 0;
    private timer?: ReturnType<typeof setTimeout>;
    constructor(readonly service: RoomEmojis) { super(); this.bindings.bind({props: service.data, config: service.config}); }
    get categories() { return EmojiPropRules.categories(this.service.data.propList); }
    @bindEvent(TexasGameRoomDataEmoji.PROP_LIST_CHANGE, 'props')
    private onProps(): void {
        const categories = this.categories;
        this.state = {...this.state, category: categories.some(c => c.id === this.state.category) ? this.state.category : categories[0]?.id ?? -1};
    }
    @bindEvent(GlobalConfigStore.CONFIG_CHANGED, {dataSource: 'config', initIgnore: true})
    private onConfig(): void { this.state = {...this.state}; }
    open(): boolean {
        if (!this.service.canSend()) return false;
        this.state = {...this.state, open: true, error: ''}; void this.refresh(); return true;
    }
    async refresh(): Promise<void> {
        const generation = ++this.generation;
        this.state = {...this.state, loading: true, error: ''};
        try { await this.service.refresh(); }
        catch (error) { if (generation === this.generation) this.state = {...this.state, error: error instanceof Error ? error.message : String(error)}; }
        finally { if (generation === this.generation) this.state = {...this.state, loading: false}; }
    }
    select(category: number): void { if (category !== this.state.category) this.state = {...this.state, category}; }
    async send(prop: UserPropData): Promise<void> {
        if (this.state.sending) return;
        const generation = this.generation;
        this.state = {...this.state, sending: true, error: ''};
        try {
            await this.service.send(prop);
            if (generation === this.generation && this.state.open) this.timer = setTimeout(() => this.close(), 260);
        } catch (error) { if (generation === this.generation) this.state = {...this.state, error: error instanceof Error ? error.message : String(error)}; }
        finally { if (generation === this.generation) this.state = {...this.state, sending: false}; }
    }
    close(): void { ++this.generation; clearTimeout(this.timer); this.state = {...this.state, open: false, loading: false, sending: false}; }
    destroy(): void { this.close(); this.bindings.destroy(); }
}
