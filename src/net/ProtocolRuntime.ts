export type HoldemRuntime = typeof import('@silenthill/agreement-web/runtime');
/** Reuse Vue's injected PB runtime; standalone consumers get one lazy fallback chunk. */
export class ProtocolRuntime {
  private task?: Promise<HoldemRuntime>;
  constructor(private supplied?: HoldemRuntime) {}
  load(): Promise<HoldemRuntime> {
    const existing =
      this.supplied ?? (globalThis as typeof globalThis & { HoldemPB?: HoldemRuntime }).HoldemPB;
    if (existing) return Promise.resolve(existing);
    return (this.task ??= import('@silenthill/agreement-web/runtime')
      .then((module) => {
        const pb = (module as unknown as { default?: HoldemRuntime }).default ?? module;
        if (typeof pb.ClientMessageEnterRoom !== 'function') throw new Error('协议运行时尚未就绪');
        return pb;
      })
      .catch((error) => {
        this.task = undefined;
        throw error;
      }));
  }
}
