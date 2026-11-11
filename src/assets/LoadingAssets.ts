/** Resolve against the MX module, never the external H5 document origin. */
export class LoadingAssets {
  static readonly background = new URL('./loading/loadingbg.png', import.meta.url).href;
  static readonly track = new URL('./loading/barbg.png', import.meta.url).href;
  static readonly font = new URL('./loading/Inter.ttf', import.meta.url).href;
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
