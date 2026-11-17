import config from './table/components/PreloadingView/config.json';
import { resourceURL } from './table/ResourcePath.js';
/** Resolve against the MX module, never the external H5 document origin. */
export class LoadingAssets {
  static readonly background = resourceURL(config.paths.background);
  static readonly track = resourceURL(config.paths.track);
  static readonly font = resourceURL(config.paths.font);
  private static fontTask?: Promise<void>;
  static prepareFont(): Promise<void> {
    if (!this.fontTask) {
      const font = new FontFace('MxLoadingInter', `url("${this.font}")`);
      document.fonts.add(font);
      this.fontTask = font.load().then(() => undefined).catch(error => {
        document.fonts.delete(font);
        this.fontTask = undefined;
        throw error;
      });
    }
    return this.fontTask;
  }
}
