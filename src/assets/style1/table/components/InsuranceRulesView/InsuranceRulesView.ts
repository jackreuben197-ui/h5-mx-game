import type { ProtocolRoomData } from '../../../../../data/ProtocolRoomData.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import { element } from '../../dom.js';
/** Room-specific insurance instructions. Odds come from the same RoomRecord as buying insurance. */
export class InsuranceRulesView {
  readonly dialog=new RecordDialogView(()=>i18nMgr.Get('UITexas_InsureRules'),()=>this.close());
  readonly root=this.dialog.root;
  constructor(private data?:ProtocolRoomData){
    this.root.classList.add('mx-rules-overlay','mx-insurance-rules');
    this.dialog.footer.hidden=true;
    this.dialog.body.tabIndex=0;
    i18nMgr.register(this);
  }
  open():void{this.renderRules();this.dialog.show(true);this.dialog.body.scrollTop=0;}
  close():void{this.dialog.show(false);}
  refreshLanguage():void{if(!this.root.hidden)this.renderRules();}
  private renderRules():void{
    const mode=this.data?.snapshot?.roomInfo?.insuranceMode??0;
    const keys=mode===2?['UIEVInsuranceRuler']:mode===1?['UILowWaterInsuranceRuler']:['UIInsuranceRuleTitle','UITexasRule_detail4','UITexasRule_detail5','UITexasRule_detail6','UITexasRule_detail7','UITexasRule_detail8','UITexasRule_detail31','UITexasRule_detail11','UITexasRule_detail12','UITexasRule_detail13'];
    this.dialog.body.replaceChildren(...keys.map(key=>element('p','',i18nMgr.Get(key).replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,''))));
    if(mode===2)return;
    for(const group of this.data?.record?.insuranceOddsList??[]){
      const table=element('table','mx-record-table');
      const caption=element('caption','',`${group.potUserCount} ${i18nMgr.Get('MX_InsurancePlayers',[],'人底池')}`);
      const head=element('tr','');for(let column=0;column<2;column++)head.append(element('th','','Outs'),element('th','',i18nMgr.Get('MX_InsuranceOdds',[],'赔率')));
      const thead=element('thead','');thead.append(head);const body=element('tbody','');
      const odds=[...group.oddsList].sort((a,b)=>a.outs-b.outs);
      const left=odds.filter(odd=>odd.outs<=10),right=odds.filter(odd=>odd.outs>10);
      for(let index=0;index<Math.max(left.length,right.length);index++){
        const row=element('tr','');
        for(const odd of [left[index],right[index]])row.append(element('td','',odd?String(odd.outs):''),element('td','',odd?String(odd.odds):''));
        body.append(row);
      }
      table.append(caption,thead,body);this.dialog.body.append(table);
    }
  }
  destroy():void{this.dialog.destroy();}
}
