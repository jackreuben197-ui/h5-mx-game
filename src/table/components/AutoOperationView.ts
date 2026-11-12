import type { Action, TableSnapshot } from '../../core/types.js';
import { ChipFormatter } from '../../logic/ChipFormatter.js';
import { validAutoRight, resolveAutoChoice, type AutoChoice } from '../../logic/AutoOperation.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';

type Choice = AutoChoice;
/** CC AutoOperation: local preselection, sent only when a normal operator reaches us. */
export class AutoOperationView {
  readonly root=element('div','mx-auto-operation');
  private buttons=new Map<Choice,HTMLButtonElement>();
  private selected?:Choice;
  private roundKey='';
  private attemptedTurn='';
  constructor(private command:(action:Action,amount?:number)=>Promise<void>){
    for(const choice of ['fold','check','call','allin'] as const){
      const button=element('button',`mx-auto-${choice}`);button.type='button';
      button.onclick=()=>{this.selected=this.selected===choice?undefined:choice;this.paint();};
      this.buttons.set(choice,button);this.root.append(button);
    }
    this.root.hidden=true;
  }
  render(s:TableSnapshot):void{
    const key=`${s.roomID}:${s.handNum}:${s.community.length}`;
    if(key!==this.roundKey){this.roundKey=key;this.selected=undefined;this.attemptedTurn='';}
    const mine=s.players.find(p=>p.seat===s.mySeat);
    const eligible=!!mine&&s.handNum>0&&!s.handEnded&&!mine.folded&&mine.chips>0&&mine.cards.length>0&&!s.willStandup;
    this.root.hidden=!eligible||!!s.actions.length;
    if(!eligible){this.selected=undefined;this.paint();return;}
    const {choice:right,amount}=validAutoRight(s.roundBet??0,mine!);
    for(const [choice,button] of this.buttons){
      button.hidden=choice!=='fold'&&choice!==right;
      const label=choice==='fold'?i18nMgr.Get('UITexas_fold',[], '弃牌'):
        choice==='check'?i18nMgr.Get('UITexas_check',[],'过牌'):
        choice==='call'?i18nMgr.Get('UITexas_call',[],'跟注'):i18nMgr.Get('adaptation30074',[],'全下');
      i18nLabel.bind(button,()=>`${label}${choice==='call'||choice==='allin'?` ${ChipFormatter.format(amount,s.smallBlind,s.showBB)}`:''}`);
    }
    if(this.selected&&this.selected!=='fold'&&this.selected!==right)this.selected=undefined;
    this.paint();
    const turn=s.betting?.id;
    if(!turn||!s.actions.length||!this.selected||this.attemptedTurn===turn)return;
    const selected=resolveAutoChoice(this.selected,s);
    if(!selected)return;
    this.attemptedTurn=turn;
    this.selected=undefined;
    this.paint();
    void this.command(selected.action,selected.amount);
  }
  private paint():void{
    for(const [choice,button] of this.buttons){
      const selected=this.selected===choice;
      button.setAttribute('aria-pressed',String(selected));
      SpriteAtlas.paint(button,choice==='fold'?(selected?'autoFoldOn':'autoFoldOff'):choice==='call'?(selected?'autoCallOn':'autoCallOff'):(selected?'autoOn':'autoOff'));
    }
  }
  destroy():void{this.root.remove();}
}
