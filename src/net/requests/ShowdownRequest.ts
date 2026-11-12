import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';

export class ShowdownRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, selection: number[], signal: AbortSignal): Promise<void> {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessageShowdown(); body.setRoom(room); body.setShowCardsList(selection);
    const result = await this.client.request(this.pb.Code.MSG_D_SHOWDOWN,target.roomID,target.matchID,body,this.pb.ServerMessageShowdown,signal);
    if(result.status !== 0)throw new Error(CPErrorCode.ServerErrorDescription(result.status) || `亮牌失败（${result.status}）`);
  }
}
