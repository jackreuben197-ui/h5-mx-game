import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { TableSnapshot } from '../core/types.js';
export class TableInfoData extends EventSource {
  static readonly CHANGE = 'table:change';
  @observable(TableInfoData.CHANGE) snapshot: TableSnapshot | null = null;
}
