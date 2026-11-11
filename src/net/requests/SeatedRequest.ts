import type { ClientMessageSeated } from '@silenthill/agreement-web';
import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
export class SeatedRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  async execute(target: RoomTarget, data: ClientMessageSeated.AsObject, signal: AbortSignal): Promise<void> {
    const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessageSeated(); body.setRoom(room);
    body.setSeatId(data.seatId); body.setReturnOrNew(data.returnOrNew); body.setBringIn(data.bringIn);
    body.setAutoOnTable(data.autoOnTable); body.setAutoUseWallet(data.autoUseWallet);
    body.setStore(data.store); body.setClubId(data.clubId); body.setApplyBringIn(data.applyBringIn);
    body.setAutoOnTableNoStore(data.autoOnTableNoStore); body.setAutoOnTableFix(data.autoOnTableFix);
    body.setAutoOnTableMax(data.autoOnTableMax); body.setDepositAdvance(data.depositAdvance);
    const result = await this.client.request(this.pb.Code.MSG_D_SEATED,target.roomID,target.matchID,body,this.pb.ServerMessageSeated,signal);
    if(result.status !== 0) throw new Error(`坐下失败（${result.status}）`);
  }
}
