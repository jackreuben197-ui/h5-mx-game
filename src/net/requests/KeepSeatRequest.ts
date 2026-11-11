import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';
/** Wire fields preserved from CC TexasTableEvent / UIBringOut. */
export class KeepSeatRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, keep: boolean, duration: number, signal: AbortSignal): Promise<void> {
    const room=new this.pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new this.pb.ClientMessageKeepSeatActive();body.setRoom(room);body.setKeep(keep); body.setDuration(keep ? duration : 0);
    const result=await this.client.request(this.pb.Code.MSG_D_KEEP_SEAT_ACTIVE,target.roomID,target.matchID,body,this.pb.ServerMessageKeepSeatActive,signal);
    if(result.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(result.status) || `操作失败（${result.status}）`);
  }
}
