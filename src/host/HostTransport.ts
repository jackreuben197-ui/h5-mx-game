export interface HostMessage {
  action: string;
  payload?: unknown;
  msgtype: number;
  source: string;
  requestId?: string;
  timestamp?: number;
}
export interface HostTransport {
  send(action: string, payload?: unknown, msgtype?: number): void;
  subscribe(listener: (message: HostMessage) => void): () => void;
}
