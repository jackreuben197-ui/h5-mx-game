import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { ProtocolClient } from '../ProtocolClient.js';
export class PlayerJackpotSummaryRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, signal: AbortSignal) {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessagePlayerJackpotSummary(); body.setRoom(room);
    
    return this.client.request(this.pb.Code.MSG_D_PLAYER_JACKPOT_SUMMARY, target.roomID, target.matchID, body, this.pb.ServerMessagePlayerJackpotSummary, signal);
  }
}
