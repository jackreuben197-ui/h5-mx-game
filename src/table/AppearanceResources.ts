import settings from '../data/TexasGamePersonalSettings.js';
import { resources, imageReady } from './resources.js';
/** Load only the selected full-size desk / alternate deck, retaining decoded images. */
export class AppearanceResources {
  static async desk(type: number): Promise<string> {
    const url = resources.desks[String(type)] ?? resources.desk;
    await imageReady(url); return url;
  }
  static async cards(type: number): Promise<void> {
    if (type !== 2) return;
    const urls = resources.mode === 'raw' ? Object.values(resources.rawCards1) : [resources.cards1];
    await Promise.all(urls.map(imageReady));
  }
  static async prepareSelected(): Promise<void> {
    await Promise.all([this.desk(settings.deskType), this.cards(settings.pokerCardType)]);
  }
}
