import config from './config.json';
import { localFrame } from '../../LocalFrame.js';
import { SeatEffectView } from '../SeatEffectView/SeatEffectView.js';
import type { SeatEffects } from '../../../effects/SeatEffects.js';
import { SeatPositionMotion, type SeatPositionMode } from '../../SeatPositionMotion.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { SeatData, type SeatState } from '../../../../../data/SeatData.js';
import { element, place } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { SeatBetView } from '../SeatBetView/SeatBetView.js';
import { SeatIdentityView } from '../SeatIdentityView/SeatIdentityView.js';
import { HandCardsView } from '../HandCardsView/HandCardsView.js';
import type { SeatPlacement } from '../../../../../ui/TableLayout.js';
export type { SeatPlacement } from '../../../../../ui/TableLayout.js';
import type { SeatComponent } from '../../../../../ui/Components.js';
export type { SeatComponent } from '../../../../../ui/Components.js';
export class SeatView implements SeatComponent {
  readonly root = element('article', 'mx-seat');
  readonly frame=localFrame(this.root,config.w,config.h,config.anchor.x,config.anchor.y);
  private position = new SeatPositionMotion(this.root);
  private actionRoot=element('div','mx-seat-action');
  private actionPosition=new SeatPositionMotion(this.actionRoot);
  private actionUnit=0;
  private identity: SeatIdentityView;
  private cards: HandCardsView;
  private bet = new SeatBetView();
  private dealer = element('span', 'mx-dealer');
  private bindings = new BindingScope(this);
  private previous?: SeatState;
  private effects: SeatEffectView;
  constructor(data: SeatData, originDelta: (group: HTMLElement) => { x: number; y: number }, effects?: SeatEffects) {
    this.root.dataset.seat = String(data.id);
    this.actionRoot.dataset.seat=String(data.id);
    this.identity = new SeatIdentityView(data.id);
    place(this.identity.root,config.identity.x,config.identity.y);
    this.cards = new HandCardsView(originDelta);
    SpriteAtlas.paint(this.dealer, config.paths.dealer);
    this.root.append(this.identity.root, this.cards.root, this.bet.root, this.dealer);
    this.effects = new SeatEffectView(data.id, this.root, effects,this.actionRoot);
    this.bindings.bind({ seat: data });
  }
  @bindEvent(SeatData.CHANGE, 'seat')
  private onSeat(state: SeatState): void {
    const old = this.previous;
    this.root.classList.toggle('mx-seat-mine', state.mine);
    this.root.classList.toggle('mx-seat-acting', !!state.acting);
    this.root.classList.toggle('mx-seat-has-cards', !!state.player?.cards.length);
    this.root.classList.toggle('mx-empty-seat', !state.player);
    this.root.classList.toggle('mx-seat-revealed',!state.mine&&!!state.player?.cards.some(card=>card>0));
    this.root.setAttribute('role',state.player?'group':'button');
    this.root.setAttribute('aria-label',state.player?`座位 ${this.root.dataset.seat}`:`空座 ${this.root.dataset.seat}`);
    this.root.tabIndex=state.player?-1:0;
    this.identity.render(state);
    this.bet.render(state);
    this.dealer.hidden = !state.dealer;
    // Unrelated pot/operator changes must not restart an existing card animation.
    if (
      !old ||
      state.presentation === 'sync' ||
      state.handNum !== old.handNum ||
      state.player?.userRid !== old.player?.userRid ||
      old.mine !== state.mine ||
      old.player?.folded !== state.player?.folded ||
      old.player?.cards.join() !== state.player?.cards.join()
    )
      this.cards.render(state, old);
    this.cards.emphasize(state);
    this.cards.selection(state);
    this.effects.render(state);
    this.previous = state;
  }
  place(p: SeatPlacement, mode: SeatPositionMode = 'static'): void {
    this.position.place(p, mode);
    if(this.actionUnit)this.actionPosition.place({
      x:(p.x+(config.identity.x-config.w*config.anchor.x)*p.scale)*this.actionUnit,
      y:(p.y+(config.identity.y-config.h*config.anchor.y)*p.scale)*this.actionUnit,
      scale:p.scale*this.actionUnit,
    },mode);
    this.root.dataset.scale = String(p.scale);
    this.root.style.setProperty('--mx-seat-world-x',`${p.x}px`);
    this.root.style.setProperty('--mx-seat-world-y',`${p.y}px`);
    this.root.style.setProperty('--mx-seat-local-scale',String(p.scale));
    this.root.dataset.edge = p.edge;
    this.root.dataset.microphoneSide = p.microphoneSide ?? (p.edge==='left'?'left':'right');
    this.root.style.setProperty('--mx-hero-avatar-drop',`${(p.y-(p.controlsY??p.y))/p.scale}px`);
    place(this.cards.root, config.identity.x+p.cardsX, config.identity.y+p.cardsY);
    this.cards.setSpread(p.handSpread,p.backHandSpread);
    this.cards.root.style.setProperty('--card-scale', String(p.cardScale));
    place(this.dealer, config.identity.x+p.dealerX, config.identity.y+p.dealerY);
    this.bet.place(config.identity.x+p.betX, config.identity.y+p.betY, p.betIconX, p.betAnchor);
  }
  entryActionsBounds():{avatarTop:number;returnVisible:boolean;scale:number} {
    return {avatarTop:this.identity.getAvatarBounds().top,returnVisible:!this.identity.returnButton.hidden,scale:Number(this.root.dataset.scale??1)};
  }
  setActionLayer(layer:HTMLElement|null,unit:number):void {
    this.actionUnit=layer?unit:0;
    this.identity.setActionLayer(layer?this.actionRoot:null);
    if(layer){
      if(this.actionRoot.parentElement!==layer)layer.append(this.actionRoot);
    }else{
      this.actionPosition.cancel();
      this.actionRoot.remove();
    }
  }
  cancel(): void {
    this.effects.cancel();
    this.position.cancel();
    this.actionPosition.cancel();
    this.cards.cancel();
  }
  destroy(): void {
    this.effects.destroy();
    this.position.cancel();
    this.actionPosition.cancel();
    this.actionRoot.remove();
    this.bindings.destroy();
    this.cards.destroy();
    this.identity.destroy();
    this.root.remove();
  }
}
