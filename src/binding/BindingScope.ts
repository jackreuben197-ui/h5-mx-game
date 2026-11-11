import type { EventSource } from './EventSource.js';
import { getBindings } from './bindEvent.js';
import { currentValue } from './observable.js';
/** Per-component subscriptions: replacement and destroy never affect another UI. */
export class BindingScope {
  private sources = new Map<string, { source: EventSource; off: (() => void)[] }>();
  constructor(private component: object) {}
  bind(sources: Record<string, EventSource | null>): void {
    const init: { priority: number; run: () => void }[] = [];
    for (const [tag, source] of Object.entries(sources)) {
      if (this.sources.get(tag)?.source === source) continue;
      this.sources.get(tag)?.off.forEach((off) => off());
      this.sources.delete(tag);
      if (!source) continue;
      const off: (() => void)[] = [];
      this.sources.set(tag, { source, off });
      for (const binding of getBindings(this.component).filter((b) => b.source === tag)) {
        const callback = (this.component as Record<string | symbol, Function>)[
          binding.method
        ]!.bind(this.component);
        off.push(source.on(binding.event, callback));
        const current = currentValue(source, binding.event);
        if (!binding.initIgnore && current.found)
          init.push({ priority: binding.priority, run: () => callback(current.value) });
      }
    }
    init.sort((a, b) => b.priority - a.priority).forEach((item) => item.run());
  }
  destroy(): void {
    this.sources.forEach((v) => v.off.forEach((off) => off()));
    this.sources.clear();
  }
}
