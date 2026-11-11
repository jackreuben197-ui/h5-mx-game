import type { EventSource } from './EventSource.js';
const properties = new WeakMap<object, Map<string, string>>();
/** Legacy TS property decorator, matching the CC @observable usage. */
export function observable(event: string): PropertyDecorator {
  return (prototype, key) => {
    const values = new WeakMap<object, unknown>();
    let map = properties.get(prototype);
    if (!map) properties.set(prototype, (map = new Map()));
    map.set(event, String(key));
    Object.defineProperty(prototype, key, {
      configurable: true,
      enumerable: true,
      get() {
        return values.get(this);
      },
      set(this: EventSource, value: unknown) {
        const old = values.get(this);
        values.set(this, value);
        if (!Object.is(old, value)) this.emit(event, value, old);
      },
    });
  };
}
export function currentValue(source: object, event: string): { found: boolean; value?: unknown } {
  for (let p = Object.getPrototypeOf(source); p; p = Object.getPrototypeOf(p)) {
    const key = properties.get(p)?.get(event);
    if (key) return { found: true, value: (source as Record<string, unknown>)[key] };
  }
  return { found: false };
}
