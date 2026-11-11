import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { ProtocolClient } from '../ProtocolClient.js';
export class PublicReplayRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, signal: AbortSignal, hand: number, unique: string) {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessagePublicReplay(); body.setRoom(room);
    body.setHandNum(hand); body.setUniqueId(unique);
    return this.client.request(this.pb.Code.MSG_D_PUBLIC_REPLAY, target.roomID, target.matchID, body, this.pb.ServerMessagePublicReplay, signal);
  }
}
