import type { BuyInWallet } from '../../core/Seating.js';
import { HttpClient } from './HttpClient.js';
/** CC WebUserRoomBringin: read the already-bound wallet; this does not buy in. */
export class RoomWalletRequest {
  constructor(private http: HttpClient) {}
  execute(roomID: number, signal: AbortSignal): Promise<BuyInWallet> {
    if (!Number.isSafeInteger(roomID) || roomID <= 0) throw new Error('房间 ID 无效');
    return this.http.request(`/api/user/room/bringin/${roomID}`, {}, { signal });
  }
}
