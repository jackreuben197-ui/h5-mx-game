import type { InsurancePotLimit, OutsCard } from '@silenthill/agreement-web';

export enum PoolType {
    NONE = 0,
    MIN_MONEY = 1,
    ALL = 2,
    HALF = 3,
    THIRD = 4,
    FIFTH = 5,
    EIGHTH = 6
}

/** Arithmetic migrated verbatim from CC UIInsuranceNewPanel. Wire amounts remain cents. */
export class InsuranceRules {
 public _sortByGraphics = false;
 constructor(public round: number, public flopRound: number, public forceBuyRatio: number, public insuranceOdds: {potUserCount:number;oddsList:{outs:number;odds:number}[]}[]) {}
    public _splitOuts(pot: InsurancePotLimit.AsObject): { overOuts: number[]; equalOuts: number[] } {
        const overSet = new Set<number>();
        const equalSet = new Set<number>();
        (pot.outsDetailList || []).forEach(userOuts => {
            (userOuts.outsCardsList || []).forEach((c: OutsCard.AsObject) => {
                if (c.isEqual) equalSet.add(c.card);
                else overSet.add(c.card);
            });
        });
        return { overOuts: Array.from(overSet), equalOuts: Array.from(equalSet) };
    }
    public _ratioToPool(ratio: number): PoolType {
        switch (ratio) {
            case 125:
                return PoolType.EIGHTH;
            case 200:
                return PoolType.FIFTH;
            case 333:
                return PoolType.THIRD;
            case 500:
                return PoolType.HALF;
            case 1000:
                return PoolType.ALL;
            default:
                return PoolType.NONE;
        }
    }
    public _compensateAmount(pot: InsurancePotLimit.AsObject, type: PoolType): number {
        const potLeaderCount = Math.max(1, pot.potLeaderCount);
        let value = 0;
        switch (type) {
            case PoolType.MIN_MONEY:
                value = (pot.bet + pot.insuranced) / 100;
                break;
            case PoolType.ALL:
                value = pot.potAmount / 100;
                break;
            case PoolType.HALF:
                value = pot.potAmount / 100 / 2;
                break;
            case PoolType.THIRD:
                value = (pot.potAmount / 100) * 0.333;
                break;
            case PoolType.FIFTH:
                value = pot.potAmount / 100 / 5;
                break;
            case PoolType.EIGHTH:
                value = pot.potAmount / 100 / 8;
                break;
        }
        if (type !== PoolType.MIN_MONEY) value /= potLeaderCount;
        return value;
    }
    public _overOutsPay(pot: InsurancePotLimit.AsObject, type: PoolType): number {
        const overOdd = this._oddsFor(pot, this._splitOuts(pot).overOuts.length);
        if (overOdd <= 0) return 0;
        let maxPay = 0;
        if (type === PoolType.MIN_MONEY) {
            maxPay = Math.floor((pot.bet + pot.insuranced) / overOdd);
        } else {
            maxPay = Math.floor(pot.potAmount / Math.max(1, pot.potLeaderCount) / overOdd);
        }
        let overValue = 0;
        switch (type) {
            case PoolType.MIN_MONEY:
            case PoolType.ALL:
                overValue = maxPay;
                break;
            case PoolType.HALF:
                overValue = maxPay / 2;
                break;
            case PoolType.THIRD:
                overValue = maxPay * 0.333;
                break;
            case PoolType.FIFTH:
                overValue = maxPay / 5;
                break;
            case PoolType.EIGHTH:
                overValue = maxPay / 8;
                break;
        }
        const ratio = this.forceBuyRatio || 0;
        const isFlop = this.round === this.flopRound;
        if (isFlop && ratio > 0) {
            const targetByRatio: Record<number, PoolType> = {
                125: PoolType.EIGHTH,
                200: PoolType.FIFTH,
                333: PoolType.THIRD,
                500: PoolType.HALF,
                1000: PoolType.ALL
            };
            if (targetByRatio[ratio] === type) return pot.min;
        }
        return Math.floor(overValue);
    }
    public _equalOutsPay(pot: InsurancePotLimit.AsObject, overValue: number): number {
        const { equalOuts } = this._splitOuts(pot);
        if (!equalOuts.length) return 0;
        const equalOdd = this._oddsFor(pot, equalOuts.length);
        if (equalOdd <= 0) return 0;
        return Math.floor(overValue / equalOdd);
    }
    public _realPayAmount(pot: InsurancePotLimit.AsObject, type: PoolType): number {
        const over = this._overOutsPay(pot, type);
        const equal = this._equalOutsPay(pot, over);
        return (over + equal) / 100;
    }
    public _riverForcePayAmount(pot: InsurancePotLimit.AsObject): number {
        const last = pot.insuranced || 0;
        if (last <= 0) return 0;
        const { overOuts, equalOuts } = this._splitOuts(pot);
        const overOdd = this._oddsFor(pot, overOuts.length) || 1;
        const equalOdd = this._oddsFor(pot, equalOuts.length);
        const overValue = last / overOdd;
        const equalValue = equalOdd > 0 ? overValue / equalOdd : 0;
        return overValue + equalValue;
    }
    public _oddsFor(pot: InsurancePotLimit.AsObject, selectedOuts: number): number {
        if (selectedOuts <= 0) return 0;
        const table = this.insuranceOdds || [];
        const bucket = table.find(t => t.potUserCount === pot.potUserCount);
        if (bucket) {
            const hit = bucket.oddsList.find(o => o.outs === selectedOuts);
            if (hit && Number.isFinite(hit.odds) && hit.odds > 0) return hit.odds;
        }
        return Number.isFinite(pot.odds) ? pot.odds : 0;
    }
    public _canPayFromPoolType(pot: InsurancePotLimit.AsObject, type: PoolType): boolean {
        const realPay = Math.floor(this._realPayAmount(pot, type) * 100);
        if (realPay <= 0) return false;
        return realPay <= pot.max;
    }
    public _floorTrim(value: number): string {
        if (!Number.isFinite(value)) return '0';
        return value
            .toFixed(2)
            .replace(/\.00$/, '')
            .replace(/(\.\d)0$/, '$1');
    }
    public _sortCards(cards: number[]): void {
        cards.sort((a, b) => {
            const ar = a % 15;
            const br = b % 15;
            if (!this._sortByGraphics) return ar - br;
            const as = Math.floor(a / 15);
            const bs = Math.floor(b / 15);
            return as === bs ? ar - br : as - bs;
        });
    }
}
