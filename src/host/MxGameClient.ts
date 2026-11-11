import type { HttpOptions } from '../net/http/HttpClient.js';
import { GameClient } from '../GameClient.js';
import type { MountOptions } from '../MountOptions.js';
import type { RoomHost, RoomTarget } from '../core/types.js';
import type { HostTransport } from './HostTransport.js';
import { H5BridgeTransport } from './H5BridgeTransport.js';
import { H5EntryController } from './H5EntryController.js';
import { MxRoomHost } from './MxRoomHost.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
export interface MxMountOptions extends Omit<MountOptions, 'host'> {
  runtime?: HoldemRuntime;
  timeoutMs?: number;
  http?: HttpOptions;
}
export class MxGameClient {
  readonly transport = new H5BridgeTransport();
  readonly game: GameClient;
  readonly host: RoomHost;
  private entry: H5EntryController;
  private visible = false;
  private disposed = false;
  constructor(
    container: HTMLElement,
    options: MxMountOptions = {},
    createHost?: (transport: HostTransport) => RoomHost,
  ) {
    this.host = createHost?.(this.transport) ?? new MxRoomHost(this.transport, options);
    this.game = new GameClient(container, {
      ...options,
      host: this.host,
      onState: (state) => {
        const visible = !['hidden', 'destroyed'].includes(state.phase);
        if (visible !== this.visible) {
          this.visible = visible;
          this.transport.send(visible ? 'h5Hide' : 'h5Show');
          if (!visible) this.transport.send('setHeartbeatMode', { mode: 'normal' });
        }
        options.onState?.(state);
      },
    });
    this.entry = new H5EntryController(this.transport, this.game);
    try {
      this.transport.start();
    } catch (error) {
      this.entry.destroy();
      this.game.destroy();
      if (this.host instanceof MxRoomHost) this.host.destroy();
      throw error;
    }
  }
  get element() {
    return this.game.element;
  }
  get tableData() {
    return this.game.tableData;
  }
  enter(target: RoomTarget) {
    return this.game.enter(target);
  }
  getState() {
    return this.game.getState();
  }
  leave() {
    this.game.leave();
  }
  sync() {
    return this.host instanceof MxRoomHost ? this.host.sync() : Promise.resolve();
  }
  attachEffects(...args: Parameters<GameClient['attachEffects']>) {
    return this.game.attachEffects(...args);
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.entry.destroy();
    this.game.destroy();
    if (this.host instanceof MxRoomHost) this.host.destroy();
    this.transport.destroy();
  }
}
