import type { ServerMessageWinner } from '@silenthill/agreement-web';
import type { SquidResult } from '../../../data/SquidData.js';
import { SettlementMapper } from '../../../logic/SettlementMapper.js';
import { MessageContext } from '../MessageContext.js';
export function Winner(body: ServerMessageWinner.AsObject, context: MessageContext): boolean {
  if (body.handNum !== context.state.handInfo?.handNum) return false;
  context.data.secondPcs.finish();
  context.data.insurance.finish();
  context.state.gameStatus = context.pb.Def.GameStatus.HAND_END;
  context.state.operatorList = [];
  const squidResults:SquidResult[]=[];
  for (const result of body.resultsList) {
    const player = context.state.playersList.find((p) => p.seatId === result.seatId);
    if (!player || result.standUp) continue;
    player.action = context.pb.Def.Action.NONE;
    player.chip = result.chip;
    player.deposit = result.deposit;
    player.squidCount=result.squidCount;player.squidEscaped=result.squidEscaped;
    const ehc=result.ehcsList.find(v=>v.ehcType===context.pb.Def.EHCType.EHC_SQUID);
    if(ehc){let rate=0;for(const cfg of context.data.record?.squidCountRateList??[])if(result.squidCount>=cfg.count)rate=cfg.rate;
      squidResults.push({userID:player.userRid,nick:player.name,avatar:player.avatar,money:ehc.pb_in-ehc.out,squidNum:result.squidCount,rate:Math.max(0,rate),isPunish:false});}
    player.cardsList = [...result.myCardsList];
  }
  if(squidResults.length){
    for(const v of body.pools?.squidDetailsList??[])squidResults.push({userID:v.userRid,nick:v.name,avatar:v.avatar,money:v.punishFee,squidNum:0,rate:0,isPunish:true});
    context.data.squid.finish(squidResults);
    if(context.state.handInfo)context.state.handInfo.inSquid=false;
  }
  context.state.settlement = new SettlementMapper().map(body.handNum, body.resultsList,
    context.state.myInfo?.seatId ?? 0, new Set(context.state.playersList.map(p => p.seatId)));
  context.data.report.applyWinnerResult(body, context.pb.Def.EHCType.EHC_MUSHROOM);
  const room=context.data.record,seat=context.state.myInfo?.seatId??0;
  const mineResult=body.resultsList.find(result=>result.seatId===seat);
  if(mineResult&&!mineResult.standUp&&context.state.myInfo){
    Object.assign(context.state.myInfo,{totalChips:mineResult.totalChips,storeChips:mineResult.storeChips,callTimeCount:mineResult.callTimeCount,callTimeStay:mineResult.callTimeStay});
    context.data.callTime.update(mineResult.callTimeCount,mineResult.callTimeStay);
  }
  const eligible=!seat || (!!mineResult&&!mineResult.standUp);
  const watch=context.data.watch;
  watch.clear();watch.handNum=body.handNum;
  // Permission is completed by the host after settlement, once the current H5 config is available.
  watch.peek=!context.data.mtt && eligible && (room?.viewPlayerCards??0)!==0;
  watch.reveal=!context.data.mtt && eligible && (context.state.handInfo?.publicCardsList.length??0)<5;
  watch.revealRound=Number(body.round)||0;
  context.data.mtt?.handleHandEnd();
  return true;
}
