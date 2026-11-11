import { HttpClient } from './HttpClient.js';
import type { BuyInWallet } from '../../core/Seating.js';
/** CC HttpRoomBringOutProtocol + WebUserRoom. This query does not buy in. */
export interface RoomBringOut {
  wallet: BuyInWallet[]; return_table: boolean;
  last_bring_out?: { to_wallet: number; fee: number; club_id: number } | null;
}
export class RoomBringOutRequest {
  constructor(private http: HttpClient) {}
  execute(roomID: number, signal: AbortSignal): Promise<RoomBringOut> {
    return this.http.request(`/api/user/room/${roomID}`, {}, { signal });
  }
}
