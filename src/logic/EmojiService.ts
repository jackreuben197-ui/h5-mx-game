import type { RoomEmojis } from '../core/RoomEmojis.js';
import type { RoomTarget } from '../core/types.js';
import type { UserPropData, ServerUserProp } from '../data/UserPropData.js';
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { HostSessionData } from '../data/HostSessionData.js';
import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { HttpClient } from '../net/http/HttpClient.js';
import type { ProtocolClient } from '../net/ProtocolClient.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
import { BroadcastMsgRequest } from '../net/requests/BroadcastMsgRequest.js';
import { EmojiPropRules } from './EmojiPropRules.js';
import MagicEmojiConfig from './MagicEmojiConfig.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import { GameplayChatPropType } from './GameplayChatPropType.js';
import { PropsID } from './BroadcastCode.js';
const throwCodes: Record<number, string> = {602:'kiss_Button',609:'money_Button',608:'boxing_Button',605:'touch_Button',600:'tomato_Button',610:'fish_Button',611:'baseball_Button',603:'good_Button',604:'cheers_Button',607:'chicken_Button',601:'flower_Button',606:'shark_Button'};
export class EmojiService implements RoomEmojis {
    readonly data;
    get userRID(): number { return this.session.userRID; }
    private loading?: Promise<void>;
    private loaded = false;
    private sending = false;
    constructor(private room: ProtocolRoomData, private target: RoomTarget, private session: HostSessionData, private client: ProtocolClient, private pb: HoldemRuntime, private http: HttpClient, private signal: AbortSignal, readonly config: GlobalConfigStore, private ready: () => boolean) { this.data = room.emoji; }
    seatForUser(userID: number): number | undefined { return this.room.snapshot?.playersList.find(p => p.userRid === userID && p.seatId > 0)?.seatId; }
    canSend(): boolean { return this.ready() && !this.signal.aborted && !!this.room.snapshot?.playersList.some(p => p.userRid === this.session.userRID && p.seatId > 0); }
    refresh(force = false): Promise<void> {
        if (this.loading) return this.loading;
        if (this.loaded && !force) return Promise.resolve();
        return this.loading = this.load().then(() => { this.loaded = true; }).finally(() => { this.loading = undefined; });
    }
    private async load(): Promise<void> {
        // CC UserStoreUtils.preparePropList: same combine API and ordering/filter arguments.
        const result = await this.http.request<{get_chat_shop_prop_list_resp?: {list?: ServerUserProp[]}}>('/api/misc/combine', {api_list: [62], get_chat_shop_prop_list_req: {prop_types: [1, 4], prop_type: 0, offset: 0, limit: 100, user_type: 0}}, {signal: this.signal});
        this.signal.throwIfAborted();
        this.data.propList = EmojiPropRules.map(result?.get_chat_shop_prop_list_resp?.list ?? []);
    }
    async send(prop: UserPropData): Promise<void> {
        if (!this.canSend()) throw new Error(i18nMgr.Get('MX_EmojiSitFirst', [], '请先坐下再发送表情'));
        if (this.sending) return;
        const current = this.data.propList.find(p => p.propID === prop.propID && p.propCode === prop.propCode);
        const config = current && MagicEmojiConfig.getByPropCode(current.propCode);
        if (!current || !config) throw new Error(i18nMgr.Get('MX_EmojiUnavailable', [], '该表情暂不可用，请重新打开'));
        this.sending = true;
        this.data.setPendingEmoji({type: config.type, userID: this.session.userRID});
        try {
            const task = new BroadcastMsgRequest(this.client, this.pb).execute(this.target, this.signal, this.session, current, config.type);
            // Same inventory consumption as CC; not a second diamond purchase.
            if (current.propAmount > 0) void this.consume(current.gamePropID).catch(() => undefined);
            const result = await task;
            this.signal.throwIfAborted();
            if (result.status !== 0) throw new Error(`${i18nMgr.Get('MX_EmojiSendFailed', [], '表情发送失败')} (${result.status})`);
        } catch (error) { this.data.cancelPendingEmoji(); throw error; }
        finally { this.sending = false; }
    }
    async throwProp(targetUserRID: number, prop: UserPropData, type: number): Promise<void> {
        if (!this.canSend() || !this.seatForUser(targetUserRID) || targetUserRID === this.session.userRID || !this.ready()) throw new Error('当前不能扔道具');
        if (this.sending) return;
        const current = this.data.propList.find(p => p.propID === prop.propID && p.propCode === prop.propCode);
        if (!current || current.propType !== GameplayChatPropType.THROW_PROP || throwCodes[type] !== current.propCode || type < PropsID.PROPSTOMATO || type > PropsID.PROPSBASEBALL) throw new Error('该道具暂不可用');
        this.sending = true;
        this.data.setPendingThrowProp({type, userID: this.session.userRID, targetUserID: targetUserRID});
        try {
            const task = new BroadcastMsgRequest(this.client, this.pb).executeThrow(this.target, this.signal, this.session, current, type, targetUserRID);
            if (current.propAmount > 0) void this.consume(current.gamePropID).catch(() => undefined);
            const result = await task;
            this.signal.throwIfAborted();
            if (result.status !== 0) throw new Error(`道具发送失败（${result.status}）`);
        } catch (error) { this.data.cancelPendingThrowProp(); throw error; }
        finally { this.sending = false; }
    }
    private async consume(gamePropID: number): Promise<void> {
        await this.http.request('/api/prop/user_prop/used', {prop_id: gamePropID, type: 0, recipient_contact: '', quantity: 1, recipient_name: '', recipient_address: '', prop_bag_id: 0}, {signal: this.signal});
        await this.refresh(true);
    }
}
