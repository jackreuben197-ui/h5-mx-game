/** Live settlement controls; tied to one room hand, never carried into the next deal. */
export class SettlementWatchData {
  handNum = 0;
  peek = false;
  reveal = false;
  peekCost?: number;
  revealCost?: number;
  revealFree = false;
  revealRound = 0;
  peekPayTimes = 0;
  clear(): void {
    this.handNum = 0;
    this.peek = false;
    this.reveal = false;
    this.peekCost = undefined;
    this.revealCost = undefined;
    this.revealFree = false;
    this.revealRound = 0;
    this.peekPayTimes = 0;
  }
}
