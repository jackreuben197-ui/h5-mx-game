import { SquidData } from './SquidData.js';
import { SecondPcsData } from './SecondPcsData.js';
import { InsuranceData } from './InsuranceData.js';
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
  readonly squid = new SquidData();
  readonly secondPcs = new SecondPcsData();
  readonly insurance = new InsuranceData();
  readonly watch = new SettlementWatchData();
  record?: RoomRecord.AsObject;
  snapshot?: (ServerMessageEnterRoom.AsObject | ServerMessageSyncEnter.AsObject) & { settlement?: Settlement };
  /** Restore only authoritative special operators after EnterRoom/SyncEnter. */
  restoreSpecialOperations(flopRound: number, turnRound: number): void {
    this.secondPcs.finish();
    this.insurance.clear();
    const s = this.snapshot;
    if (!s) return;
    this.squid.totalLimit=s.roomInfo?.squidTotalLimit??0;
    this.squid.restore(!!s.handInfo?.inSquid,s.playersList.find(p=>p.seatId===s.myInfo?.seatId));
    for (const op of s.operatorList) {
      if (!op.opDeadline && op.leftOpTime > 0) op.opDeadline = Date.now() / 1000 + op.leftOpTime;
    }
    const mine = s.operatorList.find(op => op.seatId === s.myInfo?.seatId);
    if (mine?.isAgreeSecondPc)
      this.secondPcs.start(s.operatorList.filter(op => op.isAgreeSecondPc).map(op => op.seatId), mine.opDeadline);
    if (mine?.isInsurance)
      this.insurance.start(mine, (s.handInfo?.publicCardsList.length ?? 0) >= 4 ? turnRound : flopRound, mine.invalidInsurancePotsList);
  }
  clear(): void {
    this.tableSettings.clearData();
    this.emoji.clearData();
    this.report.clear();
    this.replay.clearData();
    this.watch.clear();
    this.squid.clear();
    this.secondPcs.finish();
    this.insurance.clear();
    this.record = undefined;
    this.snapshot = undefined;
  }
}
