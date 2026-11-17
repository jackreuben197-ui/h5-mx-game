import config from './config.json';
import type { ProtocolRoomData } from '../../../../../data/ProtocolRoomData.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import { element } from '../../dom.js';
/** Room-specific insurance instructions. Odds come from the same RoomRecord as buying insurance. */
export class InsuranceRulesView {
  readonly dialog=new RecordDialogView(()=>i18nMgr.Get('UITexas_InsureRules'),()=>this.close(),'right',config.layout.designTop);
  readonly root=this.dialog.root;
  constructor(private data:ProtocolRoomData){this.root.classList.add('mx-insurance-rules');i18nMgr.register(this);}
  open():void{this.refreshLanguage();this.dialog.show(true);}
  close():void{this.dialog.show(false);}
  refreshLanguage():void{
    this.dialog.refreshTitle();
    const mode=this.data.snapshot?.roomInfo?.insuranceMode??0;
    const keys=mode===2?['UIEVInsuranceRuler']:mode===1?['UILowWaterInsuranceRuler']:['UIInsuranceRuleTitle','UITexasRule_detail4','UITexasRule_detail5','UITexasRule_detail6','UITexasRule_detail7','UITexasRule_detail8','UITexasRule_detail31','UITexasRule_detail11','UITexasRule_detail12','UITexasRule_detail13'];
    this.dialog.body.replaceChildren(...keys.map(key=>element('p','',i18nMgr.Get(key).replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,''))));
    if(mode===2)return;
    for(const group of this.data.record?.insuranceOddsList??[]){
      const table=element('table','mx-record-table');
      const caption=element('caption','',`${group.potUserCount} ${i18nMgr.Get('MX_InsurancePlayers',[],'人底池')}`);
      const head=element('tr','');head.append(element('th','','Outs'),element('th','',i18nMgr.Get('MX_InsuranceOdds',[],'赔率')));
      const thead=element('thead','');thead.append(head);const body=element('tbody','');
      for(const odd of group.oddsList){const row=element('tr','');row.append(element('td','',String(odd.outs)),element('td','',String(odd.odds)));body.append(row);}
      table.append(caption,thead,body);this.dialog.body.append(table);
    }
  }
  onFrameResize(w:number,h:number):void{this.dialog.onFrameResize(w,h);}
  destroy():void{this.dialog.destroy();}
}
