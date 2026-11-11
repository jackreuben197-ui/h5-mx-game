export interface HistoryQuote {
    canPeek: boolean;
    canReveal: boolean;
    privateUc: boolean;
    peekPrice?: number;
    revealPrice?: number;
    collectPrice?: number | null;
    freeCount: number;
    revealRound: number;
    balance?: number;
}
