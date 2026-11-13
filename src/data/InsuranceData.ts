import type { Operator, InsurancePotInvalid, PotInsuranceBuy } from '@silenthill/agreement-web';
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
export interface InsuranceState {operator?:Operator.AsObject;round:number;invalidPots:InsurancePotInvalid.AsObject[];status:number;}
export class InsuranceData extends EventSource {
 static readonly CHANGE='insurance:change';
 static readonly NOTICE='insurance:notice';
 @observable(InsuranceData.CHANGE) state:InsuranceState={round:0,invalidPots:[],status:0};
 purchases=new Map<number,{round:number;buyList:PotInsuranceBuy.AsObject[]}>();
 start(operator:Operator.AsObject|undefined,round:number,invalidPots:InsurancePotInvalid.AsObject[]=[]):void {this.state={operator,round,invalidPots,status:0};}
 finish(status=0):void {this.state={...this.state,operator:undefined,status};}
 clear():void {this.purchases.clear();this.state={round:0,invalidPots:[],status:0};}
}
