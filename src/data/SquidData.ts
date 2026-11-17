import type { Player, RoomRecord, RoomInfo } from '@silenthill/agreement-web';
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
export interface SquidResult {userID:number;nick:string;avatar:string;money:number;squidNum:number;rate:number;isPunish:boolean;}
/** CC squid state is independent of individual hand cleanup. */
export class SquidData extends EventSource {
 static readonly CHANGE='squid:change';
 @observable(SquidData.CHANGE) state={enabled:false,remaining:0,showJoin:false,seat:0,mode:0,base:0,round:0,start:0,resultSerial:0,results:[] as SquidResult[],notice:'',noticeSerial:0};
 showJoin=false;
 totalLimit=0;
 restore(enabled:boolean,mine?:Player.AsObject):void {this.showJoin=enabled&&!!mine&&!mine.inSquid;this.state={...this.state,enabled,start:0,results:[],notice:'',noticeSerial:0};}
 start(enabled:boolean):void {this.state={...this.state,enabled,start:this.state.start+Number(enabled&&!this.state.enabled),results:[],notice:'',noticeSerial:0};}
 finish(results:SquidResult[]):void {this.showJoin=false;this.state={...this.state,enabled:false,results,resultSerial:this.state.resultSerial+1};}
 refresh(record:RoomRecord.AsObject,info:RoomInfo.AsObject|undefined,players:Player.AsObject[],seat:number,round:number):void {
  const joined=players.filter(p=>p.inSquid),marked=joined.reduce((n,p)=>n+p.squidCount,0);
  const total=record.squidMode===1?this.totalLimit+Number(!!record.squidTail):Math.max(0,joined.length-1)+Number(!!record.squidHead)+Number(!!record.squidTail);
  const next={...this.state,remaining:Math.max(0,total-marked),showJoin:this.state.enabled&&seat>0&&this.showJoin,seat,mode:record.squidMode,base:info?.squidBase??0,round};
  if(JSON.stringify(next)!==JSON.stringify(this.state))this.state=next;
 }
 clear():void {this.showJoin=false;this.totalLimit=0;this.state={enabled:false,remaining:0,showJoin:false,seat:0,mode:0,base:0,round:0,start:0,resultSerial:0,results:[],notice:'',noticeSerial:0};}
}
