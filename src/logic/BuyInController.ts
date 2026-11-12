import { GameplayTableSettingData } from '../data/GameplayTableSettingData.js';
import { BuyInData } from '../data/BuyInData.js';
import type { SeatingActions } from '../core/Seating.js';
/** Dialog state only. Money rules and wire requests stay in the room host. */
export class BuyInController {
  readonly data = new BuyInData();
  private generation = 0;
  private preparing = false;
  readonly settings: GameplayTableSettingData;
  constructor(private actions?: SeatingActions) {this.settings=actions?.settings??new GameplayTableSettingData();}
  async open(seat: number): Promise<void> {
    if(this.data.state.busy || this.preparing) return;
    const generation = ++this.generation;
    this.preparing = true;
    // CC waits for the return/bring-in decision before opening a dialog.
    this.data.update({step:'closed',quote:undefined,error:'',busy:false});
    try {
      if(!this.actions) throw new Error('当前入口尚不支持坐下');
      const quote = await this.actions.prepare(seat);
      if(generation !== this.generation) return;
      if(quote.autoReturn && quote.returnAmount !== undefined && quote.returnClubID !== undefined) {
        this.data.update({quote,amount:quote.returnAmount,clubID:quote.returnClubID,auto:false,step:'closed',busy:true});
        await this.actions.submit({quoteID:quote.id,amount:quote.returnAmount,clubID:quote.returnClubID,autoAmount:0});
        if(generation === this.generation) this.data.update({quote:undefined,busy:false});
        return;
      }
      this.data.update({quote,amount:quote.min,clubID:quote.returnClubID ?? quote.wallets[0]?.club_id ?? 0,auto:false,step:quote.mode === 'add' || quote.returnAmount !== undefined ? 'amount' : 'security'});
    } catch(error) { if(generation === this.generation) this.data.update({step:'loading',busy:false,error:error instanceof Error ? error.message : '带入信息获取失败'}); }
    finally { this.preparing = false; }
  }
  next(): void {
    const step = this.data.state.step;
    if(step === 'security') this.data.update({step:'rules'});
    else if(step === 'rules') this.data.update({step:'amount'});
  }
  async submit(): Promise<void> {
    const s = this.data.state;
    if(!this.actions || !s.quote || s.busy) return;
    const generation = this.generation;
    this.data.update({busy:true,error:''});
    try {
      await this.actions.submit({quoteID:s.quote.id,amount:s.amount,clubID:s.clubID,autoAmount:s.auto?s.amount:0});
      if(generation === this.generation) this.data.update({step:'closed',busy:false});
    } catch(error) { if(generation === this.generation) this.data.update({busy:false,error:error instanceof Error ? error.message:'坐下失败，请重新选择座位'}); }
  }
  close(): void { if(this.data.state.busy) return; this.generation++; this.data.update({step:'closed'}); }
  destroy(): void { this.generation++; this.data.clear(); }
}
