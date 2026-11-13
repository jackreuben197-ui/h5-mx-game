import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
export class SecondPcsData extends EventSource {
 static readonly CHANGE='second-pcs:change';
 @observable(SecondPcsData.CHANGE) state={active:false,participantSeatIds:[] as number[],deadline:0,votes:{} as Record<number,boolean>,pending:false,status:0};
 start(participantSeatIds:number[],deadline:number):void {this.state={active:true,participantSeatIds,deadline,votes:{},pending:false,status:0};}
 vote(seatId:number,result:boolean):void {this.state={...this.state,votes:{...this.state.votes,[seatId]:result}};}
 requestResult(status:number):void {this.state={...this.state,status,pending:status===0};}
 finish():void {this.state={active:false,participantSeatIds:[],deadline:0,votes:{},pending:false,status:0};}
}
