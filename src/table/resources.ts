import { DeskBackgroundView } from './components/DeskBackgroundView.js';
import { SpineEffects } from '../effects/SpineEffects.js';
import settings from '../data/TexasGamePersonalSettings.js';
import { LoadingAssets } from '../core/LoadingAssets.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import { resources } from 'virtual:mx-images';
export { resources };
// Retain decoded source images for the lifetime of this client module.
const images = new Map<string, HTMLImageElement>();
const cache = new Map<string, Promise<void>>();
export function imageReady(url: string): Promise<void> {
  let task = cache.get(url);
  if (!task) {
    task = new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      images.set(url, image);
      const timer = setTimeout(() => {
        image.src = '';
        reject(new Error(i18nMgr.Get("MX_LoadingTimedOutTryAgain", [], "资源加载超时，请重试")));
      }, 15000);
      image.onload = () => {
        clearTimeout(timer);
        image.decode().then(resolve, reject);
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error(i18nMgr.Get("MX_TableResourcesFailedToLoadTryAgain", [], "牌桌资源加载失败，请重试")));
      };
      image.src = url;
    }).catch((error) => {
      cache.delete(url);
      images.delete(url);
      throw error;
    });
    cache.set(url, task);
  }
  return task;
}
export async function decodedImage(url: string): Promise<HTMLImageElement> {
  await imageReady(url);
  return images.get(url)!;
}
export async function prepare(report: (progress: number) => void): Promise<void> {
  const urls = [...new Set([LoadingAssets.background, LoadingAssets.track, ...resources.preload, resources.desks[String(settings.deskType)] ?? resources.desk, ...(settings.pokerCardType === 2 ? (resources.mode === 'raw' ? Object.values(resources.rawCards1) : [resources.cards1]) : [])])];
  let done = 0;
  const effects = SpineEffects.preload().catch(error => console.warn('[MX Spine] Preload failed; retry when playing.', error));
  const desk = DeskBackgroundView.preload(settings.deskType).catch(error => console.warn('[MX Spine] Desk preload failed; retry on entry.', error));
  await Promise.all([desk.then(() => report(++done / (urls.length + 2))), effects.then(() => report(++done / (urls.length + 2))), ...urls.map(async (url) => {
      await imageReady(url);
      report(++done / (urls.length + 2));
    })]);
}
