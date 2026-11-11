/** CC LocalStoreManager JSON format and moyu_ prefix. */
export class LocalStorage {
  static setItem(key: string, value: unknown): void {
    try { globalThis.localStorage?.setItem('moyu_' + key, JSON.stringify(value)); } catch { /* Private browsing may deny persistence. */ }
  }
  static getItem<T>(key: string, fallback: T): T {
    try { const value = globalThis.localStorage?.getItem('moyu_' + key); return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }
}
export default LocalStorage;
