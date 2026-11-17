import type { RoomInfo } from '@silenthill/agreement-web';
/** CC TexasGameRoomDataPlayerMine.caculateCanBringMinMax, with data dependencies adapted only. */
export class BringInRules {
    private roomData: { basicInfo: { deposit:number; sbante:{sb:number}; curMinRate:number; curMaxRate:number } };
    constructor(info: RoomInfo.AsObject, private totalChips = 0, private deposit = 0) {
        this.roomData = { basicInfo: { deposit:info.deposit, sbante:{sb:info.smallBlind}, curMinRate:info.currentMinRate, curMaxRate:info.currentMaxRate } };
    }
    public caculateCanBringMinMax() {
        let needDeposit = this.roomData.basicInfo.deposit;
        let totalChips = 0;
        needDeposit = Math.max(0, needDeposit - this.deposit);
        totalChips = this.totalChips;
        let step = this.roomData.basicInfo.sbante.sb * 2;
        let minAmount = this.roomData.basicInfo.curMinRate * step;
        minAmount += needDeposit;
        const maxAmount = this.roomData.basicInfo.curMaxRate * step - totalChips + needDeposit;
        return {
            minAmount,
            maxAmount,
            step,
            needDeposit: needDeposit > 0
        };
    }

}
