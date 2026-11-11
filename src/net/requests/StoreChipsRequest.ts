import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';
/** Wire fields preserved from CC TexasTableEvent / UIBringOut. */
export class StoreChipsRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, amount: number, signal: AbortSignal): Promise<void> {
    const room=new this.pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new this.pb.ClientMessageStoreChips();body.setRoom(room);body.setStore(amount);
    const result=await this.client.request(this.pb.Code.MSG_D_STORE_CHIPS,target.roomID,target.matchID,body,this.pb.ServerMessageStoreChips,signal);
    if(result.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(result.status) || `操作失败（${result.status}）`);
  }
}
