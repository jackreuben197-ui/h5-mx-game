import { SeatData } from './SeatData.js';
import type { TableSnapshot } from '../core/types.js';
export class SeatsData {
  private seats = new Map<number, SeatData>();
  get(id: number): SeatData {
    let seat = this.seats.get(id);
    if (!seat) this.seats.set(id, (seat = new SeatData(id)));
    return seat;
  }
  replace(table: TableSnapshot): void {
    for (let id = 1; id <= table.seatCount; id++) this.get(id).replace(table);
  }
  destroy(): void {
    this.seats.forEach((s) => s.clear());
    this.seats.clear();
  }
}
