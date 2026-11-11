import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { BuyInQuote } from '../core/Seating.js';
export interface BuyInState {
  step: 'closed'|'loading'|'security'|'rules'|'amount'; quote?: BuyInQuote;
  amount: number; clubID: number; auto: boolean; busy: boolean; error: string;
}
export class BuyInData extends EventSource {
  static readonly CHANGE = 'buyin:change';
  @observable(BuyInData.CHANGE) state: BuyInState = {step:'closed',amount:0,clubID:0,auto:false,busy:false,error:''};
  update(change: Partial<BuyInState>) { this.state = {...this.state,...change}; }
}
