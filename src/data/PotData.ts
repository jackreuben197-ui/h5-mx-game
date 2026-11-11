import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
export class PotData extends EventSource {
  static readonly CHANGE = 'pot:change';
  @observable(PotData.CHANGE) amount = 0;
  static readonly FORMAT = "pot:format";
  @observable(PotData.FORMAT) format = { smallBlind: 0, showBB: false };
  static readonly POOLS = "pot:pools";
  @observable(PotData.POOLS) pools: readonly number[] = [];
}
