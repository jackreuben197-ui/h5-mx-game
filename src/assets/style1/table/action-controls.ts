import { chipLabel } from './ChipLabel.js';
import { ActionButton } from './components/ActionButton/ActionButton.js';
import { SeatCountdownView } from './components/SeatCountdownView/SeatCountdownView.js';
import { SliderBetGesture } from './SliderBetGesture.js';
import defaultSettings, { TexasGamePersonalSettings } from '../../../data/TexasGamePersonalSettings.js';
import { ShortcutBet } from '../../../logic/ShortcutBet.js';
import { i18nLabel } from '../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../i18n/i18nMgr.js';
import { ChipFormatter } from '../../../logic/ChipFormatter.js';
import type { Action, TableSnapshot } from '../../../core/types.js';
import { element as node } from './dom.js';
import { AutoOperationView } from './components/AutoOperationView/AutoOperationView.js';
import { SpriteAtlas } from './SpriteAtlas.js';
import type { TableConfirmDialog } from './components/TableConfirmDialog/TableConfirmDialog.js';
/** Fixed-size operation track. Editing never overlays cards or resizes the table. */
export class ActionControls {
  readonly root = node('section', 'mx-operation');
  private foldCountdown=new SeatCountdownView(true);
  private quick = node('div','mx-operation-quick');
  private quickSignature='';
  private offSettings: () => void;
  private row = node('div', 'mx-operation-row');
  private editor = node('div', 'mx-raise-editor');
  private addTime = node('button','mx-add-time',()=>i18nMgr.Get('MX_AddTime',[],'加时'));
  private auto: AutoOperationView;
  private amount = node('output', 'mx-raise-amount');
  private percent = node('span', 'mx-raise-percent');
  private raiseValue = node('span', 'mx-raise-value');
  private range = node('input', 'mx-raise-range');
  private confirm = node('button', 'mx-raise-confirm', () => i18nMgr.Get('UITexas_confirm', [], '确定'));
  private buttons = new Map<Action, HTMLButtonElement>();
  private state?: TableSnapshot;
  private mode: 'actions' | 'raise' = 'actions';
  private key = '';
  private gesture = new SliderBetGesture();
  private offAccount: () => void;
  private submittedKey = '';
  private offSubmit: () => void;
  private offAppearance: () => void;
  private busy = false;
  private disposed = false;
  private accountGeneration = 0;
  private opScale = 0.2;
  constructor(
    private command: (action: Action, amount?: number) => Promise<void>,
    paint: (node: HTMLElement, path: string) => void,
    private confirmDialog: TableConfirmDialog,
    private addTimeCommand?:()=>Promise<void>,
    private settings: TexasGamePersonalSettings = defaultSettings,
  ) {
    this.auto=new AutoOperationView(command);
    this.offAccount=this.settings.on(TexasGamePersonalSettings.ACCOUNT_CHANGE,()=>{this.accountGeneration++;this.gesture.cancel();this.mode='actions';this.state=undefined;this.busy=false;this.submittedKey='';this.refresh();});
    const updateSubmitMode = () => {
      this.gesture.cancel();
      this.confirm.hidden = this.settings.tableSliderSubmit === 'release';
    };
    this.offSubmit = this.settings.on(TexasGamePersonalSettings.SLIDER_SUBMIT_CHANGE, updateSubmitMode);
    this.offAppearance = this.settings.on(TexasGamePersonalSettings.APPEARANCE_CHANGE, () => {
      updateSubmitMode();
      this.refresh();
    });
    updateSubmitMode();
    this.offSettings=this.settings.on(TexasGamePersonalSettings.SHORTCUTS_CHANGGE,()=>this.refresh());
    i18nLabel.bind(this.root, () => i18nMgr.Get("MX_TableActions", [], "牌桌操作"), 'aria-label');
    for (const [action, label] of [
      ['fold', "UITexas_fold"],
      ['check', "UITexas_check"],
      ['call', "UITexas_call"],
      ['raise', "adaptation10045"],
      ['allin', "adaptation30074"],
      ['straddle', "UITexas_straddle"],
    ] as const) {
      const b=ActionButton.create(action,action==='fold'?undefined:()=>i18nMgr.Get(label),paint);
      if(action==='fold'){b.replaceChildren(node('span','mx-fold-label',()=>i18nMgr.Get(label)),this.foldCountdown.root);}
      this.buttons.set(action, b);
      this.row.append(b);
      b.onclick = () => {
        if (action === 'raise') {
          this.mode = 'raise';
          this.range.value = '0';
          this.amount.hidden = true;
          this.refresh();
          this.range.focus();
        } else if (action === 'fold' && this.state?.actions.includes('check')) {
          this.confirmDialog.open({
            owner: 'fold',
            title: () => i18nMgr.Get('adaptation20037', [], '确定弃牌？'),
            message: () => i18nMgr.Get('adaptation20038', [], '你可以让牌而不需要任何筹码'),
            cancel: () => i18nMgr.Get('adaptation10315', [], '让牌'),
            commit: () => i18nMgr.Get('adaptation10047', [], '弃牌'),
            onCancel: () => { void this.submit('check'); },
            onCommit: () => { void this.submit('fold'); },
          });
        } else
          void this.submit(action, action === 'allin' ? this.state?.betting?.allIn : undefined);
      };
    }
    const cancel = node('button', 'mx-operation-cancel', () => i18nMgr.Get("Wallet_Cancel", [], "取消"));
    cancel.type = 'button';
    cancel.onclick = () => this.close();
    const track = node('label', 'mx-raise-track');
    SpriteAtlas.paint(track,'raiseTrack');
    SpriteAtlas.paint(this.amount,'raiseBubble');
    const chip=node('span','mx-raise-chip');SpriteAtlas.paint(chip,'chip');
    this.amount.append(this.percent,chip,this.raiseValue);
    track.append(this.amount, this.range);
    this.editor.append(cancel, track, this.confirm);
    this.range.type = 'range';
    this.range.min = '0';
    this.range.step = '1';
    i18nLabel.bind(this.range, () => i18nMgr.Get("MX_RaiseAmount", [], "加注金额"), 'aria-label');
    this.range.onpointerdown = e => {
      if (this.mode !== 'raise' || this.busy || !this.gesture.begin(e.pointerId,this.key,this.range.value)) return;
      this.range.setPointerCapture(e.pointerId);
    };
    this.range.onpointermove = e => this.gesture.move(e.pointerId);
    this.range.onpointercancel = this.range.onlostpointercapture = () => { this.gesture.cancel(); };
    this.range.onpointerup = e => {
      const completed=this.gesture.finish(e.pointerId,this.key,this.range.value);
      if (!completed || this.mode !== 'raise' || this.settings.tableSliderSubmit !== 'release') return;
      const selection = this.selection();
      if (selection) void this.submit(selection.action, selection.amount);
    };
    this.range.onblur=()=>this.gesture.cancel();
    this.range.onkeydown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))this.confirm.hidden=false;};
    this.range.oninput = () => { this.amount.hidden = false; this.updateAmount(); };
    const thumb=node('span','mx-raise-thumb');SpriteAtlas.paint(thumb,'raiseThumb');track.append(thumb);
    this.confirm.type = 'button';
    SpriteAtlas.paint(this.confirm,'raise');
    this.confirm.onclick = () => {
      const selection = this.selection();
      if (selection) void this.submit(selection.action, selection.amount);
    };
    this.addTime.type='button';
    SpriteAtlas.paint(this.addTime,'operationExtra');
    const clock=node('span','mx-add-time-clock');SpriteAtlas.paint(clock,'addTimeClock');
    const duration=node('span','mx-add-time-duration','+30s');
    const costIcon=node('span','mx-add-time-diamond');SpriteAtlas.paint(costIcon,'recordDiamond');
    const cost=node('span','mx-add-time-cost');
    this.addTime.replaceChildren(node('span','mx-add-time-line'),node('span','mx-add-time-line'));
    this.addTime.children[0]!.append(clock,duration);
    this.addTime.children[1]!.append(costIcon,cost);
    this.addTime.onclick=()=>{if(!this.busy&&this.state?.canAddTime&&this.addTimeCommand)void this.addTimeCommand();};
    this.root.append(this.auto.root,this.quick,this.row, this.editor, this.addTime);
    this.root.onkeydown = (e) => {
      if (e.key === 'Escape' && !this.busy) {
        e.preventDefault();
        this.close();
      }
    };
    this.root.onclick = (e) => {
      if (!this.busy && this.mode === 'raise' && (e.target === this.root || e.target === this.editor)) this.close();
    };
    this.refresh();
  }
  private close() {
    this.gesture.cancel();
    const previousMode = this.mode;
    this.mode = 'actions';
    this.refresh();
    this.buttons.get(previousMode === 'raise' ? 'raise' : 'fold')?.focus();
  }
  private selection(): { action: Action; amount: number } | undefined {
    const b = this.state?.betting;
    if (!b) return;
    const steps = Math.floor((b.max - b.min) / b.step),
      index = Number(this.range.value);
    if (index > steps && b.allIn !== undefined && this.state?.actions.includes('allin'))
      return { action: 'allin', amount: b.allIn };
    return { action: 'raise', amount: b.min + Math.min(index, steps) * b.step };
  }
  private updateAmount() {
    const v = this.selection();
    if (!v) return;
    const percent = Math.round(Number(this.range.value) / Math.max(1, Number(this.range.max)) * 100);
    this.range.parentElement?.style.setProperty('--mx-raise-progress', `${percent}%`);
    this.percent.textContent=`${percent}%`;
    chipLabel(this.raiseValue,ChipFormatter.format(v.amount, this.state?.smallBlind, this.state?.showBB));
    this.range.setAttribute('aria-valuetext', `${percent}% ${v.action === 'allin' ? i18nMgr.Get('adaptation30074', [], '全下') : i18nMgr.Get('adaptation10045', [], '加注')} ${this.raiseValue.textContent}`);
    i18nLabel.bind(this.confirm, () => i18nMgr.Get('UITexas_confirm', [], '确定'));
  }
  private async submit(action: Action, amount?: number) {
    const deadline=this.state?.countdowns?.find(c=>c.seat===this.state?.mySeat)?.deadline;
    if (this.disposed || this.busy || this.submittedKey===this.key || !this.state?.actions.includes(action) || (deadline && deadline<=Date.now()/1000)) return;
    this.gesture.cancel();
    const generation=this.accountGeneration;
    this.submittedKey=this.key;
    this.busy = true;
    this.mode = 'actions';
    this.refresh();
    try {
      await this.command(action, amount);
    } catch(error) {
      if(generation===this.accountGeneration)this.submittedKey='';
      throw error;
    } finally {
      if (!this.disposed && generation===this.accountGeneration) {
        this.busy = false;
        this.refresh();
      }
    }
  }
  render(state: TableSnapshot) {
    const key = `${state.roomID}:${state.matchID}:${state.handNum}:${state.betting?.id ?? state.actions.join(',')}`;
    if (key !== this.key) {
      this.gesture.cancel();
      this.mode = 'actions';
      this.range.value = '0';
      this.key = key;
    }
    this.state = state;
    if (!state.actions.includes('fold') || !state.actions.includes('check')) this.confirmDialog.close('fold');
    this.root.hidden = !state.mySeat;
    if (
      (!state.actions.includes('raise') && this.mode === 'raise')
    )
      this.mode = 'actions';
    this.refresh();
    this.auto.render(state);
  }
  setScale(scale: number): void {
    if(scale!==this.opScale)this.gesture.cancel();
    this.opScale = scale;
    const css = this.root.style;
    css.setProperty('--mx-op-button-size', `${ActionButton.config.w * scale}px`);
    css.setProperty('--mx-op-button-height', `${ActionButton.config.h * scale}px`);
    css.setProperty('--mx-fold-timer-scale',String(ActionButton.config.foldTimerSize*scale/ActionButton.config.timerDesignSize));
    css.setProperty('--mx-op-scale', String(scale));
    css.setProperty('--mx-raise-width', `${146*scale}px`);
    css.setProperty('--mx-raise-height', `${833*scale}px`);
    css.setProperty('--mx-raise-bubble-width', `${530*scale}px`);
    css.setProperty('--mx-raise-bubble-height', `${154*scale}px`);
    css.setProperty('--mx-raise-info-offset', `${502.108*scale}px`);
    css.setProperty('--mx-raise-font-size', `${60*scale}px`);
    css.setProperty('--mx-raise-chip-size', `${58*scale}px`);
    css.setProperty('--mx-raise-thumb-height', `${50*scale}px`);
    css.setProperty('--mx-raise-confirm-offset', `${521*scale}px`);
    css.setProperty('--mx-raise-confirm-font', `${40*scale}px`);
    css.setProperty('--mx-op-fold-size', `${147 * scale}px`);
    css.setProperty('--mx-op-fold-x', `${-267.53 * scale}px`);
    css.setProperty('--mx-op-main-x', `${275.647 * scale}px`);
    css.setProperty('--mx-op-upper-y', `${200 * scale}px`);
    css.setProperty('--mx-op-straddle-y', `${155.812 * scale}px`);
    css.setProperty('--mx-op-auto-gap', `${500 * scale}px`);
    css.setProperty('--mx-op-quick-width', `${144 * scale}px`);
    css.setProperty('--mx-op-quick-height', `${143 * scale}px`);
    css.setProperty('--mx-op-quick-font', `${20*scale}px`);
    css.setProperty('--mx-op-quick-ratio-font', `${40*scale}px`);
    css.setProperty('--mx-op-quick-value-font', `${34*scale}px`);
  }
  private refresh() {
    this.root.dataset.mode = this.mode;
    const items = this.state ? ShortcutBet.calculate(this.settings.tableShortcuts,this.state) : [];
    const layout: Record<number, readonly [number, number][]> = {
      1:[[-190,370]],2:[[-190,370],[190,370]],3:[[-250,300],[0,395],[250,300]],
      4:[[-300,240],[-120,370],[120,370],[300,240]],
      5:[[-350,240],[-190,370],[0,395],[190,370],[350,240]],
    };
    const signature=JSON.stringify([items,this.opScale,this.state?.smallBlind,this.state?.showBB]);
    if(signature!==this.quickSignature){
    this.quickSignature=signature;this.quick.replaceChildren();
    for(const [index,item] of items.entries()){
      const button=node('button','mx-quick-bet');button.type='button';
      const bg=node('span','mx-quick-bg');SpriteAtlas.paint(bg,'betPercent');
      const ratio=node('span','mx-quick-ratio');
      const title=node('span','mx-quick-title',()=>i18nMgr.Get('adaptation20005',[],'底池'));
      const valueBg=node('span','mx-quick-value-bg');SpriteAtlas.paint(valueBg,'betValue');
      const value=node('span','mx-quick-value');
      i18nLabel.bind(ratio,()=>item.label);
      chipLabel(value,()=>ChipFormatter.format(item.amount,this.state?.smallBlind,this.state?.showBB));
      button.append(bg,title,ratio,valueBg,value);
      const point=layout[items.length]?.[index];
      if(point){button.style.left=`calc(50% + ${point[0]*this.opScale}px)`;button.style.top=`calc(50% - ${point[1]*this.opScale}px)`;}
      button.onclick=()=>void this.submit(item.action,item.amount);this.quick.append(button);
    }
    }
    this.quick.hidden=!this.quick.childElementCount||this.busy||this.submittedKey===this.key;
    const s = this.state,
      b = s?.betting,
      actions = s?.actions ?? [];
    const canRaise = !!b && b.step > 0 && b.max >= b.min && actions.includes('raise');
    this.row.dataset.allinSecondary = String(actions.includes('allin') && (actions.includes('check') || actions.includes('call')) && !canRaise);
    this.buttons.forEach((button, action) => {
      button.hidden =
        !actions.includes(action) ||
        (action === 'check' && actions.includes('call')) ||
        (action === 'raise' && (!canRaise || this.mode === 'raise')) ||
        (action === 'allin' && (canRaise || !b?.allIn));
      if (action === 'call') chipLabel(button, () => `${i18nMgr.Get("UITexas_call")}\n${ChipFormatter.format(b?.call ?? 0, s?.smallBlind, s?.showBB)}`);
      if (action === 'straddle') chipLabel(button, () => `${i18nMgr.Get('UITexas_straddle',[],'抓')}\n${ChipFormatter.format(b?.straddle??0,s?.smallBlind,s?.showBB)}`);
    });
    if (canRaise && b) {
      this.range.max = String(
        Math.floor((b.max - b.min) / b.step) +
          (actions.includes('allin') && b.allIn !== undefined ? 1 : 0),
      );
      this.updateAmount();
    }
    this.row.hidden = !actions.length;
    this.editor.hidden = this.mode !== 'raise';
    this.addTime.hidden=!s?.canAddTime||!actions.length||!this.addTimeCommand;
    if(s?.canAddTime){
      this.addTime.setAttribute('aria-label',`${i18nMgr.Get('MX_AddTime',[],'加时')} +30s ${s.addTimeCost??0}`);
      const price=this.addTime.querySelector('.mx-add-time-cost');if(price)price.textContent=String(s.addTimeCost??0);
      const line=this.addTime.children[1] as HTMLElement;line.hidden=!!s.privateUc&&(s.addTimeCost??0)===0;
    }
    this.root
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>('button,input')
      .forEach((e) => (e.disabled = this.busy));
    this.foldCountdown.render(s&&actions.includes('fold')&&!s.handEnded&&!this.busy&&this.submittedKey!==this.key?s.countdowns?.find(c=>c.seat===s.mySeat):undefined);
    this.root.dataset.pending = String(this.busy);
  }
  destroy() {
    this.offSettings();
    this.offSubmit();
    this.offAppearance();
    this.offAccount();
    this.gesture.cancel();
    this.auto.destroy();
    this.foldCountdown.destroy();
    this.disposed = true;
    this.root.remove();
  }
}
