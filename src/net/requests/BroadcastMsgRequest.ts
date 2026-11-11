import type { RoomTarget } from '../../core/types.js';
import type { HoldemRuntime } from '../ProtocolRuntime.js';
import type { ProtocolClient } from '../ProtocolClient.js';
import type { HostSessionData } from '../../data/HostSessionData.js';
import type { UserPropData } from '../../data/UserPropData.js';
import { BroadcastCode } from '../../logic/BroadcastCode.js';
import { EmojiPropRules } from '../../logic/EmojiPropRules.js';
/** CC TexasTableEvent.SendEmoji / _sendExpressionBroadcast, through H5 bridge. */
export class BroadcastMsgRequest {
    constructor(private client: ProtocolClient, private pb: HoldemRuntime) {}
    execute(target: RoomTarget, signal: AbortSignal, session: HostSessionData, prop: UserPropData, type: number) {
        const msgType = this.pb.Def.BroadcastMsgType.BC_MSG_EMOJI;
        const inner = JSON.stringify({ name: session.nickname, type, user_id: session.userRID, target_user_id: 0, message: '', msgType, time: Date.now(), sex: session.sex, headUrl: session.avatar });
        const room = new this.pb.Room(); room.setRoomId(target.roomID); room.setMatchId(target.matchID);
        const body = new this.pb.ClientMessageBroadcastMsg(); body.setRoom(room);
        body.setConsume(EmojiPropRules.isPropFree(prop) ? this.pb.Def.ConsumeType.CT_NONE : prop.priceID as Parameters<typeof body.setConsume>[0]);
        body.setMessage(''); body.setExtra(new TextEncoder().encode(JSON.stringify({code: BroadcastCode.BroadcastMsg, data: inner}))); body.setMsgType(msgType);
        return this.client.request(this.pb.Code.MSG_D_BROADCAST_MSG, target.roomID, target.matchID, body, this.pb.ServerMessageBroadcastMsg, signal);
    }
}
