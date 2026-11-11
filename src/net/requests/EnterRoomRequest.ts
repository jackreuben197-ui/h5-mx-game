import type { ServerMessageEnterRoom } from '@silenthill/agreement-web';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { RoomTarget } from '../../core/types.js';
import { ProtocolClient } from '../ProtocolClient.js';
export class EnterRoomRequest {
  constructor(
    private client: ProtocolClient,
    private pb: HoldemRuntime,
  ) {}
  async execute(target: RoomTarget, signal: AbortSignal): Promise<ServerMessageEnterRoom.AsObject> {
    const room = new this.pb.Room();
    room.setRoomId(target.roomID);
    room.setMatchId(target.matchID);
    const gps = new this.pb.GPS();
    gps.setLongitude('');
    gps.setLatitude('');
    const request = new this.pb.ClientMessageEnterRoom();
    request.setRoom(room);
    request.setGps(gps);
    request.setObserver(target.observer ?? false);
    request.setMttPartialBringIn(0);
    request.setWantSeat(this.pb.Def.WantSeatType.WST_BOTH);
    const result = await this.client.request(
      this.pb.Code.MSG_D_ENTER_ROOM,
      target.roomID,
      target.matchID,
      request,
      this.pb.ServerMessageEnterRoom,
      signal,
    );
    if (result.status !== 0) throw new Error(`进入房间失败（${result.status}）`);
    return result;
  }
}
