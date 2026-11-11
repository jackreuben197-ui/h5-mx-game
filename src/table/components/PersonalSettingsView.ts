import settings, { TexasGamePersonalSettings as Settings, shortCutMode } from '../../data/TexasGamePersonalSettings.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { element } from '../dom.js';
import { CardView } from './CardView.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { DeskPreview } from './DeskPreview.js';
import { AppearanceResources } from '../AppearanceResources.js';
/** UIPersonalSettings: same choices, defaults and persisted data as CC. */
export class PersonalSettingsView {
  readonly root = element('div', 'mx-settings-overlay mx-dialog-overlay');
  private body = element('div','mx-settings-body');
  private frameHeight=0;
  private panel = element('section', 'mx-settings-panel mx-personal-settings mx-dialog-glass');
  private status = element('p', 'mx-settings-status');
  private pages: HTMLElement[] = [];
  private tabs: HTMLButtonElement[] = [];
  private desks: HTMLButtonElement[] = [];
  private cards: HTMLButtonElement[] = [];
  private shortcuts = element('div', 'mx-settings-shortcuts');
  private modes: HTMLButtonElement[] = [];
  private switches: HTMLButtonElement[] = [];
  private switchStates: HTMLElement[] = [];
  private range = element('div', 'mx-settings-slider');
  private slider = element('input', 'mx-settings-range');
  private ratio = element('output', 'mx-settings-ratio');
  private selectedShortcut = 0;
  private generation = 0;
  private off: (() => void)[] = [];
  private focus?: HTMLElement;
  constructor() {
    this.root.hidden = true;
    this.panel.setAttribute('role','dialog'); this.panel.setAttribute('aria-modal','true');
    i18nLabel.bind(this.panel,()=>i18nMgr.Get('UITexas_Setting'),'aria-label');
    i18nLabel.bind(this.panel,()=>i18nMgr.language,'data-language');
    const title=element('h2','',()=>i18nMgr.Get('UITexas_Setting'));
        const tabs=element('div','mx-settings-tabs');tabs.setAttribute('role','tablist');
    ['UIGameplaySetting_CardTableSetting','UIGameplaySetting_QuickFillingSetting','UIGameplaySetting_SystemSetting'].forEach((key,i)=>{
      const tab=this.button(key,()=>this.selectTab(i));tab.setAttribute('role','tab');
      const mark=element('span','mx-settings-tab-selected');SpriteAtlas.paint(mark,'settingsTabSelected');mark.setAttribute('aria-hidden','true');tab.append(mark);
      tab.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:2))%3;this.selectTab(n);this.tabs[n]?.focus({preventScroll:true});}};
      tabs.append(tab);this.tabs.push(tab);
      const page=element('div',`mx-settings-page mx-settings-${['appearance','quick','system'][i]}`);page.setAttribute('role','tabpanel');this.pages.push(page);
    });
    const appearance=this.pages[0]!;
    appearance.append(this.heading('UITexasSetting_qAONskmY'));
    const decks=element('div','mx-settings-decks');
    for(const type of [1,2] as const){
      const b=element('button','mx-settings-deck');b.type='button';b.setAttribute('aria-label',String(type));
      SpriteAtlas.paint(b,'settingsCardOption');const selected=element('span','mx-settings-card-selected');SpriteAtlas.paint(selected,'settingsCardSelected');b.append(selected);
      for(const value of [10,26,43,58]){const card=element('span','mx-card');CardView.paint(card,value,false,type);b.append(card);}
      b.onclick=()=>{void this.choose(async()=>{await AppearanceResources.cards(type);return()=>settings.setPokerCardTypeToStorage(type);});};
      this.cards.push(b);decks.append(b);
    }
    appearance.append(decks);
    const desks=element('div','mx-settings-desks');
    for(let i=1;i<=14;i++){
      const b=element('button','mx-settings-desk');b.type='button';b.setAttribute('aria-label',String(i));
      SpriteAtlas.paint(b,'settingsDeskOption');
      const selected=element('span','mx-settings-desk-selected');SpriteAtlas.paint(selected,'settingsDeskSelected');
      b.append(selected,new DeskPreview(i).root,element('span','mx-settings-desk-name',`Table ${i}`));
      b.onclick=()=>{void this.choose(async()=>{await AppearanceResources.desk(i);return()=>settings.setDeskTypeToStorage(i);});};
      this.desks.push(b);desks.append(b);
    }
    const expand=element('button','mx-settings-expand');
    const expandLabel=element('span','',()=>i18nMgr.Get('UIGameplaySetting_DesktopSettingTip'));
    const expandArrow=element('span','mx-settings-expand-arrow');expandArrow.setAttribute('aria-hidden','true');expand.append(expandLabel,expandArrow);expand.type='button';expand.setAttribute('aria-expanded',String(settings.deskType>4));
    expand.onclick=()=>{const open=expand.getAttribute('aria-expanded')!=='true';expand.setAttribute('aria-expanded',String(open));this.desks.forEach((b,i)=>b.hidden=i>=4&&!open);this.fitHeight();};
    this.desks.forEach((b,i)=>b.hidden=i>=4&&settings.deskType<=4);
    appearance.append(desks,expand);
    const quick=this.pages[1]!;
    quick.append(this.heading('UIGameplaySetting_QuickFillingSetting_GameButton'));
    const modes=element('div','mx-settings-modes');
    for(const mode of [shortCutMode.Button3,shortCutMode.Button5]){
      const b=element('button','',()=>i18nMgr.Get('UIGameplaySetting_DesktopSetting_MultiButton',[mode===1?3:5]));b.type='button';
      b.onclick=()=>{this.selectedShortcut=0;settings.shortCutMode=mode;};this.modes.push(b);modes.append(b);
    }
    this.slider.type='range';this.slider.min='0';this.slider.max=String(settings.getAllShortCuts().length-1);this.slider.step='1';
    i18nLabel.bind(this.slider,()=>i18nMgr.Get('UIGameplaySetting_CustomPotTip'),'aria-label');
    this.slider.oninput=()=>{const indices=[...(settings.shortCutMode===1?settings.shortCut3ActionsIndex:settings.shortCut5ActionsIndex)];indices[this.selectedShortcut]=Number(this.slider.value);if(settings.shortCutMode===1)settings.shortCut3ActionsIndex=indices;else settings.shortCut5ActionsIndex=indices;};
    const custom=element('div','mx-settings-custom');
    const handle=element('span','mx-settings-range-handle');SpriteAtlas.paint(handle,'sliderHandle');handle.setAttribute('aria-hidden','true');
    const track=element('span','mx-settings-range-track');track.setAttribute('aria-hidden','true');
    this.range.append(track,this.ratio,handle,this.slider);
    const limits=element('div','mx-settings-range-limits');
    const choices=settings.getAllShortCuts();limits.append(element('span','',choices[0]!.name),element('span','',choices.at(-1)!.name));
    custom.append(this.heading('UIGameplaySetting_CustomPotTip'),this.range,limits);
    quick.append(modes,this.shortcuts,custom);
    const system=this.pages[2]!;
    for(const [key,get,set] of [
      ['UITexasSetting_LrI45uIK',()=>settings.soundOn,(v:boolean)=>settings.setSoundOnToStorage(v)],
      ['UITexas_ShowBB',()=>settings.showBB,(v:boolean)=>settings.setShowBBToStorage(v)],
    ] as const){const row=element('div','mx-settings-system-row');const b=element('button','mx-settings-switch');b.type='button';b.setAttribute('role','switch');i18nLabel.bind(b,()=>i18nMgr.Get(key),'aria-label');b.onclick=()=>set(!get());this.switches.push(b);
      const info=element('span','mx-settings-info');SpriteAtlas.paintWarning(info);info.setAttribute('aria-hidden','true');
      const state=element('span','mx-settings-switch-state',()=>i18nMgr.Get(get()?'UICreateRoom_Opened':'UIMineSixCloseHas'));this.switchStates.push(state);
      row.append(element('span','mx-settings-system-label',()=>i18nMgr.Get(key)),info,state,b);system.append(row);}
    this.body.append(...this.pages);
    this.status.setAttribute('role','status');this.panel.append(title,tabs,this.body,this.status);this.root.append(this.panel);
    this.root.onclick=e=>{if(e.target===this.root)this.close();};
    this.root.onkeydown=e=>{
      if(e.key==='Escape'){e.stopPropagation();this.close();}
      if(e.key==='Tab'){const items=[...this.panel.querySelectorAll<HTMLElement>('button,input')].filter(n=>n.getClientRects().length&&!(n as HTMLButtonElement).disabled);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    };
    for(const event of [Settings.DESK_TYPE_CHANGE,Settings.POKER_CARD_TYPE_CHANGE,Settings.SHORTCUTS_CHANGGE,Settings.SOUND_ON_CHANGE,Settings.SHOW_BB])this.off.push(settings.on(event,()=>this.refresh()));
    this.selectTab(0);this.refresh();
  }
  private button(key:string,click:()=>void):HTMLButtonElement{const b=element('button','',()=>i18nMgr.Get(key));b.type='button';b.onclick=click;return b;}
  private heading(key:string):HTMLElement{return element('h3','',()=>i18nMgr.Get(key));}
  private selectTab(index:number):void{this.pages.forEach((p,i)=>p.hidden=i!==index);this.tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});this.body.scrollTop=0;this.fitHeight();}
  private async choose(load:()=>Promise<()=>void>):Promise<void>{const generation=++this.generation;this.status.textContent='';this.panel.setAttribute('aria-busy','true');try{const apply=await load();if(generation===this.generation)apply();}catch(e){if(generation===this.generation)this.status.textContent=e instanceof Error?e.message:String(e);}finally{if(generation===this.generation)this.panel.removeAttribute('aria-busy');}}
  private refresh():void{
    this.desks.forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===settings.deskType)));
    this.cards.forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===settings.pokerCardType)));
    this.modes.forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===settings.shortCutMode)));
    this.switches[0]!.setAttribute('aria-checked',String(settings.soundOn));this.switches[1]!.setAttribute('aria-checked',String(settings.showBB));
    this.switchStates.forEach((label,i)=>i18nLabel.bind(label,()=>i18nMgr.Get(this.switches[i]!.getAttribute('aria-checked')==='true'?'UICreateRoom_Opened':'UIMineSixCloseHas')));
    // Keep focused buttons in place when the ratio or another setting changes.
    if(this.shortcuts.children.length!==settings.shortCuts.length){
      this.shortcuts.replaceChildren(...settings.shortCuts.map((_,i)=>{
        const b=element('button','mx-settings-shortcut');b.type='button';
        b.append(element('span','mx-settings-pot-label',()=>i18nMgr.Get('adaptation20005')),element('span','mx-settings-pot-ratio'));
        b.onclick=()=>{this.selectedShortcut=i;this.refresh();};return b;
      }));
    }
    settings.shortCuts.forEach((cut,i)=>{
      const b=this.shortcuts.children[i]!;
      b.setAttribute('aria-pressed',String(i===this.selectedShortcut));
      b.querySelector('.mx-settings-pot-ratio')!.textContent=cut.name;
    });
    const indices=settings.shortCutMode===1?settings.shortCut3ActionsIndex:settings.shortCut5ActionsIndex;
    this.slider.value=String(indices[this.selectedShortcut]??0);this.ratio.textContent=settings.getShortCut(Number(this.slider.value)).name;
    this.slider.setAttribute('aria-valuetext',this.ratio.textContent);
    const progress=Number(this.slider.value)/Number(this.slider.max);
    this.range.style.setProperty('--ratio-position',`calc(${progress*100}% + ${(0.5-progress)*75} * var(--settings-unit))`);
  }
  onFrameResize(width:number,height:number):void{
    // Preserve CC's 1100-unit panel proportions; short viewports scroll the body.
    const unit=Math.min(width/1440,Math.max(280,height*0.85)/1100,520/1100);
    this.frameHeight=height;
    const panelWidth=Math.min(width-16,1100*unit);
    this.root.style.setProperty('--dialog-width',`${panelWidth}px`);
    this.root.style.setProperty('--settings-unit',`${panelWidth/1100}px`);
    this.fitHeight();
  }
  private fitHeight():void {
    if(!this.frameHeight||this.root.hidden)return;
    this.root.dataset.short='false';
    const fixed=this.panel.offsetHeight-this.body.clientHeight;
    this.root.dataset.short=String(fixed+this.body.scrollHeight>this.frameHeight-32);
  }
  open():void{this.focus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;this.root.hidden=false;this.selectTab(0);this.tabs[0]?.focus({preventScroll:true});}
  close():void{this.generation++;this.panel.removeAttribute('aria-busy');this.root.hidden=true;this.focus?.focus({preventScroll:true});}
  destroy():void{this.generation++;this.off.forEach(off=>off());this.root.remove();}
}
