import { StringHelper } from './StringHelper.js';
/** CC TexasGameRoomDataBasic amount methods; only the settings/data dependencies are injected. */
export class ChipFormatter {
    constructor(private smallBlind = 0, private showBB = false, _isMtt = false) {}
    static format(value: number, smallBlind = 0, showBB = false): string {
        return new ChipFormatter(smallBlind, showBB).showNumberWithShowBB(value);
    }
    public showNumberWithShowBB(value: number): string {
        const base = this.smallBlind * 2;
        const ratio = this.showBB ? base : 100;
        const ex: string = this.showBB ? 'BB' : '';
        return `${StringHelper.GetDecimalNWithKM(value / ratio)}${ex}`;
    }

    /** Table amounts are shown in whole chips, except for sub-chip values and BB. */
    static tableAmount(value: number, smallBlind = 0, showBB = false): string {
        if (showBB && smallBlind > 0) return ChipFormatter.format(value, smallBlind, true);
        const chips = value / 100;
        if (Math.abs(chips) < 1) return String(chips);
        return StringHelper.GetDecimalNWithKM(Math.trunc(chips));
    }

    public showPlayerBalanceWithShowBB(value: number): string {
        if (this.showBB && this.smallBlind > 0)
            return `${StringHelper.GetDecimalNWithoutKM(value / (this.smallBlind * 2))}BB`;
        const chips = value / 100;
        return String(Math.abs(chips) < 1 ? chips : Math.trunc(chips));
    }
}
