import config from './config.json';
import { localFrame } from '../../LocalFrame.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { PublicCardsData, type PublicCardsState } from '../../../../../data/PublicCardsData.js';
import { element, place } from '../../dom.js';
import { CardView } from '../CardView/CardView.js';
import { CardMotion } from '../../CardMotion.js';
import { MotionScope, motion, easing } from '../../motion.js';
import type { PublicCardsComponent } from '../../../../../ui/Components.js';
export type { PublicCardsComponent } from '../../../../../ui/Components.js';
export class PublicCardsView implements PublicCardsComponent {
  readonly root = element('div', 'mx-board');
  readonly frame=localFrame(this.root,config.w,config.h,config.anchor.x,config.anchor.y);
  private bindings = new BindingScope(this);
  private motion = new MotionScope();
  private flip = new CardMotion();
  private previous?: PublicCardsState;
  constructor(data: PublicCardsData) {
    this.root.style.setProperty('--mx-board-box-height',`${config.h}px`);
    this.bindings.bind({ board: data });
  }
  @bindEvent(PublicCardsData.CHANGE, 'board')
  private onCards(state: PublicCardsState): void {
    const old = this.previous,
      staticFrame = !old || state.presentation === 'sync' || state.handNum !== old.handNum;
    this.previous = state;
    if (!staticFrame && old.cards.join() === state.cards.join()) { this.emphasize(state); return; }
    this.motion.cancel();
    this.root.replaceChildren();
    state.cards.forEach((value, i) => {
      const slot = element('span', 'mx-public-slot');
      const x=config.slots[i]??0;
      const centeredX=config.w/2-config.layout.cardWidth/2+(i-(state.cards.length-1)/2)*config.layout.cardWidth;
      slot.style.setProperty('--mx-card-centered-x',`${centeredX}px`);
      slot.style.setProperty('--mx-public-original-spread',`${config.slots[0]!-x}px`);
      slot.style.setProperty('--mx-public-centered-spread',`${config.w/2-state.cards.length*config.layout.cardWidth/2-centeredX}px`);
      place(slot,x,0);slot.style.margin='0';
      const node = new CardView(value).root;
      slot.append(node);
      this.root.append(slot);
      if (!staticFrame && i >= (old?.cards.length ?? 0)) {
        if (!old?.cards.length) {
          const offset = 'var(--mx-public-spread-x, var(--mx-public-original-spread))';
          CardView.paint(node, 0);
          const clean = this.motion.cleanup(() => CardView.paint(node, value));
          void this.motion
            .play(slot, [{ transform: `translateX(${offset})` }, { transform: 'none' }], {
              duration: motion.spread,
              easing: easing.out,
            })
            .then((done) => {
              clean();
              if (done) void this.flip.flip(node, value, this.motion);
            });
        } else void this.flip.flip(node, value, this.motion);
      }
    });
    this.emphasize(state);
  }
  private emphasize(state: PublicCardsState): void {
    Array.from(this.root.children).forEach((slot, i) => {
      const card=slot.querySelector<HTMLElement>('.mx-card');
      if(card) CardView.emphasize(card,state.cards[i] ?? 0,state.emphasis,config.layout.emphasisLift);
    });
  }
  cancel(): void {
    this.motion.cancel();
  }
  destroy(): void {
    this.bindings.destroy();
    this.cancel();
    this.root.remove();
  }
}
