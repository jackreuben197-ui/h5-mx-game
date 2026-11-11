import type { ServerMessageSyncEnter } from '@silenthill/agreement-web';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { RoomTarget } from '../../core/types.js';
import { ProtocolClient } from '../ProtocolClient.js';
export class SyncEnterRequest {
  constructor(
    private client: ProtocolClient,
    private pb: HoldemRuntime,
  ) {}
  async execute(target: RoomTarget, signal: AbortSignal): Promise<ServerMessageSyncEnter.AsObject> {
    const room = new this.pb.Room();
    room.setRoomId(target.roomID);
    room.setMatchId(target.matchID);
    const request = new this.pb.ClientMessageSyncEnter();
    request.setRoom(room);
    const result = await this.client.request(
      this.pb.Code.MSG_D_SYNC_ENTER,
      target.roomID,
      target.matchID,
      request,
      this.pb.ServerMessageSyncEnter,
      signal,
    );
    if (result.status !== 0) throw new Error(`同步房间失败（${result.status}）`);
    return result;
  }
}
