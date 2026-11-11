import type { HostTransport } from './HostTransport.js';
import type { ReplayHandData } from '../data/ReplayHandData.js';
/** CC BridgeStorage protocol and game_replays keys; H5 owns IndexedDB. */
export class ReplayStorage {
    constructor(private transport: HostTransport, private user: number, private room: number, private match: number) { }
    private request(op: 'get' | 'put', key: string, signal: AbortSignal, value?: ReplayHandData): Promise<ReplayHandData | null> {
        if (!this.user || signal.aborted)
            return Promise.resolve(null);
        return new Promise(resolve => {
            const requestId = `mx-replay-${crypto.randomUUID()}`;
            let timer: ReturnType<typeof setTimeout>;
            const finish = (result: ReplayHandData | null) => { clearTimeout(timer); off(); signal.removeEventListener('abort', abort); resolve(result); };
            const abort = () => finish(null);
            const off = this.transport.subscribe(message => {
                const result = message.payload as {
                    requestId?: string;
                    ok?: boolean;
                    value?: ReplayHandData;
                } | undefined;
                if (message.action === 'ccStorageResult' && result?.requestId === requestId)
                    finish(result.ok ? result.value ?? null : null);
            });
            timer = setTimeout(() => finish(null), 5000);
            signal.addEventListener('abort', abort, { once: true });
            try {
                this.transport.send('ccStorageOp', { requestId, storage: 'indexeddb', store: 'game_replays', op, key, ...(value ? { value } : {}) }, 1);
            }
            catch {
                finish(null);
            }
        });
    }
    async get(hand: number, signal: AbortSignal): Promise<ReplayHandData | null> {
        return await this.request('get', `${this.user}_${this.room}_${hand}`, signal) ??
            (this.match ? await this.request('get', `${this.user}_m${this.match}_${hand}`, signal) : null);
    }
    put(hand: number, data: ReplayHandData, signal: AbortSignal): void {
        void this.request('put', `${this.user}_${this.room}_${hand}`, signal, data);
        if (this.match)
            void this.request('put', `${this.user}_m${this.match}_${hand}`, signal, data);
    }
}
