import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { ProtocolClient } from '../ProtocolClient.js';
export class RoomersRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, signal: AbortSignal) {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessageRoomers(); body.setRoom(room);
    body.setHistory(true); body.setHistoryOffset(0); body.setHistoryLimit(1000);
    return this.client.request(this.pb.Code.MSG_D_ROOMERS, target.roomID, target.matchID, body, this.pb.ServerMessageRoomers, signal);
  }
}
