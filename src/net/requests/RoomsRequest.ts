import type { RoomRecord } from '@silenthill/agreement-web';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
export class RoomsRequest {
  constructor(
    private client: ProtocolClient,
    private pb: HoldemRuntime,
  ) {}
  async execute(roomID: number, signal: AbortSignal): Promise<RoomRecord.AsObject> {
    const request = new this.pb.ClientMessageRooms(),
      rpcID = this.client.nextRpcID();
    request.setRoomIdList([roomID]);
    request.setRpcId(rpcID);
    const response = await this.client.request(
      this.pb.Code.MSG_R_ROOMS,
      0,
      0,
      request,
      this.pb.ServerMessageRooms,
      signal,
      rpcID,
    );
    if (response.status !== 0) throw new Error(`查询房间失败（${response.status}）`);
    const room = response.roomsList.find((r) => r.rid === roomID);
    if (!room) throw new Error('房间不存在');
    return room;
  }
}
