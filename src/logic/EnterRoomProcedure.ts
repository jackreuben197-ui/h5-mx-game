import type { RoomTarget } from '../core/types.js';
import { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import { ProtocolClient } from '../net/ProtocolClient.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
import { RoomsRequest } from '../net/requests/RoomsRequest.js';
import { EnterRoomRequest } from '../net/requests/EnterRoomRequest.js';
import { RoomEntryPolicy } from './RoomEntryPolicy.js';
/** CC TexasGameplayEntrance: Rooms -> checkCanEnter -> EnterRoom -> authoritative snapshot. */
export class EnterRoomProcedure {
  constructor(
    private client: ProtocolClient,
    private pb: HoldemRuntime,
  ) {}
  async run(target: RoomTarget, signal: AbortSignal): Promise<ProtocolRoomData> {
    const record = await new RoomsRequest(this.client, this.pb).execute(target.roomID, signal);
    signal.throwIfAborted();
    new RoomEntryPolicy().check(target, record);
    const snapshot = await new EnterRoomRequest(this.client, this.pb).execute(target, signal);
    signal.throwIfAborted();
    const data = new ProtocolRoomData();
    data.record = record;
    data.snapshot = snapshot;
    return data;
  }
}
