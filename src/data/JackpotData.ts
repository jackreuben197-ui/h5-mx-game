import type {RoomRecord,ServerMessageJackpotAward} from '@silenthill/agreement-web';
import {EventSource} from '../binding/EventSource.js';
import {observable} from '../binding/observable.js';
export class JackpotData extends EventSource {
  static readonly CHANGE='jackpot:change';static readonly AWARD='jackpot:award';
  @observable(JackpotData.CHANGE) state={enabled:false,id:0,gold:0,parentGold:0,start:0,rolling:false};
  restore(record:RoomRecord.AsObject|undefined):void {this.state={enabled:record?.jackpot===1,id:record?.jackpotId??0,gold:record?.jackpotGold??0,parentGold:record?.jackpotParentGold??0,start:0,rolling:false};}
  update(id:number,gold:number,parentGold:number):void {this.state={...this.state,id,gold,parentGold,rolling:true};}
  start():void {this.state={...this.state,start:this.state.start+1,rolling:false};}
  award(users:ServerMessageJackpotAward.AsObject['awardUsersList']):void {if(users.length)this.emit(JackpotData.AWARD,users);}
  get enabled():boolean{return this.state.enabled&&this.state.id>0;}
  get displayPool():number{return this.state.parentGold||this.state.gold||0;}
  clear():void {this.restore(undefined);}
}
