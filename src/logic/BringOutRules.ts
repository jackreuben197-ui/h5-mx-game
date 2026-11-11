/** UIBringOut.initialize: minimum retained on table, then the CC stepped slider. */
export class BringOutRules {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  constructor(chips: number, retainMinRate: number, smallBlind: number) {
    this.step=smallBlind*2;
    const minimumOnTable=retainMinRate*this.step;
    this.max=Math.max(0,chips-minimumOnTable);
    this.min=Math.min(minimumOnTable,this.max);
  }
  amount(progress: number): number {
    return this.step>0?Math.min(this.max,Math.round(Math.max(0,Math.min(1,progress))*(this.max-this.min)/this.step)*this.step+this.min):0;
  }
  valid(amount: number): boolean {
    return this.step>0 && Number.isSafeInteger(amount) && amount>0 && amount>=this.min && amount<=this.max && (amount===this.max || (amount-this.min)%this.step===0);
  }
}
