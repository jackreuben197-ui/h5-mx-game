import { StringHelper } from './StringHelper.js';
/** CC TexasGameRoomDataBasic amount methods; only the settings/data dependencies are injected. */
export class ChipFormatter {
    constructor(private smallBlind = 0, private showBB = false, private isMtt = false) {}
    static format(value: number, smallBlind = 0, showBB = false): string {
        return new ChipFormatter(smallBlind, showBB).showNumberWithShowBB(value);
    }
    public showNumberWithShowBB(value: number): string {
        const base = this.smallBlind * 2;
        const ratio = this.showBB ? base : 100;
        const ex: string = this.showBB ? 'BB' : '';
        return `${StringHelper.GetDecimalNWithKM(value / ratio)}${ex}`;
    }

    /** MTT 牌桌余额：不足 1 时保留小数，达到 1 后沿用赛事筹码的取整展示。 */
    public showPlayerBalanceWithShowBB(value: number): string {
        const base = this.smallBlind * 2;
        const ratio = this.showBB ? base : 100;
        const displayValue = value / ratio;
        const normalizedValue = this.isMtt && displayValue >= 1 ? Math.floor(displayValue) : displayValue;
        const formattedValue =
            this.isMtt && displayValue > 0 && displayValue < 1
                ? StringHelper.GetDecimalN(displayValue, 2)
                : StringHelper.GetDecimalNWithKM(normalizedValue);
        const ex: string = this.showBB ? 'BB' : '';
        return `${formattedValue}${ex}`;
    }

}
