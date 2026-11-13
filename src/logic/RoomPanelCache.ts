/** Per-room read cache: deduplicates in-flight requests; never caches failures or late results. */
export class RoomPanelCache<T> {
  private value?: T;
  private updated = 0;
  private generation = 0;
  private task?: Promise<T>;
  constructor(private load: () => Promise<T>, private signal: AbortSignal, private ttl = 30000) {}
  peek(): T | undefined { return this.signal.aborted ? undefined : this.value; }
  invalidate(): void { this.updated = 0; this.generation++; }
  get(): Promise<T> {
    this.signal.throwIfAborted();
    if (this.task) return this.task;
    if (this.value !== undefined && Date.now() - this.updated < this.ttl) return Promise.resolve(this.value);
    const generation=this.generation;
    return this.task = this.load().then(value => {
      this.signal.throwIfAborted(); this.value = value; this.updated = generation===this.generation?Date.now():0; return value;
    }).finally(() => { this.task = undefined; });
  }
}
