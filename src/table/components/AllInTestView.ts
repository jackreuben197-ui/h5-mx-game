import type { TableSnapshot } from '../../core/types.js';
import type { SeatEffects } from '../../effects/SeatEffects.js';
import type { SeatComponent } from './SeatView.js';
import { element } from '../dom.js';

/** DEV-only visual test on the live table. Never writes data or sends commands. */
export class AllInTestView {
  readonly root = element('div', 'mx-allin-test');
  private play = element('button', '', '随机 ALLIN');
  private ownButton = element('button', '', '本人 ALLIN');
  private clearButton = element('button', '', '清除');
  private status = element('span', 'mx-allin-test-status');
  private snapshot?: TableSnapshot;
  private active?: { seat: number; node: HTMLElement; room: number; match: number; hand: number };
  private dead = false;
  private generation = 0;
  private lastSeat?: number;
  private readonly key = 'dev:allin-test';
  constructor(private effects: SeatEffects, private seats: Map<number, SeatComponent>) {
    for (const button of [this.play, this.ownButton, this.clearButton]) button.type = 'button';
    this.status.setAttribute('aria-live', 'polite');
    this.root.append(element('h3', 'mx-test-heading', '牌桌动画'), this.play, this.ownButton, this.clearButton, this.status);
    this.play.onclick = () => { void this.random(); };
    this.ownButton.onclick = () => { void this.random(true); };
    this.clearButton.onclick = () => { this.clear(); };
  }
  update(state: TableSnapshot): void {
    const previous = this.snapshot;
    this.snapshot = state;
    const active = this.active;
    if (active && (active.room !== state.roomID || active.match !== state.matchID || active.hand !== state.handNum ||
        (!previous?.handEnded && state.handEnded) ||
        !state.players.some(player => player.seat === active.seat && player.action !== '全下')))
      this.clear();
    this.play.disabled = !state.players.some(player => this.seats.has(player.seat) && player.action !== '全下');
    this.ownButton.disabled = !state.players.some(player => player.seat === state.mySeat && this.seats.has(player.seat) && player.action !== '全下');
    this.ownButton.title = state.mySeat ? '播放本人的独立 ALLIN 动画' : '坐下后可测试本人 ALLIN';
  }
  private async random(ownOnly = false): Promise<void> {
    this.clear();
    const state = this.snapshot;
    if (!state || this.dead) return;
    const eligible = state.players.filter(player => this.seats.has(player.seat) && player.action !== '全下' && (!ownOnly || player.seat === state.mySeat));
    const alternatives = eligible.filter(player => player.seat !== this.lastSeat);
    const candidates = alternatives.length ? alternatives : eligible;
    const player = candidates[Math.floor(Math.random() * candidates.length)];
    if (!player) { this.status.textContent = '暂无可测试座位'; return; }
    const node = this.seats.get(player.seat)!.root;
    const own = player.seat === state.mySeat;
    this.active = { seat: player.seat, node, room: state.roomID, match: state.matchID, hand: state.handNum };
    this.lastSeat = player.seat;
    const generation = this.generation;
    this.status.textContent = `座位 ${player.seat} · ${own ? '本人' : '其他玩家'}`;
    const shown = await this.effects.play(this.key, own ? 'allin-self' : 'allin-other', () => {
      const rect = node.getBoundingClientRect();
      const avatar = node.querySelector<HTMLElement>('.mx-avatar-fallback');
      return { x:rect.left, y:rect.top, scale:(avatar?.getBoundingClientRect().width ?? 199)/199,
        opacity:Number(getComputedStyle(node).opacity) };
    });
    if (generation !== this.generation || this.dead) return;
    if (!shown) this.status.textContent = '动画加载失败';
  }
  private clear(): void {
    ++this.generation;
    this.effects.stop(this.key);
    this.active = undefined;
    this.status.textContent = '';
  }
  destroy(): void {
    this.dead = true; this.clear();
    this.play.onclick = this.ownButton.onclick = this.clearButton.onclick = null;
    this.root.remove();
  }
}
