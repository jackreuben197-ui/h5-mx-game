import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';
export class SetAutoOnTableRequest {
  constructor(private client:ProtocolClient,private pb:HoldemRuntime){}
  async execute(target:RoomTarget,amount:number,signal:AbortSignal):Promise<void>{
    const room=new this.pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);
    const body=new this.pb.ClientMessageSetAutoOnTable();body.setRoom(room);body.setAutoOnTable(amount);body.setAutoUseWallet(true);body.setAutoOnTableNoStore(true);body.setAutoOnTableFix(amount);
    const result=await this.client.request(this.pb.Code.MSG_D_SET_AUTO_ON_TABLE,target.roomID,target.matchID,body,this.pb.ServerMessageSetAutoOnTable,signal);
    if(result.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(result.status) || `操作失败（${result.status}）`);
  }
}
