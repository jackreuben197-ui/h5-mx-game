import { GameplayTableSettingData } from './GameplayTableSettingData.js';
import { TexasGameRoomDataEmoji } from './TexasGameRoomDataEmoji.js';
import TexasGameRoomDataReport from './TexasGameRoomDataReport.js';
import { TexasGameRoomDataReplay } from './TexasGameRoomDataReplay.js';
import { SettlementWatchData } from './SettlementWatchData.js';
import type { Settlement } from '../core/Settlement.js';
import type {
  RoomRecord,
  ServerMessageEnterRoom,
  ServerMessageSyncEnter,
} from '@silenthill/agreement-web';
/** Preserve full authority for subsequent protocol migrations; UI gets normalized data only. */
export class ProtocolRoomData {
  readonly tableSettings = new GameplayTableSettingData();
  readonly emoji = new TexasGameRoomDataEmoji();
  readonly report = new TexasGameRoomDataReport(this);
  readonly replay = new TexasGameRoomDataReplay();
  readonly watch = new SettlementWatchData();
  record?: RoomRecord.AsObject;
  snapshot?: (ServerMessageEnterRoom.AsObject | ServerMessageSyncEnter.AsObject) & { settlement?: Settlement };
  clear(): void {
    this.tableSettings.clearData();
    this.emoji.clearData();
    this.report.clear();
    this.replay.clearData();
    this.watch.clear();
    this.record = undefined;
    this.snapshot = undefined;
  }
}
