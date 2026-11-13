import type { HandInfo } from '@silenthill/agreement-web';
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
/** CC SeatsStateManager.setMushroomPoolChange; hand clear does not move the pool. */
export class MushroomData extends EventSource {
  static readonly CHANGE='mushroom:change';
  @observable(MushroomData.CHANGE) state={seat:0,previousSeat:0,pool:0,count:0,serial:0,animate:false};
  update(hand:HandInfo.AsObject|undefined,base:number,animate:boolean):void {
    const pool=hand?.pools?.mushroomPool??0;
    // CC ignores zero-pool notifications; the marker survives ordinary hand cleanup.
    if(pool<=0||base<=0)return;
    this.state={seat:hand!.buSeatId,previousSeat:animate?this.state.seat:0,pool,
      count:Math.floor(Math.round(pool*1000/base)/1000),serial:this.state.serial+1,animate};
  }
  clear():void {this.state={seat:0,previousSeat:0,pool:0,count:0,serial:this.state.serial+1,animate:false};}
}
