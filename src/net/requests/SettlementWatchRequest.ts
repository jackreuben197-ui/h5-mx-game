import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { ProtocolClient } from '../ProtocolClient.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';

/** CC TexasTableEvent.ViewPlayerCardsNum / ViewPlayerCards / ShowPublicCards. */
export class SettlementWatchRequest {
  constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
  private room(target: RoomTarget) {
    const room=new this.pb.Room();room.setRoomId(target.roomID);room.setMatchId(target.matchID);return room;
  }
  async peekTimes(target: RoomTarget, signal: AbortSignal): Promise<number> {
    const body=new this.pb.ClientMessageViewPlayerCardsNum();body.setRoom(this.room(target));
    const response=await this.client.request(this.pb.Code.MSG_D_VIEW_PLAYER_CARDS_NUM,target.roomID,target.matchID,body,this.pb.ServerMessageViewPlayerCardsNum,signal);
    if(response.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(response.status)||`看牌次数查询失败（${response.status}）`);
    return Number(response.payTimes)||0;
  }
  async peek(target: RoomTarget, signal: AbortSignal): Promise<void> {
    const body=new this.pb.ClientMessageViewPlayerCards();body.setRoom(this.room(target));body.setTargetSeatId(0);body.setTargetUserRid(0);
    const response=await this.client.request(this.pb.Code.MSG_D_VIEW_PLAYER_CARDS,target.roomID,target.matchID,body,this.pb.ServerMessageViewPlayerCards,signal);
    if(response.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(response.status)||`偷偷看失败（${response.status}）`);
  }
  async reveal(target: RoomTarget, round: number, signal: AbortSignal) {
    const body=new this.pb.ClientMessageShowPublicCards();body.setRoom(this.room(target));body.setRound(round as Parameters<typeof body.setRound>[0]);body.setConsume(this.pb.Def.ConsumeType.CT_VC_2);
    const response=await this.client.request(this.pb.Code.MSG_D_SHOW_PUBLIC_CARDS,target.roomID,target.matchID,body,this.pb.ServerMessageShowPublicCards,signal);
    if(response.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(response.status)||`发发看失败（${response.status}）`);
    return response;
  }
}
