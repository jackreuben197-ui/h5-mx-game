import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
export class StandupRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, signal: AbortSignal): Promise<boolean> {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessageStandupActive(); body.setRoom(room); body.setCancelStandup(false); body.setManualChangeRoom(false);
    const result = await this.client.request(this.pb.Code.MSG_D_STANDUP_ACTIVE,target.roomID,target.matchID,body,this.pb.ServerMessageStandupActive,signal);
    if(result.status !== 0) throw new Error(`站起失败（${result.status}）`);
    return result.willStandup;
  }
}
