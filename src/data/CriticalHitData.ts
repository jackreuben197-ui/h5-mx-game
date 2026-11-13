import type { HandInfo } from '@silenthill/agreement-web';
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
export class CriticalHitData extends EventSource {
  static readonly CHANGE='critical-hit:change';
  @observable(CriticalHitData.CHANGE) state={enabled:false,round:0,start:0};
  update(hand:HandInfo.AsObject|undefined,animate:boolean):void {
    const enabled=!!hand?.criticalHitOpen;
    this.state={enabled,round:hand?.conRounds??0,start:animate?this.state.start+Number(enabled&&!this.state.enabled):0};
  }
  clear():void {this.state={enabled:false,round:0,start:0};}
}
