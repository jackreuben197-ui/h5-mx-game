import settings, { TexasGamePersonalSettings } from '../data/TexasGamePersonalSettings.js';
import { ShortcutBet } from '../logic/ShortcutBet.js';
import { i18nLabel } from '../i18n/i18nLabel.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import { ChipFormatter } from '../logic/ChipFormatter.js';
import type { Action, TableSnapshot } from '../core/types.js';
import { element as node } from './dom.js';
/** Fixed-size operation track. Editing never overlays cards or resizes the table. */
export class ActionControls {
  readonly root = node('section', 'mx-operation');
  private quick = node('div','mx-operation-quick');
  private offSettings: () => void;
  private row = node('div', 'mx-operation-row');
  private editor = node('div', 'mx-raise-editor');
  private confirmation = node('div', 'mx-fold-confirm');
  private status = node('span', 'mx-operation-status');
  private amount = node('output', 'mx-raise-amount');
  private range = node('input', 'mx-raise-range');
  private confirm = node('button', 'mx-raise-confirm', () => i18nMgr.Get("MX_ConfirmRaise", [], "确认加注"));
  private buttons = new Map<Action, HTMLButtonElement>();
  private state?: TableSnapshot;
  private mode: 'actions' | 'raise' | 'fold' = 'actions';
  private key = '';
  private busy = false;
  private disposed = false;
  constructor(
    private command: (action: Action, amount?: number) => Promise<void>,
    paint: (node: HTMLElement, key: 'fold' | 'call' | 'raise') => void,
  ) {
    this.offSettings=settings.on(TexasGamePersonalSettings.SHORTCUTS_CHANGGE,()=>this.refresh());
    i18nLabel.bind(this.root, () => i18nMgr.Get("MX_TableActions", [], "牌桌操作"), 'aria-label');
    for (const [action, label] of [
      ['fold', "UITexas_fold"],
      ['check', "UITexas_check"],
      ['call', "UITexas_call"],
      ['raise', "adaptation10045"],
      ['allin', "adaptation30074"],
    ] as const) {
      const b = node('button', `mx-operation-button mx-operation-${action}`, () => i18nMgr.Get(label));
      b.type = 'button';
      paint(
        b,
        action === 'fold' ? 'fold' : action === 'check' || action === 'call' ? 'call' : 'raise',
      );
      this.buttons.set(action, b);
      this.row.append(b);
      b.onclick = () => {
        if (action === 'raise') {
          this.mode = 'raise';
          this.range.value = '0';
          this.refresh();
          this.range.focus();
        } else if (action === 'fold' && this.state?.actions.includes('check')) {
          this.mode = 'fold';
          this.refresh();
        } else
          void this.submit(action, action === 'allin' ? this.state?.betting?.allIn : undefined);
      };
    }
    const cancel = node('button', 'mx-operation-cancel', () => i18nMgr.Get("Wallet_Cancel", [], "取消"));
    cancel.type = 'button';
    cancel.onclick = () => this.close();
    const track = node('label', 'mx-raise-track');
    track.append(this.amount, this.range);
    this.editor.append(cancel, track, this.confirm);
    this.range.type = 'range';
    this.range.min = '0';
    this.range.step = '1';
    i18nLabel.bind(this.range, () => i18nMgr.Get("MX_RaiseAmount", [], "加注金额"), 'aria-label');
    this.range.oninput = () => this.updateAmount();
    this.confirm.type = 'button';
    this.confirm.onclick = () => {
      const selection = this.selection();
      if (selection) void this.submit(selection.action, selection.amount);
    };
    const message = node('span', 'mx-fold-message', () => i18nMgr.Get("MX_YouCanCheckForFreeFoldAnyway", [], "现在可以免费过牌，仍要弃牌？"));
    const fold = node('button', 'mx-confirm-fold', () => i18nMgr.Get("MX_FoldAnyway", [], "仍然弃牌"));
    fold.type = 'button';
    fold.onclick = () => {
      void this.submit('fold');
    };
    const check = node('button', 'mx-confirm-check', () => i18nMgr.Get("UITexas_check", [], "过牌"));
    check.type = 'button';
    check.onclick = () => {
      void this.submit('check');
    };
    this.confirmation.append(message, fold, check);
    this.status.setAttribute('role', 'status');
    this.root.append(this.quick,this.row, this.editor, this.confirmation, this.status);
    this.root.onkeydown = (e) => {
      if (e.key === 'Escape' && !this.busy) {
        e.preventDefault();
        this.close();
      }
    };
    this.refresh();
  }
  private close() {
    this.mode = 'actions';
    this.refresh();
    this.buttons.get('raise')?.focus();
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
    i18nLabel.bind(this.amount, () => `${v.action === 'allin' ? i18nMgr.Get("adaptation30074", [], "全下") : i18nMgr.Get("adaptation10045", [], "加注")} ${ChipFormatter.format(v.amount, this.state?.smallBlind, this.state?.showBB)}`);
    this.range.setAttribute('aria-valuetext', this.amount.textContent);
    i18nLabel.bind(this.confirm, () => v.action === 'allin' ? i18nMgr.Get("MX_ConfirmAllIn", [], "确认全下") : i18nMgr.Get("MX_ConfirmRaise", [], "确认加注"));
  }
  private async submit(action: Action, amount?: number) {
    if (this.busy || !this.state?.actions.includes(action)) return;
    this.busy = true;
    this.mode = 'actions';
    this.refresh();
    try {
      await this.command(action, amount);
    } finally {
      if (!this.disposed) {
        this.busy = false;
        this.refresh();
      }
    }
  }
  render(state: TableSnapshot) {
    const key = `${state.roomID}:${state.handNum}:${state.betting?.id ?? state.actions.join(',')}`;
    if (key !== this.key) {
      this.mode = 'actions';
      this.range.value = '0';
      this.key = key;
    }
    this.state = state;
    this.root.hidden = !state.mySeat || !state.actions.length;
    if (
      (!state.actions.includes('raise') && this.mode === 'raise') ||
      (!state.actions.includes('fold') && this.mode === 'fold')
    )
      this.mode = 'actions';
    this.refresh();
  }
  private refresh() {
    this.quick.replaceChildren();
    if(this.state)for(const item of ShortcutBet.calculate(settings.shortCuts,this.state)){
      const button=node('button','mx-quick-bet');button.type='button';
      i18nLabel.bind(button,()=>`${item.label}\n${ChipFormatter.format(item.amount,this.state?.smallBlind,this.state?.showBB)}`);
      button.onclick=()=>void this.submit(item.action,item.amount);this.quick.append(button);
    }
    this.quick.hidden=this.mode!=='actions'||!this.quick.childElementCount;
    const s = this.state,
      b = s?.betting,
      actions = s?.actions ?? [];
    const canRaise = !!b && b.step > 0 && b.max >= b.min && actions.includes('raise');
    this.buttons.forEach((button, action) => {
      button.hidden =
        !actions.includes(action) ||
        (action === 'check' && actions.includes('call')) ||
        (action === 'raise' && !canRaise) ||
        (action === 'allin' && (canRaise || !b?.allIn));
      if (action === 'call') i18nLabel.bind(button, () => `${i18nMgr.Get("UITexas_call")}\n${ChipFormatter.format(b?.call ?? 0, s?.smallBlind, s?.showBB)}`);
    });
    if (canRaise && b) {
      this.range.max = String(
        Math.floor((b.max - b.min) / b.step) +
          (actions.includes('allin') && b.allIn !== undefined ? 1 : 0),
      );
      this.updateAmount();
    }
    this.row.hidden = this.mode !== 'actions' || !actions.length;
    this.editor.hidden = this.mode !== 'raise';
    this.confirmation.hidden = this.mode !== 'fold';
    this.status.hidden = !!actions.length && !this.busy;
    const mine = s?.players.find((p) => p.seat === s.mySeat);
    i18nLabel.bind(this.status, () => this.busy
      ? i18nMgr.Get("MX_Submitting", [], "正在提交…")
      : s?.interaction === 'entry-only'
        ? i18nMgr.Get("MX_SeatedActionsNotConnected", [], "已入桌 · 操作协议待接入")
        : mine?.folded
          ? i18nMgr.Get("MX_FoldedWaitingForHandToEnd", [], "已弃牌 · 等待本手结束")
          : mine?.chips === 0
            ? i18nMgr.Get("MX_AllInWaitingForOtherPlayers", [], "已全下 · 等待其他玩家")
            : i18nMgr.Get("MX_WaitingForOtherPlayers", [], "等待其他玩家行动"));
    this.root
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>('button,input')
      .forEach((e) => (e.disabled = this.busy));
    this.root.dataset.pending = String(this.busy);
  }
  destroy() {
    this.offSettings();
    this.disposed = true;
    this.root.remove();
  }
}
