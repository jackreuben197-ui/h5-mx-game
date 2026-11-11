import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import { ProtocolClient } from '../ProtocolClient.js';
export class ActionRequest {
  constructor(
    private client: ProtocolClient,
    private pb: HoldemRuntime,
  ) {}
  async execute(
    target: RoomTarget,
    action: Parameters<HoldemRuntime['ClientMessageAction']['prototype']['setAction']>[0],
    amount: number,
    signal: AbortSignal,
  ): Promise<void> {
    const room = new this.pb.Room();
    room.setRoomId(target.roomID);
    room.setMatchId(target.matchID);
    const body = new this.pb.ClientMessageAction();
    body.setRoom(room);
    body.setAction(action);
    body.setAmount(amount);
    body.setClubId(target.clubID ?? 0);
    const result = await this.client.request(
      this.pb.Code.MSG_D_ACTION,
      target.roomID,
      target.matchID,
      body,
      this.pb.ServerMessageAction,
      signal,
    );
    if (result.status !== 0) throw new Error(`操作失败（${result.status}）`);
    // Actual chips/cards/action changes come from ActionAll, never optimistic UI writes.
  }
}
