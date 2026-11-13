import type { RoomRecord } from '@silenthill/agreement-web';
import type { RoomTarget } from '../core/types.js';
export class RoomEntryPolicy {
  check(target: RoomTarget, room: RoomRecord.AsObject): void {
    if (room.rid !== target.roomID) throw new Error('房间信息与请求不匹配');
    if (room.status >= 3) throw new Error('房间已关闭或结束');
    if (
      target.matchID !== 0 ||
      room.roomType >> 9 === 1 ||
      ![0, 1, 2, 3].includes(room.gameType) ||
      ![0, 2].includes(room.pokerType)
    )
      throw new Error('当前支持德州、奥马哈和6+现金桌');
    if (!Number.isInteger(room.seatCount) || room.seatCount < 2 || room.seatCount > 9)
      throw new Error(`房间座位数无效（${room.seatCount}）`);
    if (room.encryptCards > 0) throw new Error('加密牌房间尚未接入');
  }
}
