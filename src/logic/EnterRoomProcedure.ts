import TexasGameRoomDataMtt from '../data/TexasGameRoomDataMtt.js';
import { resolveTemplateTextByKey } from '../i18n/resolveTemplateTextByKey.js';
import type { RoomTarget } from '../core/types.js';
import { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import { ProtocolClient } from '../net/ProtocolClient.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
import { RoomsRequest } from '../net/requests/RoomsRequest.js';
import { EnterRoomRequest } from '../net/requests/EnterRoomRequest.js';
import { RoomEntryPolicy } from './RoomEntryPolicy.js';
/** CC TexasGameplayEntrance: Rooms -> checkCanEnter -> EnterRoom -> authoritative snapshot. */
export class EnterRoomProcedure {
  constructor(
    private client: ProtocolClient,
    private pb: HoldemRuntime,
  ) {}
  async run(target: RoomTarget, signal: AbortSignal): Promise<ProtocolRoomData> {
    if (target.matchID > 0) return this.enterMtt(target, signal);
    const record = await new RoomsRequest(this.client, this.pb).execute(target.roomID, signal);
    signal.throwIfAborted();
    new RoomEntryPolicy().check(target, record);
    const snapshot = await new EnterRoomRequest(this.client, this.pb).execute(target, signal);
    signal.throwIfAborted();
    const data = new ProtocolRoomData();
    data.record=record;data.snapshot=snapshot;return data;
  }
  private async enterMtt(target: RoomTarget, signal: AbortSignal): Promise<ProtocolRoomData> {
    const request=new this.pb.ClientMessageMttDetail(),rpcID=this.client.nextRpcID();
    request.setMatchId(target.matchID);request.setRpcId(rpcID);
    const details=await this.client.request(this.pb.Code.MSG_R_MTT_DETAIL,0,0,request,this.pb.ServerMessageMttDetail,signal,rpcID);
    if(details.status!==0||!details.mtt)throw new Error(`赛事详情获取失败（${details.status}）`);
    if(!target.observer&&details.stateCode!==4)throw new Error('请从赛事详情完成报名或重购后进入');
    const mtt=details.mtt;
    if(![0,1,2,3].includes(mtt.gameType)||![0,2].includes(mtt.pokerType)||mtt.seatCount<2||mtt.seatCount>9)throw new Error('当前赛事玩法尚未支持');
    const name=await resolveTemplateTextByKey(mtt.name);signal.throwIfAborted();
    const data=new ProtocolRoomData();
    data.snapshot=await new EnterRoomRequest(this.client,this.pb).execute(target,signal);signal.throwIfAborted();
    data.record={...new this.pb.RoomRecord().toObject(),rid:target.roomID,name,roomType:mtt.type,
      antiCheatType:mtt.antiCheatType,antiCheatTimelimit:mtt.antiCheatTimelimit,antiCheatVideoType:mtt.antiCheatVideoType,antiCheatOrderType:mtt.antiCheatOrderType,videoVerifyType:mtt.videoVerifyType,
      gameType:mtt.gameType,pokerType:mtt.pokerType,limitBetType:mtt.limitBetType,seatCount:mtt.seatCount,
      limitDelayTimes:mtt.limitDelayTimes,delayViewCardOn:mtt.delayViewCardOn,
      clubId:target.clubID||mtt.clubId,tribeId:mtt.tribeId,originType:mtt.originType,goldType:mtt.goldType};
    data.mtt=new TexasGameRoomDataMtt(data,this.pb);
    data.mtt.initialize(!!target.observer,name,mtt.startTime,mtt.applyFeePool+mtt.applyFeeService,mtt.delayTimeType);
    data.mtt.applySnapshot(data.snapshot.mttInfo,data.snapshot.mttProgress,data.snapshot.myInfo);
    data.mtt.syncHandState(data.snapshot.gameStatus);return data;
  }
}
