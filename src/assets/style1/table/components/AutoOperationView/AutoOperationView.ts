import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import type { Action, TableSnapshot } from '../../../../../core/types.js';
import { ChipFormatter } from '../../../../../logic/ChipFormatter.js';
import { validAutoRight, resolveAutoChoice, type AutoChoice } from '../../../../../logic/AutoOperation.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';

type Choice = AutoChoice;
/** CC AutoOperation: local preselection, sent only when a normal operator reaches us. */
export class AutoOperationView {
  readonly root=componentBox(element('div','mx-auto-operation'),config);
  private buttons=new Map<Choice,HTMLButtonElement>();
  private selected?:Choice;
  private selectedAmount?:number;
  private state?:TableSnapshot;
  private submittedAction?:Action;
  private roundKey='';
  private attemptedTurn='';
  constructor(private command:(action:Action,amount?:number)=>Promise<void>){
    for(const choice of ['fold','check','call','allin'] as const){
      const button=element('button',`mx-auto-${choice}`);button.type='button';
      button.onclick=()=>{this.selected=this.selected===choice?undefined:choice;
        this.selectedAmount=this.right().amount;
        this.paint();};
      this.buttons.set(choice,button);this.root.append(button);
    }
    this.root.hidden=true;
  }
  render(s:TableSnapshot,submittedAction?:Action):void{
    const synced=s.presentation==='sync'&&(this.state?.presentation!=='sync'||s.revision!==this.state?.revision);
    this.state=s;
    this.submittedAction=submittedAction;
    const mine=s.players.find(p=>p.seat===s.mySeat);
    const key=`${s.roomID}:${s.matchID}:${s.mySeat}:${mine?.userRid}:${s.handNum}:${s.community.length}`;
    if(key!==this.roundKey||synced){this.roundKey=key;this.selected=undefined;this.attemptedTurn='';}
    const eligible=!!mine&&s.handNum>0&&!s.handEnded&&!mine.folded&&mine.chips>0&&mine.cards.length>0&&!s.willStandup&&!mine.isAutoop&&!mine.keepSeatReason&&submittedAction!=='fold'&&submittedAction!=='allin';
    this.root.hidden=!eligible||(!!s.actions.length&&!submittedAction);
    if(!eligible){this.selected=undefined;this.paint();return;}
    const {choice:right,amount}=this.right();
    for(const [choice,button] of this.buttons){
      button.hidden=choice!=='fold'&&choice!==right;

    }
    // A preselection authorizes only the quoted amount, never a later raise.
    if(this.selected&&this.selected!=='fold'&&(this.selected!==right||amount!==this.selectedAmount))this.selected=undefined;
    this.paint();
    const turn=s.betting?.id;
    if(submittedAction||!turn||!s.actions.length||!this.selected||this.attemptedTurn===turn)return;
    const selected=resolveAutoChoice(this.selected,s);
    if(!selected)return;
    this.attemptedTurn=turn;
    this.selected=undefined;
    this.paint();
    void this.command(selected.action,selected.amount);
  }
  private right():ReturnType<typeof validAutoRight>{
    // A submitted raise/call has no further amount due until authority updates the turn.
    if(this.submittedAction==='raise'||this.submittedAction==='call')return {choice:'call',amount:0};
    const s=this.state,mine=s?.players.find(p=>p.seat===s.mySeat);
    return s&&mine?validAutoRight(s.roundBet??0,mine):{choice:'check',amount:0};
  }
  private paint():void{
    for(const [choice,button] of this.buttons){
      const selected=this.selected===choice;
      const keys={fold:'UITexas_autoFlod',check:'UITexas_autoCheck',call:'UITexas_autoCall',allin:'UITexas_autoAllin'};
      const s=this.state,value=this.right().amount;
      i18nLabel.bind(button,()=>`${selected&&(choice==='call'||choice==='allin')&&s?ChipFormatter.format(value,s.smallBlind,s.showBB)+'\n':''}${i18nMgr.Get(keys[choice])}`);
      button.setAttribute('aria-pressed',String(selected));
      SpriteAtlas.paint(button,choice==='fold'?(selected?config.paths.autoFoldOn:config.paths.autoFoldOff):choice==='call'?(selected?config.paths.autoCallOn:config.paths.autoCallOff):(selected?config.paths.autoOn:config.paths.autoOff));
    }
  }
  destroy():void{this.root.remove();}
}
