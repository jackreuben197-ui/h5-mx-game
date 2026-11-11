// CC HistoryPricing rules; dependencies are room/host instances.
import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import type { DiamondModel } from '../data/DiamondModel.js';
import { DiamondConfigType, resolvePrivateUcDiamondConfigType } from './DiamondConfigType.js';
export class HistoryPricing {
    constructor(private data: ProtocolRoomData, private config: GlobalConfigStore, private diamonds: DiamondModel) { }
    getPeekPrice(peekCount: number): Promise<number> {
        const viewerTypeExt = (this.data.snapshot?.myInfo?.seatId ?? 0) > 0 ? 12 : 11;
        return this.getPrice(DiamondConfigType.DiamondConfigTypePayWatchOtherCardWatchAll, viewerTypeExt + 10 * Math.min(peekCount, 4));
    }
    getViewPubPrice(round: number): Promise<number> {
        const viewAll = this.config.viewPublicCards.viewType === 2;
        return this.getPrice(viewAll ? DiamondConfigType.DiamondConfigTypeViewPublicCardsAll : DiamondConfigType.DiamondConfigTypeViewPublicCards, viewAll ? 0 : round * 1000);
    }
    private async getPrice(type: DiamondConfigType, ext: number): Promise<number> {
        const privateUc = this.config.isChannelDiamondFreeMode;
        if (!privateUc)
            await this.diamonds.reqDiamondConfig(type);
        return this.diamonds.getPrice(privateUc ? resolvePrivateUcDiamondConfigType(type) : type, ext, this.data.snapshot?.roomInfo?.smallBlind ?? 0, privateUc);
    }
}
