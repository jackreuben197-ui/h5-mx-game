import type { HostMessage, HostTransport } from './HostTransport.js';
type Direct = (
  action: string,
  payload?: unknown,
  msgtype?: number,
  requestId?: string,
  timestamp?: number,
  source?: string,
) => void;
type BridgeWindow = Window & {
  __CC_READY__?: boolean;
  CocosBridge?: { postMessage?: (message: unknown) => void; sendMessage?: Direct };
  H5Bridge?: { onMessgeRecv?: Direct; onMessageRecv?: Direct };
};
/** Compatibility names only: this transport does not load a Cocos runtime. */
export class H5BridgeTransport implements HostTransport {
  private listeners = new Set<(message: HostMessage) => void>();
  private previous: BridgeWindow['CocosBridge'];
  private installed = false;
  private acknowledged = false;
  private previousReady?: boolean;
  private queued: { action: string; payload?: unknown; msgtype: number; requestId?: string }[] = [];
  get handshakeDone(): boolean { return this.acknowledged; }
  private timer?: ReturnType<typeof setInterval>;
  private bridge = {
    sendMessage: ((action, payload, msgtype = 1, requestId, timestamp, source = 'h5') => {
      if (source !== 'h5' || !this.installed) return;
      const acknowledgement = action === 'h5Ack' || action === 'h5Ready';
      if (acknowledgement) {
        this.acknowledged = true;
        clearInterval(this.timer);
      }
      for (const listener of [...this.listeners])
        listener({ action, payload, msgtype, source, requestId, timestamp });
      if (acknowledgement) {
        for (const message of this.queued.splice(0))
          this.send(message.action, message.payload, message.msgtype, message.requestId);
      }
    }) as Direct,
    postMessage: (raw: unknown) => {
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          return;
        }
      }
      if (!raw || typeof raw !== 'object') return;
      const m = raw as HostMessage;
      if (typeof m.action === 'string')
        this.bridge.sendMessage(m.action, m.payload, m.msgtype, m.requestId, m.timestamp, m.source);
    },
  };
  constructor(private win: BridgeWindow = window) {}
  start(): void {
    if (this.installed) return;
    if (this.win.CocosBridge) throw new Error('已有游戏桥接，不能同时启动 CC 与 MX');
    this.previous = this.win.CocosBridge;
    this.installed = true;
    this.acknowledged = false;
    this.previousReady = this.win.__CC_READY__;
    this.win.CocosBridge = this.bridge;
    // Match H5MsgMgr.startHandshake: H5 also reads this readiness flag at startup.
    this.win.__CC_READY__ = true;
    const announce = () => {
      if (this.win.H5Bridge?.onMessgeRecv || this.win.H5Bridge?.onMessageRecv) {
        // Finding a receiver is not an acknowledgement. Retry until H5 replies.
        if (!this.acknowledged) this.send('ccReady');
      }
    };
    this.timer = setInterval(announce, 250);
    announce();
  }
  send(action: string, payload?: unknown, msgtype = 1, requestId?: string): void {
    if (action !== 'ccReady' && action !== 'ccAck' && !this.acknowledged) {
      if (this.queued.length >= 1000) throw new Error('H5 握手未完成，消息积压');
      this.queued.push({ action, payload, msgtype, requestId });
      return;
    }
    const receive = this.win.H5Bridge?.onMessgeRecv ?? this.win.H5Bridge?.onMessageRecv;
    if (!receive) throw new Error('H5 桥接尚未就绪');
    receive(action, payload, msgtype, requestId, Date.now(), 'cc');
  }
  subscribe(listener: (message: HostMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  destroy(): void {
    clearInterval(this.timer);
    this.installed = false;
    this.acknowledged = false;
    this.queued = [];
    this.listeners.clear();
    if (this.win.CocosBridge === this.bridge) {
      this.win.CocosBridge = this.previous;
      this.win.__CC_READY__ = this.previousReady;
    }
  }
}
