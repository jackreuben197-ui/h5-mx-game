import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';
/** Wire fields preserved from CC TexasTableEvent / UIBringOut. */
export class BringInRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, amount: number, apply: boolean, signal: AbortSignal): Promise<void> {
    const room=new this.pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new this.pb.ClientMessageBringIn();body.setRoom(room);body.setBringIn(amount); body.setUseWallet(true); body.setApplyBringIn(apply); body.setDepositAdvance(0);
    const result=await this.client.request(this.pb.Code.MSG_D_BRING_IN,target.roomID,target.matchID,body,this.pb.ServerMessageBringIn,signal);
    if(result.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(result.status) || `操作失败（${result.status}）`);
  }
}
