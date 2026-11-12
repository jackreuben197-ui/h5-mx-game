import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';

/** CC TexasTableEvent.AddTime: the consume tier follows the number already used. */
export class AddTimeRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, used: number, signal: AbortSignal): Promise<void> {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const types = this.pb.Def.ConsumeType;
    const consume = [types.CT_DELAY_2, types.CT_DELAY_3, types.CT_DELAY_4, types.CT_DELAY_5][used] ?? types.CT_DELAY_6;
    const body = new this.pb.ClientMessageAddTime();
    body.setRoom(room); body.setConsume(consume); body.setDirectConsume(false);
    const result = await this.client.request(this.pb.Code.MSG_D_ADD_TIME,target.roomID,target.matchID,body,this.pb.ServerMessageAddTime,signal);
    if(result.status !== 0)throw new Error(CPErrorCode.ServerErrorDescription(result.status) || `加时失败（${result.status}）`);
  }
}
