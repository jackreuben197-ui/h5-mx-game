import { StringHelper } from './StringHelper.js';
/** Full chip amounts shared by table controls, records and reports. */
export class ChipFormatter {
    constructor(private smallBlind = 0, private showBB = false, _isMtt = false) {}
    static format(value: number, smallBlind = 0, showBB = false): string {
        return new ChipFormatter(smallBlind, showBB).showNumberWithShowBB(value);
    }
    public showNumberWithShowBB(value: number): string {
        return ChipFormatter.tableAmount(value, this.smallBlind, this.showBB);
    }

    /** Truncate whole chips toward zero and preserve values smaller than one chip. */
    static amount(value: number, ratio = 100): string {
        const chips = value / ratio;
        return String(Math.abs(chips) < 1 ? chips : Math.trunc(chips));
    }

    /** Table amounts are shown in whole chips, except for sub-chip values and BB. */
    static tableAmount(value: number, smallBlind = 0, showBB = false): string {
        if (showBB && smallBlind > 0)
            return `${StringHelper.GetDecimalNWithoutKM(value / (smallBlind * 2))}BB`;
        return ChipFormatter.amount(value);
    }

    public showPlayerBalanceWithShowBB(value: number): string {
        return ChipFormatter.tableAmount(value, this.smallBlind, this.showBB);
    }
}
