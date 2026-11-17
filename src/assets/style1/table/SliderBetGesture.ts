/** A release bet requires a completed drag belonging to the current betting turn. */
export class SliderBetGesture {
  private drag?: {pointer: number; turn: string; start: string; moved: boolean};
  begin(pointer:number,turn:string,value:string):boolean {
    if(this.drag)return false;
    this.drag={pointer,turn,start:value,moved:false};return true;
  }
  move(pointer:number):void {if(this.drag?.pointer===pointer)this.drag.moved=true;}
  cancel():void {this.drag=undefined;}
  finish(pointer:number,turn:string,value:string):boolean {
    const drag=this.drag;
    if(drag?.pointer!==pointer)return false;
    this.cancel();
    return !!drag.moved&&drag.turn===turn&&drag.start!==value;
  }
}
