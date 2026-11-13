import {EventSource} from '../binding/EventSource.js';
import {observable} from '../binding/observable.js';
export class CallTimeData extends EventSource {
  static readonly CHANGE='calltime:change';
  @observable(CallTimeData.CHANGE) state={count:0,stay:false};
  update(count:number,stay:boolean):void{if(count!==this.state.count||stay!==this.state.stay)this.state={count,stay};}
  clear():void{this.update(0,false);}
}
