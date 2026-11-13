import type { SpecialOperations } from '../../core/RoomRecords.js';
import type { SeatingActions } from '../../core/Seating.js';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import { SecondPcsData } from '../../data/SecondPcsData.js';
import { CPErrorCode } from '../../i18n/CPErrorCode.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { element } from '../dom.js';
import { DialogSurface } from './DialogSurface.js';
export class AgreeSecondPcsView {
  private surface = new DialogSurface('mx-second-pcs', 347);
  readonly root = this.surface.root;
  private bindings = new BindingScope(this);
  private clock = element('div', 'mx-second-clock');
  private players = element('div', 'mx-second-players');
  private count = element('div', 'mx-second-count');
  private reject = element('button', 'mx-second-reject');
  private agree = element('button', 'mx-second-agree');
  private timer: ReturnType<typeof setInterval>;
  constructor(private records: SpecialOperations, private actions: SeatingActions, private failed: (error: unknown) => void) {
    const title = element('h2', ''), tips = element('p', ''), buttons = element('div', 'mx-second-buttons');
    i18nLabel.bind(title, () => i18nMgr.Get('UIAgreeSecondPcs_title'));
    i18nLabel.bind(tips, () => i18nMgr.Get('UIAgreeSecondPcs_agree'));
    i18nLabel.bind(this.reject, () => i18nMgr.Get('adaptation10334'));
    i18nLabel.bind(this.agree, () => i18nMgr.Get('adaptation20085'));
    for (const button of [this.reject, this.agree]) { button.type = 'button'; SpriteAtlas.paint(button, 'dialogConfirm'); }
    this.reject.onclick = () => this.submit(false);
    this.agree.onclick = () => this.submit(true);
    buttons.append(this.reject, this.agree);
    this.surface.content.append(title, tips, this.clock, this.players, this.count, buttons);
    this.bindings.bind({ vote: records.data.secondPcs });
    this.timer = setInterval(() => this.tick(), 200);
  }
  @bindEvent(SecondPcsData.CHANGE, 'vote')
  private render(): void {
    const state = this.records.data.secondPcs.state;
    this.surface.show(state.active);
    if (!state.active) return;
    this.reject.disabled = this.agree.disabled = state.pending;
    this.players.replaceChildren(...state.participantSeatIds.map(seat => {
      const player = this.records.data.snapshot?.playersList.find(p => p.seatId === seat);
      const avatar = element('img', 'mx-second-avatar');
      avatar.alt = player?.name ?? '';
      if (player?.avatar) avatar.src = player.avatar;
      avatar.style.borderColor = state.votes[seat] ? '#5fff65' : '#363c65';
      return avatar;
    }));
    i18nLabel.bind(this.count, () => `${state.participantSeatIds.filter(seat => state.votes[seat] === true).length}/${state.participantSeatIds.length} ${i18nMgr.Get('UIAgreeSecondPcs_AgreeDtail')}`);
    if (state.status) this.failed(CPErrorCode.ServerErrorDescription(state.status));
    this.tick();
  }
  private tick(): void {
    const state = this.records.data.secondPcs.state;
    if (!state.active) return;
    const left = Math.max(0, Math.ceil(state.deadline - Date.now() / 1000));
    this.clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    if (!left) this.records.data.secondPcs.finish();
  }
  private submit(agree: boolean): void {
    if (!this.actions.agreeSecondPcs || this.records.data.secondPcs.state.pending) return;
    this.reject.disabled = this.agree.disabled = true;
    void this.actions.agreeSecondPcs(agree).catch(this.failed);
  }
  destroy(): void { clearInterval(this.timer); this.bindings.destroy(); this.surface.destroy(); }
}
