import { SquidIn } from './SquidIn.js';
import { SquidInActive } from './SquidInActive.js';
import { NextChange } from './NextChange.js';
import { RoomInsurance } from './RoomInsurance.js';
import { InsuranceOutsCards } from './InsuranceOutsCards.js';
import { BuyInsuranceActive } from './BuyInsuranceActive.js';
import { BuyInsurance } from './BuyInsurance.js';
import { InsuranceTrigged } from './InsuranceTrigged.js';
import { AgreeSecondPcsActive } from './AgreeSecondPcsActive.js';
import { AgreeSecondPcs } from './AgreeSecondPcs.js';
import { AgreeSecondPcsTrigged } from './AgreeSecondPcsTrigged.js';
import { BroadcastMsg } from './BroadcastMsg.js';
import { GetMsg } from './GetMsg.js';
import { PublicReplay } from './PublicReplay.js';
import { PlayerJackpotSummary } from './PlayerJackpotSummary.js';
import { Roomers } from './Roomers.js';
import type { HoldemRuntime } from '../../ProtocolRuntime.js';
import type { Packet } from '../../PacketCodec.js';
import { MessageContext } from '../MessageContext.js';
import { BringIn } from './BringIn.js';
import { StoreChips } from './StoreChips.js';
import { Seated } from './Seated.js';
import { Showcards } from './Showcards.js';
import { ShowViewCards } from './ShowViewCards.js';
import { SeatedOthers } from './SeatedOthers.js';
import { StartInfo } from './StartInfo.js';
import { PublicCards } from './PublicCards.js';
import { SidePots } from './SidePots.js';
import { ChipsChange } from './ChipsChange.js';
import { ActionAll } from './ActionAll.js';
import { AutoOp } from './AutoOp.js';
import { Standup } from './Standup.js';
import { KeepSeat } from './KeepSeat.js';
import { Winner } from './Winner.js';
import { AddTimeOthers } from './AddTimeOthers.js';
import { AddTime } from './AddTime.js';
import { PostStatusChange } from './PostStatusChange.js';
import { HandClear } from './HandClear.js';
import { RoomUserSendDiamond } from './RoomUserSendDiamond.js';
/** CC TexasMessageHandler switch layout. Decode, call the named message, update data. */
export class TexasMessageHandler {
  constructor(private pb: HoldemRuntime) {}
  accepts(code: number): boolean {
    const { Code } = this.pb;
    switch (code) {
      case Code.MSG_S_SQUID_IN:
      case Code.MSG_D_SQUID_IN_ACTIVE:
      case Code.MSG_S_NEXT_CHANGE:

      case Code.MSG_D_ROOM_INSURANCE:
      case Code.MSG_S_INSURANCE_OUTS_CARDS:
      case Code.MSG_D_BUY_INSURANCE_ACTIVE:
      case Code.MSG_S_BUY_INSURANCE:
      case Code.MSG_S_INSURANCE_TRIGGED:
      case Code.MSG_D_AGREE_SECOND_PCS_ACTIVE:
      case Code.MSG_S_AGREE_SECOND_PCS:
      case Code.MSG_S_AGREE_SECOND_PCS_TRIGGED:
      case Code.MSG_D_BROADCAST_MSG:
      case Code.MSG_S_GET_MSG:
      case Code.MSG_D_ROOMERS:
      case Code.MSG_D_PUBLIC_REPLAY:
      case Code.MSG_D_PLAYER_JACKPOT_SUMMARY:
      case Code.MSG_D_BRING_IN:
      case Code.MSG_D_STORE_CHIPS:
      case Code.MSG_D_SEATED:
      case Code.MSG_S_SHOWCARDS:
      case Code.MSG_S_SHOW_VIEW_CARDS:
      case Code.MSG_S_SEATED_OTHERS:
      case Code.MSG_S_START_INFO:
      case Code.MSG_S_PUBLIC_CARDS:
      case Code.MSG_S_SIDE_POTS:
      case Code.MSG_S_CHIPS_CHANGE:
      case Code.MSG_S_ACTION_ALL:
      case Code.MSG_S_AUTO_OP:
      case Code.MSG_S_STANDUP:
      case Code.MSG_S_KEEP_SEAT:
      case Code.MSG_S_WINNER:
      case Code.MSG_S_ADD_TIME_OTHERS:
      case Code.MSG_D_ADD_TIME:
      case Code.MSG_D_AGREE_POST:
      case Code.MSG_S_POST_STATUS_CHANGE:
      case Code.MSG_S_HAND_CLEAR:
      case Code.MSG_S_ROOM_USER_SEND_DIAMOND:
        return true;
      default:
        return false;
    }
  }
  dispatch(packet: Packet, context: MessageContext): boolean {
    const pb = this.pb, { Code } = pb;
    switch (packet.code) {
      case Code.MSG_S_SQUID_IN: return SquidIn(pb.ServerMessageSquidIn.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_D_SQUID_IN_ACTIVE: return SquidInActive(pb.ServerMessageSquidInActive.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_S_NEXT_CHANGE: return NextChange(pb.ServerMessageNextChange.deserializeBinary(packet.body).toObject(),context);

      case Code.MSG_D_ROOM_INSURANCE:
        return RoomInsurance(pb.ServerMessageRoomInsurance.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_S_INSURANCE_OUTS_CARDS:
        return InsuranceOutsCards(pb.ServerMessageInsuranceOutsCards.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_D_BUY_INSURANCE_ACTIVE:
        return BuyInsuranceActive(pb.ServerMessageBuyInsuranceActive.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_S_BUY_INSURANCE:
        return BuyInsurance(pb.ServerMessageBuyInsurance.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_S_INSURANCE_TRIGGED:
        return InsuranceTrigged(pb.ServerMessageInsuranceTrigged.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_D_AGREE_SECOND_PCS_ACTIVE:
        return AgreeSecondPcsActive(pb.ServerMessageAgreeSecondPcsActive.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_S_AGREE_SECOND_PCS:
        return AgreeSecondPcs(pb.ServerMessageAgreeSecondPcs.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_S_AGREE_SECOND_PCS_TRIGGED:
        return AgreeSecondPcsTrigged(pb.ServerMessageAgreeSecondPcsTrigged.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_D_BROADCAST_MSG:
        return BroadcastMsg(pb.ServerMessageBroadcastMsg.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_GET_MSG:
        return GetMsg(pb.ServerMessageGetMsg.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_D_ROOMERS:
        return Roomers(pb.ServerMessageRoomers.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_D_PUBLIC_REPLAY:
        return PublicReplay(pb.ServerMessagePublicReplay.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_D_PLAYER_JACKPOT_SUMMARY:
        return PlayerJackpotSummary(pb.ServerMessagePlayerJackpotSummary.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_D_BRING_IN:
        return BringIn(pb.ServerMessageBringIn.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_D_STORE_CHIPS:
        return StoreChips(pb.ServerMessageStoreChips.deserializeBinary(packet.body).toObject(),context);
      case Code.MSG_D_SEATED:
        return Seated(pb.ServerMessageSeated.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_SHOWCARDS:
        return Showcards(pb.ServerMessageShowcards.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_SHOW_VIEW_CARDS:
        return ShowViewCards(pb.ServerMessageShowViewCards.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_SEATED_OTHERS:
        return SeatedOthers(pb.ServerMessageSeatedOthers.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_START_INFO:
        return StartInfo(pb.ServerMessageStartInfo.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_PUBLIC_CARDS:
        return PublicCards(pb.ServerMessagePublicCards.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_SIDE_POTS:
        return SidePots(pb.ServerMessageSidePots.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_CHIPS_CHANGE:
        return ChipsChange(pb.ServerMessageChipsChange.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_ACTION_ALL:
        return ActionAll(pb.ServerMessageActionAll.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_AUTO_OP:
        return AutoOp(pb.ServerMessageAutoOp.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_STANDUP:
        return Standup(pb.ServerMessageStandup.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_KEEP_SEAT:
        return KeepSeat(pb.ServerMessageKeepSeat.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_WINNER:
        return Winner(pb.ServerMessageWinner.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_ADD_TIME_OTHERS:
        return AddTimeOthers(pb.ServerMessageAddTimeOthers.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_D_ADD_TIME:
        return AddTime(pb.ServerMessageAddTime.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_D_AGREE_POST: {
        const result=pb.ServerMessageAgreePost.deserializeBinary(packet.body);
        if(result.getStatus()!==0)throw new Error(`补盲失败（${result.getStatus()}）`);
        return false;
      }
      case Code.MSG_S_POST_STATUS_CHANGE:
        return PostStatusChange(pb.ServerMessagePostStatusChange.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_HAND_CLEAR:
        return HandClear(pb.ServerMessageHandClear.deserializeBinary(packet.body).toObject(), context);
      case Code.MSG_S_ROOM_USER_SEND_DIAMOND:
        return RoomUserSendDiamond(pb.ServerMessageRoomUserSendDiamond.deserializeBinary(packet.body).toObject(), context);
      default:
        return false;
    }
  }
}
