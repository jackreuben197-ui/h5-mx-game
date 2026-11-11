import { LoadingAssets } from './assets/LoadingAssets.js';
import { TestMenuView } from './table/components/TestMenuView.js';
import { i18nMgr } from './i18n/i18nMgr.js';
import './table/table.css';
import { PreloadingView } from './table/components/PreloadingView.js';
import { PreviewConfig } from './config/PreviewConfig.js';
import { GameController } from './core/controller.js';
import { Preloader } from './core/preloader.js';
import type { RoomTarget } from './core/types.js';
import type { MountOptions } from './MountOptions.js';
import type { TableView } from './table/view.js';
/** The whole portable UI lives under element. No body or Vue routing ownership. */
export class GameClient {
  readonly element = document.createElement('div');
  private controller: GameController<typeof import('./table/view.js')>;
  private table?: TableView;
  private loading: PreloadingView;
  private testMenu?: TestMenuView;
  private unsubscribe: () => void;
  private effectDisposers = new Set<() => void>();
  private disposed = false;
  constructor(
    container: HTMLElement,
    private options: MountOptions,
  ) {
    const root = this.element;
    root.className = 'mx-game';
    root.dataset.layout = options.layout ?? 'portrait';
    root.hidden = true;
    this.loading = new PreloadingView(() => {
      if (this.controller.current.target) void this.enter(this.controller.current.target);
    });
    const notice = document.createElement('p');
    notice.className = 'mx-error';
    notice.setAttribute('role', 'alert');
    root.append(this.loading.root, notice);
    container.append(root);
    if (import.meta.env.DEV) this.testMenu = new TestMenuView(container);
    let module: typeof import('./table/view.js') | undefined;
    const preload = new Preloader(async (report) => {
      await Promise.all([i18nMgr.initLanguage(), LoadingAssets.prepareFont()]);
      const loaded = await import('./table/view.js');
      await loaded.prepare(report);
      module = loaded;
      return loaded;
    });
    this.controller = new GameController(preload, options.host, options.minimumLoadingMs ?? PreviewConfig.minimumLoadingMs);
    this.unsubscribe = this.controller.subscribe((state) => {
      root.hidden = state.phase === 'hidden' || state.phase === 'destroyed';
      this.loading.render(state);
      notice.textContent = state.phase === 'table' ? state.error : '';
      if (state.phase === 'table' && state.table && module) {
        if (!this.table) {
          this.table = new module.TableView(
            (action, amount) => this.controller.command(action, amount),
            () => this.leave(),
            options.onNavigate,
            { emojis: options.host.getEmojis?.(), records: options.host.getRecords?.(), testControls: this.testMenu?.tableControls, layout: options.layout ?? 'portrait', components: options.components, seating: { settings: options.host.getTableSettings?.(), prepare:seat=>this.controller.prepareSeat(seat), submit:value=>this.controller.sitDown(value), standup:()=>this.controller.standup(), rules:insurance=>this.controller.showRules(insurance), storeChips:amount=>this.controller.storeChips(amount), keepSeat:keep=>this.controller.keepSeat(keep) } },
          );
          root.prepend(this.table.root);
        }
        this.table.render(state.table);
      } else this.clearTable();
      options.onState?.(state);
    });
  }
  enter(target: RoomTarget): Promise<void> {
    return this.controller.enter(target);
  }
  leave(): void {
    this.controller.leave();
    this.options.onLeave?.();
  }
  getState() {
    return this.controller.current;
  }
  get tableData() {
    return this.table?.data;
  }
  private clearTable(): void {
    this.effectDisposers.forEach((dispose) => dispose());
    this.effectDisposers.clear();
    this.table?.destroy();
    this.table = undefined;
  }
  async attachEffects(
    position: 'above' | 'below',
    create: Parameters<typeof import('./effects/canvas-surface.js').createCanvasSurface>[1],
  ) {
    const current = this.table;
    if (!current) throw new Error('请先进入牌桌');
    const { createCanvasSurface } = await import('./effects/canvas-surface.js');
    if (this.table !== current) throw new Error('牌桌已经离开');
    const dispose = createCanvasSurface(current[position], create),
      cleanup = () => {
        dispose();
        this.effectDisposers.delete(cleanup);
      };
    this.effectDisposers.add(cleanup);
    return cleanup;
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.destroy();
    this.unsubscribe();
    this.clearTable();
    this.loading.destroy();
    this.testMenu?.destroy();
    this.element.remove();
  }
}
