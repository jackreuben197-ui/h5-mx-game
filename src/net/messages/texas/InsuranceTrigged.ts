import { InsuranceData } from '../../../data/InsuranceData.js';
import { i18nMgr } from '../../../i18n/i18nMgr.js';
import type { ServerMessageInsuranceTrigged } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function InsuranceTrigged(body:ServerMessageInsuranceTrigged.AsObject,context:MessageContext):boolean {
 if (!body.operatorList.length) {
   const mine=context.state.playersList.find(p=>p.seatId===context.state.myInfo?.seatId);
   if (!mine || mine.action===context.pb.Def.Action.FOLD) return false;
   const reasons=context.pb.Def.IIReason;
   if (!body.invalidPotsList.length) context.data.insurance.emit(InsuranceData.NOTICE,i18nMgr.Get('Purchase_insurance'));
   for (const pot of body.invalidPotsList) {
     const prefix=`${i18nMgr.Get('adaptation20005')}${pot.potId+1}:`;
     const message=pot.reason===reasons.IIR_ZERO_OUTS||pot.reason===reasons.IIR_NO_ODDS_FOUND ? prefix+i18nMgr.Get('adaptation20017')
       : pot.reason===reasons.IIR_NO_ODDS_TABLE_FOUND||pot.reason===reasons.IIR_LEADER_LIMIT ? prefix+i18nMgr.Get('UIInsuranceReasonTips2')
       : pot.reason===reasons.IIR_EV_LIMIT ? i18nMgr.Get('UIEVInsuranceTips5') : i18nMgr.Get('Purchase_insurance');
     context.data.insurance.emit(InsuranceData.NOTICE,message);
   }
   return false;
 }
 for (const op of body.operatorList) {op.isInsurance=true;if (!op.opDeadline) op.opDeadline=Date.now()/1000+op.leftOpTime;}
 context.state.operatorList=body.operatorList;
 const mine=body.operatorList.find(op=>op.seatId===context.state.myInfo?.seatId);
 context.data.insurance.start(mine,body.round,mine?.invalidInsurancePotsList.length?mine.invalidInsurancePotsList:body.invalidPotsList);return true;
}
