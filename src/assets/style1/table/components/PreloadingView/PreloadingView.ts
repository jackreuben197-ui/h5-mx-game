import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { LoadingAssets } from '../../../LoadingAssets.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import type { ClientState } from '../../../../../core/types.js';
import { element } from '../../dom.js';
/** CC UIPreloading.prefab: background, 900×60 bar and labels at y=-72/-160. */
export class PreloadingView {
  readonly root = componentBox(element('section', 'mx-preloading'),config);
  private group = element('div', 'mx-preloading-group');
  private bar = element('div', 'mx-preloading-bar');
  private fill = element('div', 'mx-preloading-fill');
  private inner = element('div', 'mx-preloading-inner');
  private label = element('p', 'mx-preloading-label');
  private description = element('p', 'mx-preloading-description');
  private error = element('div', 'mx-preloading-error');
  private message = element('p', '');
  private resize: ResizeObserver;
  constructor(retry: () => void) {
    this.root.style.backgroundImage = `url("${LoadingAssets.background}")`;
    this.bar.style.backgroundImage = `url("${LoadingAssets.track}")`;
    this.bar.setAttribute('role', 'progressbar');
    i18nLabel.bind(this.bar, () => i18nMgr.Get("MX_ResourceLoadingProgress", [], "资源加载进度"), 'aria-label');
    this.bar.setAttribute('aria-valuemin', '0');
    this.bar.setAttribute('aria-valuemax', '100');
    i18nLabel.bind(this.description, () => i18nMgr.Get("UIFirstLoadingTips", [], "第一次资源加载速度微慢，请耐心等待..."));
    this.inner.append(this.fill);
    this.bar.append(this.inner);
    this.group.append(this.bar, this.label, this.description);
    const title = element('h2', '', () => i18nMgr.Get("MX_UnableToEnterRoom", [], "暂时无法进入房间"));
    this.message.setAttribute('role', 'alert');
    const retryButton = element('button', '', () => i18nMgr.Get("UIChannelC_Retry", [], "重试"));
    retryButton.onclick = retry;
    this.error.append(title, this.message, retryButton);
    this.root.append(this.group, this.error);
    this.resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      this.root.style.setProperty('--loading-unit', `${(width / height > config.layout.wideRatio ? height / config.layout.designHeight : width / config.layout.designWidth)}px`);
    });
    this.resize.observe(this.root);
  }
  render(state: ClientState): void {
    this.root.hidden = state.phase === 'table';
    const failed = state.phase === 'error';
    this.group.hidden = failed;
    this.error.hidden = !failed;
    this.message.textContent = state.error ?? '';
    const percent = Math.floor(state.progress * 100);
    this.bar.setAttribute('aria-valuenow', String(percent));
    this.fill.style.width = `${percent}%`;
    this.label.textContent = `loading...${percent}%`;
  }
  destroy(): void { this.resize.disconnect(); this.root.remove(); }
}
