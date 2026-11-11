/** CC data/room/texas/model/Operator.ts. Normal-operation timer and add-time rules; engine-free. */
export enum OpertionType {
    NORMAL = 1,
    INSURANCE = 2,
    AGREESECPUB = 3
}

export class Operator {
    /** 1: NORMAL 2: INSURANCE 3: AGREESECPUB  */
    public opType!: OpertionType;
    private _leftOpDuration: number = 0;
    public set leftOpDuration(s: number) {
        this._leftOpDuration = s;
    }
    public get leftOpDuration() {
        if (this._leftOpDuration == 0) return 0;
        const now = Date.now() / 1000;
        const endTime = this.deadlineTImestamp > 0 ? this.deadlineTImestamp : now + Math.max(0, this._leftOpDuration || 0);
        return Math.max(0, Math.ceil(endTime - Date.now() / 1000));
    }
    public get elapsedTime() {
        return Math.max(0, this.totalOpDuration - this.leftOpDuration);
    }
    public alreadyDelayTImes!: number;
    public deadlineTImestamp!: number;
    public totalOpDuration!: number; // 房间配置
    public allPot!: number;
    public roundBetEqual!: number; // 本轮CALL平的RoundBet
}

export type OperatorTimeUpdate = {
    duration: number;
    times: number;
    deadline: number;
};

function cloneOperator<T extends Operator>(oper: T): T {
    const next = new Operator();
    Object.assign(next, oper);
    return next as T;
}

export function updateOperatorAfterAddTime<T extends Operator>(oper: T, payload: OperatorTimeUpdate): T {
    const next = cloneOperator(oper);
    const now = Date.now() / 1000;
    const duration = Math.max(0, payload.duration || 0);
    const currentEndTime = next.deadlineTImestamp > 0 ? next.deadlineTImestamp : now + Math.max(0, next.leftOpDuration || 0);
    const nextEndTime = payload.deadline > 0 ? payload.deadline : Math.max(currentEndTime, now) + duration;
    const leftTime = Math.max(0, nextEndTime - now);
    const currentTotal = Math.max(1, next.totalOpDuration || 0, next.leftOpDuration || 0);
    next.alreadyDelayTImes = payload.times;
    next.deadlineTImestamp = nextEndTime;
    next.leftOpDuration = leftTime;
    next.totalOpDuration = Math.max(1, currentTotal + duration, leftTime);
    return next;
}

