import { TableData } from '../data/TableData.js';
import type { TableSnapshot } from '../core/types.js';
/** Presentation boundary; another UI may bind the same model classes. */
export class TablePresenter {
  constructor(readonly data: TableData) {}
  present(snapshot: TableSnapshot): void {
    this.data.replace(snapshot);
  }
  restore(): void {
    const snapshot = this.data.info.snapshot;
    if (snapshot) this.present({ ...snapshot, presentation: 'sync' });
  }
}
