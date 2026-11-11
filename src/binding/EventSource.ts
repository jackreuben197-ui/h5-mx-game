/** Engine-independent counterpart of the small EventTarget surface used by CC. */
export class EventSource {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();
  on(event: string, listener: (...args: any[]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (!set!.size) this.listeners.delete(event);
    };
  }
  emit(event: string, ...args: any[]): void {
    for (const fn of [...(this.listeners.get(event) ?? [])]) fn(...args);
  }
  clear(): void {
    this.listeners.clear();
  }
}
