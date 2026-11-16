import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import type { TableSnapshot } from '../../core/types.js';
import { element } from '../dom.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { SpriteAtlas, type Sprite } from '../SpriteAtlas.js';
/** CC UITexasMenu: left drawer, 0.25s slide and click-outside dismissal. */
export class TableMenuView {
  readonly root = element('div', 'mx-table-menu');
  readonly overlay = element('div', 'mx-menu-overlay mx-dialog-overlay');
  private panel = element('section', 'mx-menu-panel mx-dialog-glass');
  private trigger = element('button', 'mx-menu');
  private bb = element('button', 'mx-menu-item mx-menu-bb');
  private stand = element('button', 'mx-menu-item mx-menu-green');
  private store = element('p','mx-menu-store');
  private bringIn!: HTMLButtonElement;
  private bringOut!: HTMLButtonElement;
  private keep!: HTMLButtonElement;
  private rules!: HTMLButtonElement;
  private insurance!: HTMLButtonElement;
  private state?: TableSnapshot;
  private opened = false;
  private disposed = false;
  constructor(leave: () => void, toggleBB?: () => boolean, standup?: () => Promise<void>, actions: {
    settings: () => void; rules: (insurance: boolean) => void;
    bringIn: () => void; bringOut?: () => void; keepSeat?: (keep: boolean) => Promise<void>;
  } = {settings:()=>{},rules:()=>{},bringIn:()=>{}}, private showError: (error: unknown) => void = () => {}) {
    this.trigger.type = 'button';
    i18nLabel.bind(this.trigger, () => i18nMgr.Get('UIMine_btn_setting'), 'aria-label');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'dialog');
    SpriteAtlas.paint(this.trigger, 'setting');
    this.trigger.onclick = () => this.setOpen(!this.opened);
    const back=element('button','mx-menu-back');back.type='button';i18nLabel.bind(back,()=>i18nMgr.Get('UITexas_Leave'),'aria-label');back.onclick=leave;
    this.root.append(back,this.trigger, element('span', 'mx-menu-label', () => i18nMgr.Get('UIMine_btn_setting')));
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    i18nLabel.bind(this.panel, () => i18nMgr.Get('UIMine_btn_setting'), 'aria-label');
    const shade = element('button', 'mx-menu-shade');
    shade.type = 'button'; shade.tabIndex = -1;
    i18nLabel.bind(shade, () => i18nMgr.Get('UIBackDialog_ticketsbtnClose'), 'aria-label');
    shade.onclick = () => this.setOpen(false);

    // CC separates the 553×168 hit area from its centered 553×155 artwork.
    const background=(button:HTMLButtonElement,sprite:Sprite)=>{
      const image=element('span','mx-menu-item-background');image.setAttribute('aria-hidden','true');
      SpriteAtlas.paint(image,sprite);button.append(image);
    };
    this.bb.type = 'button'; this.bb.setAttribute('role', 'switch');
    this.bb.setAttribute('aria-checked', 'false'); this.bb.disabled = !toggleBB;
    background(this.bb, 'menuShowBB');
    const bbLabel = element('span', 'mx-menu-item-label', () => i18nMgr.Get('UITexas_ShowBB'));
    const track = element('span', 'mx-menu-switch');
    const fill = element('span', 'mx-menu-switch-fill');
    const knob = element('span', 'mx-menu-switch-knob');
    track.setAttribute('aria-hidden', 'true');
    SpriteAtlas.mask(fill, 'switchTrack', 'var(--mx-menu-switch-color)');
    SpriteAtlas.paint(knob, 'switchKnob'); track.append(fill, knob);
    this.bb.append(bbLabel, track);
    this.bb.onclick = () => this.bb.setAttribute('aria-checked', String(toggleBB?.() ?? false));

    this.stand.type = 'button'; this.stand.hidden = true;
    background(this.stand, 'menuGreen');
    this.stand.append(element('span','mx-menu-green-label',()=>i18nMgr.Get('UITexas_standUp')));
    this.stand.onclick = async () => {
      if (!standup || this.stand.disabled) return;
      this.setOpen(false); this.stand.disabled = true;
      try {
        await standup();
      } catch (error) {
        if (!this.disposed) this.showError(error);
      } finally { this.stand.disabled = false; }
    };
    this.stand.dataset.available = String(!!standup);
    const exit = element('button', 'mx-menu-item mx-menu-green');
    exit.type = 'button'; background(exit, 'menuGreen');
    exit.append(element('span','mx-menu-green-label',()=>i18nMgr.Get('UITexas_Leave')));
    exit.onclick = () => { this.setOpen(false); leave(); };
    const row=(key:string,sprite:Sprite,click:()=>void,fontSize=55)=>{
      const b=element('button','mx-menu-item');b.type='button';background(b,sprite);b.style.setProperty('--menu-label-size',String(fontSize));
      b.dataset.menuAction=key;
      b.append(element('span','mx-menu-row-label',()=>i18nMgr.Get(key)));b.onclick=()=>{this.setOpen(false);click();};return b;
    };
    const personal=row('UITexas_Setting','menuSetting',actions.settings,50);
    const rules=this.rules=row('UITexas_RuleTips','menuRules',()=>actions.rules(false),50);
    this.insurance=row('UITexas_InsureRules','menuInsurance',()=>actions.rules(true));
    this.bringIn=row('UITexas_AddChipsMenu','menuBringIn',actions.bringIn);
    this.bringOut=row('UITexas_BringOutChipsMenu','menuBringIn',()=>actions.bringOut?.());
    this.keep=row('UITexas_LeaveTheTable','menuKeepSeat',()=>{
      if(!actions.keepSeat||this.keep.disabled)return;
      this.keep.disabled=true;
      void actions.keepSeat(!this.state?.menu?.keepingSeat).catch(error=>{
        if(!this.disposed)this.showError(error);
      }).finally(()=>{if(!this.disposed)this.keep.disabled=false;});
    });
    this.panel.append(this.store,personal,rules,this.insurance,this.bringIn,this.bringOut,this.keep,this.bb,this.stand,exit);
    this.overlay.append(shade, this.panel); this.overlay.inert = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.onkeydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); this.setOpen(false); }
      if (event.key === 'Tab') {
        const items = [...this.panel.querySelectorAll<HTMLButtonElement>('button:not([disabled]):not([hidden])')];
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
  }
  private setOpen(open: boolean): void {
    this.opened = open;
    this.overlay.dataset.open = String(open);
    this.overlay.inert = !open;
    this.overlay.setAttribute('aria-hidden', String(!open));
    this.trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      this.panel.querySelector<HTMLButtonElement>('button:not([disabled]):not([hidden])')?.focus({ preventScroll: true });
    } else this.trigger.focus({ preventScroll: true });
  }
  render(state: TableSnapshot): void {
    this.state=state;
    const seated=state.mySeat>0,m=state.menu;
    this.rules.hidden=state.matchID>0;this.insurance.hidden=state.matchID>0||!m?.insurance;
    this.bringIn.hidden=!seated||state.matchID>0;this.keep.hidden=!seated;
    this.bringOut.hidden=state.matchID>0||!seated||m?.retainType!==2;
    this.bringOut.disabled=(state.players.find(p=>p.seat===state.mySeat)?.chips??0)<=(m?.retainMinRate??0)*(state.smallBlind??0)*2;
    this.store.hidden=!seated||!m?.retainType;
    i18nLabel.bind(this.store,()=>`${i18nMgr.Get('UITexas_storage')}\n${StringHelper.GetLongString(m?.storeChips??0)}`);
    if(state.matchID>0){this.stand.hidden=true;this.store.hidden=true;this.keep.disabled=!m?.mttCanTrust;}
    const label=this.keep.querySelector<HTMLElement>('.mx-menu-row-label')!;
    i18nLabel.bind(label,()=>state.matchID>0?i18nMgr.Get('UITexas_TrustGame'):m?.keepingSeat?i18nMgr.Get('MX_ReturnToTable'):i18nMgr.Get('UITexas_LeaveTheTable'));
    if(state.matchID>0)this.keep.hidden=!seated||!!state.players.find(p=>p.seat===state.mySeat)?.isAutoop;
    this.bb.setAttribute('aria-checked', String(!!state.showBB));
    this.stand.hidden = state.matchID>0 || !state.mySeat || this.stand.dataset.available !== 'true';
  }
  resize(unit: number, height: number, suggest: number): void {
    // UITexasMenu.onFrameResize uses 2290 design units as its maximum menu height.
    this.overlay.style.setProperty('--menu-unit', `${unit * (height < 2290 ? height / 2290 : suggest)}px`);
  }
  destroy(): void {
    this.disposed = true;
    this.overlay.onkeydown = null;
    this.overlay.remove(); this.root.remove();
  }
}
