import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import { localFrame } from '../../LocalFrame.js';
import type { SeatState } from '../../../../../data/SeatData.js';
import { element, place } from '../../dom.js';
import { CardView } from '../CardView/CardView.js';
import { CardMotion } from '../../CardMotion.js';
import { MotionScope, motion, easing } from '../../motion.js';
const showCardEye = resourceURL(config.paths.showEye);
export class HandCardsView {
  readonly root = element('div', 'mx-hole-cards');
  private readonly resourceStyle=this.root.style.setProperty('--mx-show-card-eye',`url("${resourceURL(config.paths.showEye)}")`);
  frame=localFrame(this.root,config.w,config.h,config.anchor.x,config.anchor.y);
  private motion = new MotionScope();
  private flip = new CardMotion();
  private spread = config.layout.faceStripWidth;
  setSpread(spread=config.layout.faceStripWidth):void {
    this.spread=spread;
    if(this.root.classList.contains('mx-small-cards'))return;
    Array.from(this.root.children).forEach((slot,i)=>place(slot as HTMLElement,(i+.5)*spread/this.root.children.length-spread/2+this.frame.width/2,this.frame.height/2));
  }
  constructor(private originDelta: (group: HTMLElement) => { x: number; y: number }) {}
  render(state: SeatState, old?: SeatState): void {
    this.motion.cancel();
    const p = state.player,
      previous = old?.player;
    const staticFrame = !old || state.presentation === 'sync' || state.handNum !== old.handNum || p?.userRid !== previous?.userRid;
    const folding = !!p?.folded && !previous?.folded && !staticFrame && !state.mine;
    const shown = folding ? (previous?.cards ?? []) : (p?.cards ?? []),
      face = state.mine || shown.some((v) => v > 0);
    this.frame=face?localFrame(this.root,config.w,config.h,config.anchor.x,config.anchor.y):localFrame(this.root,config.back.w,config.back.h,config.anchor.x,config.anchor.y);
    this.root.hidden =
      !shown.length || (!!p?.folded && !state.mine && !folding && !shown.some((v) => v > 0));
    this.root.classList.toggle('mx-cards-gray', !!p?.folded && state.mine);
    this.root.classList.toggle('mx-small-cards', !face);
    this.root.replaceChildren(
      ...shown.map((value, i) => {
        const wrapper = element('span', 'mx-card-slot');
        wrapper.dataset.cardIndex=String(i);
        wrapper.style.setProperty('--mx-show-card-eye', `url("${showCardEye}")`);
        wrapper.append(new CardView(value, !face).root);
        place(
          wrapper,
          // CC Cards/l2r Layout resizes slots inside a fixed 270-wide strip.
          face ? ((i + 0.5) * this.spread / shown.length - this.spread/2 + this.frame.width/2) : ((i + 0.5) * config.layout.backStripWidth / shown.length - config.layout.backCenter + this.frame.width/2),
          this.frame.height/2,
        );
        return wrapper;
      }),
    );
    if (folding) void this.fold();
    if (old && state.presentation === 'deal' && p && shown.length && state.dealIndex >= 0)
      void this.deal(shown, state.dealIndex, state.mine);
    this.selection(state);
  }
  selection(state:SeatState):void{
    Array.from(this.root.children).forEach((slot,i)=>{
      (slot as HTMLElement).classList.toggle('mx-card-selected',!!state.mine&&state.player?.showCardsSelection?.[i]===1);
    });
  }
  private async deal(cards: readonly number[], index: number, mine: boolean) {
    if (this.motion.reduced()) return;
    const fronts = mine ? Array.from(this.root.querySelectorAll<HTMLElement>('.mx-card')) : [];
    fronts.forEach(card => CardView.paint(card, 0));
    const clean = this.motion.cleanup(() => fronts.forEach((card, i) => CardView.paint(card, cards[i]!))),
      d = this.originDelta(this.root);
    const done = await this.motion.play(
      this.root,
      [
        { transform: `translate(${d.x}px,${d.y}px) scale(${mine ? 0.15 : 0.5})` },
        { transform: 'none' },
      ],
      { duration: motion.deal, delay: index * motion.order, easing: easing.out },
    );
    clean();
    if (done && mine)
      Array.from(this.root.children).forEach((node, i) => {
        void this.flip.flip(node as HTMLElement, cards[i]!, this.motion);
      });
  }
  private async fold() {
    if (this.motion.reduced()) {
      this.root.hidden = true;
      return;
    }
    const d = this.originDelta(this.root);
    const done = await this.motion.play(
      this.root,
      [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${d.x}px,${d.y}px) scale(0)`, opacity: 0 },
      ],
      { duration: motion.fold, easing: easing.inOut },
    );
    if (done) this.root.hidden = true;
  }
  emphasize(state: SeatState): void {
    Array.from(this.root.children).forEach((slot, i) => {
      const card = slot.querySelector<HTMLElement>('.mx-card');
      if (card) CardView.emphasize(card, state.player?.cards[i] ?? 0, state.player?.settlement?.cards ?? state.cardsEmphasis, config.layout.emphasisLift);
    });
  }
  cancel(): void {
    this.motion.cancel();
  }
  destroy(): void {
    this.cancel();
    this.root.remove();
  }
}
