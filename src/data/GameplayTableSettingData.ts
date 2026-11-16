import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import { GameplayTableSettingBasic, type TableSettingBasic } from '../logic/GameplayTableSettingBasic.js';
import type { RoomRecord, RoomInfo, HandInfo } from '@silenthill/agreement-web';
/** Owned by one room; no global UI events. Equal metadata does not notify on every hand action. */
export class GameplayTableSettingData extends EventSource {
  newLabels?:import('../logic/TableSettingNewLabels.js').TableSettingNewLabels;
  static readonly LABELS_CHANGED='table-settings:labels';
  static readonly BASIC_CHANGED = 'table-settings:basic';
  static readonly PERMISSIONS_CHANGED = 'table-settings:permissions';
  @observable(GameplayTableSettingData.BASIC_CHANGED) basicInfo?: TableSettingBasic;
  @observable(GameplayTableSettingData.PERMISSIONS_CHANGED) roomPermissions: Record<string,number> = {};
  private fingerprint = '';
  update(record?: RoomRecord.AsObject, info?: RoomInfo.AsObject, hand?: HandInfo.AsObject): void {
    if (!record || !info) return;
    const basic = GameplayTableSettingBasic.from(record,info,hand), next = JSON.stringify(basic);
    if (next === this.fingerprint) return;
    this.fingerprint = next; this.basicInfo = basic;
  }
  clearData(): void { this.newLabels=undefined; this.fingerprint=''; this.basicInfo=undefined; this.roomPermissions={}; }
}
