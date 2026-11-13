import type { InsurancePotLimit, PotInsuranceBuy } from '@silenthill/agreement-web';
import { InsuranceRules, PoolType } from './InsuranceRules.js';
const preference=[PoolType.ALL,PoolType.HALF,PoolType.THIRD,PoolType.FIFTH,PoolType.EIGHTH,PoolType.MIN_MONEY];
/** One draft per pot; switching tabs never commits or resets another pot. */
export class InsuranceChoices {
 private selected=new Map<number,PoolType>();
 constructor(private rules:InsuranceRules,private pots:InsurancePotLimit.AsObject[]){}
 enabled(pot:InsurancePotLimit.AsObject,type:PoolType):boolean {
  if(!this.rules._canPayFromPoolType(pot,type))return false;
  const minimum=this.rules.round===this.rules.flopRound?this.rules._ratioToPool(this.rules.forceBuyRatio):PoolType.NONE;
  return minimum===PoolType.NONE||type===PoolType.MIN_MONEY||type<=minimum;
 }
 get(pot:InsurancePotLimit.AsObject):PoolType {
  const saved=this.selected.get(pot.potId);
  return saved!==undefined&&this.enabled(pot,saved)?saved:preference.find(type=>this.enabled(pot,type))??PoolType.NONE;
 }
 select(pot:InsurancePotLimit.AsObject,type:PoolType):void{if(this.enabled(pot,type))this.selected.set(pot.potId,type);}
 purchases(buy:boolean):PotInsuranceBuy.AsObject[]{
  const force=!buy&&this.rules.round===this.rules.flopRound&&this.rules.forceBuyRatio>0;
  if(!buy&&!force)return [];
  return this.pots.flatMap(pot=>{
   const type=this.get(pot),{overOuts}=this.rules._splitOuts(pot);this.rules._sortCards(overOuts);
   const amount=force?pot.min:this.rules._overOutsPay(pot,type);
   if(!force&&(type===PoolType.NONE||!overOuts.length||amount<=0))return [];
   return [{potId:pot.potId,round:this.rules.round as PotInsuranceBuy.AsObject['round'],activeAmount:Math.max(amount,pot.min),activeOutsList:overOuts,passiveAmount:0,passiveOutsList:[],insurEv:0}];
  });
 }
}
