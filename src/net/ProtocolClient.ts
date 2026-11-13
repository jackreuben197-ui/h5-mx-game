import type { HostTransport } from '../host/HostTransport.js';
import { PacketCodec, type Packet } from './PacketCodec.js';
interface Decoder<T> {
  deserializeBinary(bytes: Uint8Array): { toObject(): T };
}
interface Pending {
  key: string;
  code: number;
  roomID: number;
  matchID: number;
  rpcID?: number;
  assignedRoom: boolean;
  accept: (packet: Packet) => boolean;
  fail: (error: Error) => void;
  retire: () => void;
}
/** Requests subscribe before send. Cancelled non-RPC requests remain quarantined until
 * their reply is drained or H5 confirms a new connection: code alone is not a request ID. */
export class ProtocolClient {
  private listeners = new Set<(packet: Packet) => void>();
  private errors = new Set<(error: Error) => void>();
  private epoch = 0;
  private disposed = false;
  private codec = new PacketCodec();
  private pending = new Map<string, Pending>();
  private retired = new Set<string>();
  private off: () => void;
  private rpcSeed = 0;
  private queue = Promise.resolve();
  constructor(
    private transport: HostTransport,
    private token: () => string,
    private timeoutMs = 10000,
  ) {
    this.off = transport.subscribe((message) => {
      if (message.action === 'wsReconnected') {
        ++this.epoch;
        this.retired.clear();
        return;
      }
      if (['wsClosed', 'wsReconnecting', 'wsReconnectFailed'].includes(message.action)) {
        ++this.epoch;
        this.failAll(new Error('连接已中断，等待 H5 恢复后重试'));
        return;
      }
      if (message.action !== 'wsMessage') return;
      const p = message.payload as { dataType?: string; data?: unknown } | undefined;
      if (p?.dataType !== 'binary') return;
      const raw = p.data;
      const epoch = this.epoch;
      const process = async () => {
        const data =
          typeof Blob !== 'undefined' && raw instanceof Blob ? await raw.arrayBuffer() : raw;
        if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data))
          throw new Error('房间二进制消息无效');
        if (!this.disposed && epoch === this.epoch) this.receive(this.codec.decode(data));
      };
      // Keep Blob conversion and typed-array frames in arrival order.
      this.queue = this.queue.then(process).catch(() => {
        const error = new Error('房间消息解析失败，请重新进入');
        this.failAll(error);
        for (const listener of this.errors) listener(error);
      });
    });
  }
  subscribe(listener: (packet: Packet) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  onError(listener: (error: Error) => void): () => void {
    this.errors.add(listener);
    return () => {
      this.errors.delete(listener);
    };
  }
  nextRpcID(): number {
    this.rpcSeed = (this.rpcSeed % 0xfffffffe) + 1;
    return this.rpcSeed;
  }
  /** CC fire-and-forget messages such as AgreePost still use the H5 WS bridge. */
  send(code:number,roomID:number,matchID:number,body:{serializeBinary():Uint8Array},signal:AbortSignal):void{
    signal.throwIfAborted();
    if(this.disposed)throw new Error('房间连接已关闭');
    this.transport.send('wsSend',{dataType:'binary',data:this.codec.encode(code,this.token(),roomID,matchID,body.serializeBinary())},0);
  }
  request<T>(
    code: number,
    roomID: number,
    matchID: number,
    body: { serializeBinary(): Uint8Array },
    decoder: Decoder<T>,
    signal: AbortSignal,
    rpcID?: number,
    onAssignedRoom?: (roomID: number) => void,
  ): Promise<T> {
    signal.throwIfAborted();
    if (onAssignedRoom && !(code === 1002 && roomID === 0 && matchID > 0)) throw new Error('无效的赛事分桌请求');
    const key = `${code}:${roomID}:${matchID}:${rpcID ?? ''}`;
    if (this.pending.has(key) || this.retired.has(key))
      return Promise.reject(new Error('上一条同桌请求尚未结束，请等待回包或网络重连后重试'));
    return new Promise<T>((resolve, reject) => {
      let sent = false;
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        this.pending.delete(key);
      };
      const fail = (error: Error) => {
        if (sent && rpcID === undefined) this.retired.add(key);
        cleanup();
        reject(error);
      };
      const abort = () => fail(new DOMException('入桌已取消', 'AbortError'));
      const timer = setTimeout(() => fail(new Error(`房间请求超时（${code}）`)), this.timeoutMs);
      const pending: Pending = {
        key,
        code,
        roomID,
        matchID,
        rpcID,
        assignedRoom: !!onAssignedRoom,
        fail,
        retire: () => {
          if (sent && rpcID === undefined) this.retired.add(key);
        },
        accept: (packet) => {
          const value = decoder.deserializeBinary(packet.body).toObject();
          if (rpcID !== undefined && (value as { rpcId?: number }).rpcId !== rpcID) return false;
          onAssignedRoom?.(packet.roomID);
          cleanup();
          resolve(value);
          return true;
        },
      };
      this.pending.set(key, pending);
      signal.addEventListener('abort', abort, { once: true });
      try {
        const bytes = this.codec.encode(
          code,
          this.token(),
          roomID,
          matchID,
          body.serializeBinary(),
        );
        sent = true;
        this.transport.send('wsSend', { dataType: 'binary', data: bytes }, 0);
      } catch (error) {
        sent = false;
        fail(error instanceof Error ? error : new Error('发送失败'));
      }
    });
  }
  private receive(packet: Packet): void {
    // Trace settlement messages before request matching or room filtering.
    // Do not log tokens, binary payloads, or private card values.
    if (import.meta.env?.DEV && [1026, 1101, 1127, 1119].includes(packet.code)) {
      console.info(`[MX WS receive ${packet.code}]`, {
        roomID: packet.roomID, matchID: packet.matchID, bodyBytes: packet.body.length,
      });
    }
    if (packet.code === 99) {
      this.failAll(new Error('服务端拒绝房间请求（99）'));
      return;
    }
    const retiredKey = `${packet.code}:${packet.roomID}:${packet.matchID}:`;
    if (this.retired.delete(retiredKey)) return;
    if (packet.code === 1002 && packet.matchID > 0 && this.retired.delete(`1002:0:${packet.matchID}:`)) return;
    for (const request of [...this.pending.values()]) {
      if (
        request.code !== packet.code ||
        (request.roomID !== packet.roomID && !request.assignedRoom) ||
        request.matchID !== packet.matchID
      )
        continue;
      try {
        if (request.accept(packet)) break;
      } catch {
        request.fail(new Error('房间协议体解析失败'));
      }
    }
    for (const listener of [...this.listeners]) listener(packet);
  }
  private failAll(error: Error): void {
    for (const pending of [...this.pending.values()]) pending.fail(error);
  }
  destroy(): void {
    this.disposed = true;
    ++this.epoch;
    this.listeners.clear();
    this.errors.clear();
    this.off();
    this.failAll(new DOMException('客户端已销毁', 'AbortError'));
    this.retired.clear();
  }
}
