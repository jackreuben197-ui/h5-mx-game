import { InsuranceData } from '../../../data/InsuranceData.js';
import { i18nMgr } from '../../../i18n/i18nMgr.js';
import { StringHelper } from '../../../logic/StringHelper.js';
import type { ServerMessageBuyInsurance } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function BuyInsurance(body:ServerMessageBuyInsurance.AsObject,context:MessageContext):boolean {
 if (!context.state.playersList.some(p=>p.seatId===body.seatId)) return false;
 if (body.seatId===context.state.myInfo?.seatId) for (const buy of body.buyList) if (buy.passiveAmount>0)
   context.data.insurance.emit(InsuranceData.NOTICE,i18nMgr.Get('adaptation20053').replace('##',StringHelper.GetLongString(buy.passiveAmount)));
 context.data.insurance.purchases.set(body.seatId,{round:body.round,buyList:body.buyList});
 context.state.operatorList=context.state.operatorList.filter(op=>op.seatId!==body.seatId||!op.isInsurance);
 if(body.seatId===context.state.myInfo?.seatId)context.data.insurance.finish();return true;
}
