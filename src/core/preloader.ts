/** One shared task for background warmup and foreground entry. Failed work can retry. */
export class Preloader<T> {
  private task?: Promise<T>;
  private progress = 0;
  private listeners = new Set<(progress: number) => void>();
  constructor(private load: (report: (progress: number) => void) => Promise<T>) {}
  subscribe(listener: (progress: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.progress);
    return () => {
      this.listeners.delete(listener);
    };
  }
  ensure(): Promise<T> {
    if (!this.task) {
      this.task = Promise.resolve()
        .then(() =>
          this.load((value) => {
            this.progress = Math.max(0, Math.min(1, value));
            this.listeners.forEach((listener) => listener(this.progress));
          }),
        )
        .then((result) => {
          this.progress = 1;
          this.listeners.forEach((listener) => listener(1));
          return result;
        })
        .catch((error) => {
          this.task = undefined;
          throw error;
        });
    }
    return this.task;
  }
}
