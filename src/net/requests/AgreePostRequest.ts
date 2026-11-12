import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';

export class AgreePostRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, signal: AbortSignal): Promise<void> {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessageAgreePost(); body.setRoom(room);
    this.client.send(this.pb.Code.MSG_D_AGREE_POST,target.roomID,target.matchID,body,signal);
  }
}
