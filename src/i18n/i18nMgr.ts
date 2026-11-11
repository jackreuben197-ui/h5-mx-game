import i18n from '@silenthill/h5-cc-i18n';
import { supplement } from './supplement.js';
type Refreshable = { refreshLanguage(): void };
/** CC i18nMgr: same locale aliases and shared package; DOM listeners replace cc.Label. */
export class i18nMgr {
  static language = 'cn';
  private static fallback?: typeof import('@silenthill/h5-cc-i18n/runtime').default;
  private static pending?: Promise<void>;
  private static labels = new Set<WeakRef<Refreshable>>();
  static register(label: Refreshable): void { this.labels.add(new WeakRef(label)); }
  static refreshAllLabel(): void {
    for (const ref of [...this.labels]) {
      const label = ref.deref();
      if (label) label.refreshLanguage(); else this.labels.delete(ref);
    }
  }
  static async initLanguage(): Promise<void> {
    if (!this.pending) this.pending = (async () => {
      // H5 owns its page runtime. Standalone preview loads the same official runtime once.
      if (!i18n._instance) this.fallback = (await import('@silenthill/h5-cc-i18n/runtime')).default;
      this.setLanguage(i18n.currentLocale || this.language);
    })();
    return this.pending;
  }
  static getCurrentLocale(): string { return (i18n._instance ? i18n : this.fallback)?.currentLocale ?? 'zh-CN'; }
  static isCN(): boolean { return this.language === 'cn'; }
  static setLanguage(language: string): boolean {
    const normalized = String(language || '').trim().toLowerCase().replace(/_/g, '-');
    let code: string, locale: string;
    if (['cn','zh-cn','zh-hans'].includes(normalized)) { code='cn'; locale=i18n.LANG_ZH_CN; }
    else if (['zh','tw','hk','zh-tw','zh-hk','zh-hant'].includes(normalized)) { code='zh'; locale=i18n.LANG_ZH_TW; }
    else if (normalized === 'en' || normalized.startsWith('en-')) { code='en'; locale=i18n.LANG_EN; }
    else if (['pt','br'].includes(normalized) || normalized.startsWith('pt-')) { code='pt'; locale=i18n.LANG_PT; }
    else return false;
    this.language = code;
    (i18n._instance ? i18n : this.fallback)?.setLocale(locale);
    this.refreshAllLabel();
    return true;
  }
  static Get(key: string, params: readonly (string | number)[] = [], fallback = key): string {
    const local = supplement[key]?.[this.language];
    let value = local ?? (i18n._instance ? i18n : this.fallback)?.get(key, fallback) ?? fallback;
    value = value.replace(/\\n/g, '\n');
    params.forEach((param, index) => { value = value.split(`{${index}}`).join(String(param)).replace('##', String(param)); });
    return value;
  }
  static _getLabel(key: string): string { return this.Get(key); }
}
