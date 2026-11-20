import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { LayoutPreview } from '../../appearance/LayoutPreview.js';
import { cardBacks } from '../../appearance/TableSkin.js';
import { renderedTableAppearance } from '../../appearance/TableAppearanceContext.js';
import defaultSettings, { TexasGamePersonalSettings as Settings, shortCutMode, TABLE_CARD_BACKS, TABLE_FELT_COLORS, TABLE_SIZE_STEPS, type TableLayoutId } from '../../../../../data/TexasGamePersonalSettings.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { element } from '../../dom.js';
import { CardView } from '../CardView/CardView.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { DeskPreview } from '../DeskPreview/DeskPreview.js';
import { AppearanceResources } from '../../AppearanceResources.js';
/** 牌桌个性设置。标题和标签页固定，选项在各自的内容区滚动。 */
export class PersonalSettingsView {
  readonly root = componentBox(element('div', 'mx-settings-overlay mx-dialog-overlay'),config);
  private body = element('div','mx-settings-body');
  private frameHeight=0;
  private panelHeight=0;
  private panel = element('section', 'mx-settings-panel mx-personal-settings mx-dialog-glass');
  private status = element('p', 'mx-settings-status');
  private pages: HTMLElement[] = [];
  private tabs: HTMLButtonElement[] = [];
  private desks: HTMLButtonElement[] = [];
  private deskExpand = element('button','mx-settings-expand');
  private cards: HTMLButtonElement[] = [];
  private shortcuts = element('div', 'mx-settings-shortcuts');
  private modes: HTMLButtonElement[] = [];
  private appearanceRefresh: (()=>void)[] = [];
  private submitModes: HTMLButtonElement[] = [];
  private switches: HTMLButtonElement[] = [];
  private switchStates: HTMLElement[] = [];
  private range = element('div', 'mx-settings-slider');
  private slider = element('input', 'mx-settings-range');
  private ratio = element('output', 'mx-settings-ratio');
  private selectedShortcut = 0;
  private generation = 0;
  private off: (() => void)[] = [];
  private focus?: HTMLElement;
  constructor(private settings: Settings = defaultSettings) {
    this.root.hidden = true;
    this.panel.setAttribute('role','dialog'); this.panel.setAttribute('aria-modal','true');
    i18nLabel.bind(this.panel,()=>i18nMgr.Get('UIGameplaySetting_CardTableSetting'),'aria-label');
    i18nLabel.bind(this.panel,()=>i18nMgr.language,'data-language');
    const title=element('h2','',()=>i18nMgr.Get('UIGameplaySetting_CardTableSetting'));
    const tabs=element('div','mx-settings-tabs');tabs.setAttribute('role','tablist');
    ['UIGameplaySetting_CardTableSetting','UIGameplaySetting_QuickFillingSetting','UIGameplaySetting_SystemSetting'].forEach((key,i)=>{
      const tab=this.button(key,()=>this.selectTab(i));tab.setAttribute('role','tab');
      const mark=element('span','mx-settings-tab-selected');SpriteAtlas.paint(mark,config.paths.settingsTabSelected);mark.setAttribute('aria-hidden','true');tab.append(mark);
      tab.onkeydown=e=>{
        if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
        e.preventDefault();
        const available=this.tabs.filter(button=>!button.hidden);
        const next=available[(available.indexOf(tab)+(e.key==='ArrowRight'?1:-1)+available.length)%available.length]!;
        this.selectTab(this.tabs.indexOf(next));
        next.focus({preventScroll:true});
      };
      tabs.append(tab);this.tabs.push(tab);
      const page=element('div',`mx-settings-page mx-settings-${['appearance','quick','system'][i]}`);page.setAttribute('role','tabpanel');this.pages.push(page);
    });
    const appearance=this.pages[0]!;
    const fixed=element('div','mx-settings-fixed');
    const options=element('div','mx-settings-appearance-options');
    const amountModes=element('div','mx-settings-modes mx-settings-option-pair');
    for(const [bb,key] of [[false,'MX_NumberAmount'],[true,'MX_BBAmount']] as const){const b=this.button(key,()=>this.settings.setShowBBToStorage(bb));amountModes.append(b);this.appearanceRefresh.push(()=>b.setAttribute('aria-pressed',String(this.settings.showBB===bb)));}
    const backHeading=this.heading('MX_CardBacks');
    fixed.append(this.heading('MX_AmountDisplay'),amountModes);
    const backs=element('div','mx-settings-backs');
    for(const color of TABLE_CARD_BACKS){const b=element('button','mx-settings-back');b.type='button';b.setAttribute('aria-label',color);const img=element('img','');img.src=cardBacks[color]!;img.alt='';b.append(img);b.onclick=()=>this.settings.updateAppearance({cardBack:color});this.appearanceRefresh.push(()=>b.setAttribute('aria-pressed',String(this.settings.appearance.cardBack===color)));backs.append(b);}
    const deckHeading=this.heading('UITexasSetting_qAONskmY');

    const decks=element('div','mx-settings-decks');
    for(const type of [1,2] as const){
      const b=element('button','mx-settings-deck');b.type='button';b.setAttribute('aria-label',String(type));
      SpriteAtlas.paint(b,config.paths.settingsCardOption);const selected=element('span','mx-settings-card-selected');SpriteAtlas.paint(selected,config.paths.settingsCardSelected);b.append(selected);
      for(const value of (type===1?[10,56,42,28]:[57,41,22,13])){const card=element('span','mx-card');CardView.paint(card,value,false,type);b.append(card);}
      b.onclick=()=>{void this.choose(async()=>{await AppearanceResources.cards(type);return()=>this.settings.setPokerCardTypeToStorage(type);});};
      this.cards.push(b);decks.append(b);
    }
    const sizeHeading=this.heading('MX_DisplaySize');

    const sizes=element('div','mx-settings-sizes');
    for(const [field,key] of [['publicCardSize','MX_PublicCardSize'],['tableTextSize','MX_TableTextSize'],['betButtonSize','MX_BetButtonSize']] as const){
      const group=element('label','mx-settings-size');const label=element('span','',()=>i18nMgr.Get(key));const output=element('output','');const input=element('input','');input.type='range';input.min='0';input.max='4';input.step='1';i18nLabel.bind(input,()=>i18nMgr.Get(key),'aria-label');
      input.oninput=()=>this.settings.updateAppearance({[field]:TABLE_SIZE_STEPS[Number(input.value)]});
      this.appearanceRefresh.push(()=>{input.value=String(TABLE_SIZE_STEPS.indexOf(this.settings.appearance[field] as 100));output.textContent=`${this.settings.appearance[field]}%`;});group.append(label,output,input);sizes.append(group);
    }
    const layouts=element('div','mx-settings-layouts');
    for(const id of (['original','classic','balanced','oval'] as TableLayoutId[]).filter(id=>this.settings.availableLayouts.includes(id))){const b=element('button','');b.type='button';b.onclick=()=>this.settings.updateAppearance({layout:id});b.dataset.layout=id;b.append(new LayoutPreview(id,config.paths[`layout_${id}`]).root,element('span','',()=>i18nMgr.Get(`MX_Layout_${id}`)));this.appearanceRefresh.push(()=>b.setAttribute('aria-pressed',String(this.settings.appearance.layout===id)));layouts.append(b);}
    fixed.append(this.heading('MX_TableLayout'),layouts);
    options.append(deckHeading,decks,backHeading,backs,sizeHeading,sizes,this.heading('MX_TableStyle'));
    appearance.append(fixed,options);
    // 这组控件只出现在经典、均衡环形和竞技椭圆，初代仍可切换布局与编号桌布。
    this.appearanceRefresh.push(()=>{
      for(const node of [backHeading,backs,sizeHeading,sizes])node.hidden=!this.settings.supportsLayoutCustomization;
    });
    // 桌布类型和图片共用同一选择序号，切换类型后忽略在途图片的旧选择。
    const colors=element('div','mx-settings-colors');
    for(const color of TABLE_FELT_COLORS){const b=element('button','');b.type='button';b.style.backgroundColor=color;b.setAttribute('aria-label',color);b.onclick=()=>this.settings.updateAppearance({feltColor:color});this.appearanceRefresh.push(()=>b.setAttribute('aria-pressed',String(this.settings.appearance.feltColor===color)));colors.append(b);}
    const pictures=element('div','mx-settings-pictures');
    const desks=element('div','mx-settings-desks');
    for(let i=1;i<=14;i++){
      const b=element('button','mx-settings-desk');b.type='button';b.setAttribute('aria-label',String(i));
      SpriteAtlas.paint(b,config.paths.settingsDeskOption);
      const selected=element('span','mx-settings-desk-selected');SpriteAtlas.paint(selected,config.paths.settingsDeskSelected);
      b.append(selected,new DeskPreview(i).root,element('span','mx-settings-desk-name',`Table ${i}`));
      b.onclick=()=>{
        void this.choose(async()=>{
          await AppearanceResources.desk(i);
          return()=>{this.settings.setDeskTypeToStorage(i);this.settings.updateAppearance({style:'legacy'});};
        });
      };
      this.desks.push(b);desks.append(b);
    }
    const expand=this.deskExpand;
    const expandLabel=element('span','',()=>i18nMgr.Get('UIGameplaySetting_DesktopSettingTip'));
    const expandArrow=element('span','mx-settings-expand-arrow');expandArrow.setAttribute('aria-hidden','true');expand.append(expandLabel,expandArrow);expand.type='button';expand.setAttribute('aria-expanded',String(this.settings.deskType>4));
    expand.onclick=()=>{const open=expand.getAttribute('aria-expanded')!=='true';expand.setAttribute('aria-expanded',String(open));this.desks.forEach((b,i)=>b.hidden=i>=4&&!open);this.fitHeight();};
    this.desks.forEach((b,i)=>b.hidden=i>=4&&this.settings.deskType<=4);
    pictures.append(desks,expand);
    const colorHeading=element('h3','',()=>i18nMgr.Get('MX_FeltColor',[],'颜色选择'));
    options.append(pictures,colorHeading,colors);
    const solidChoice=this.button('MX_SolidFelt',()=>{void this.choose(async()=>()=>this.settings.updateAppearance({style:'solid'}));});
    solidChoice.replaceChildren(element('span','mx-settings-desk-name',()=>i18nMgr.Get('MX_SolidFelt')));solidChoice.className='mx-settings-desk mx-settings-solid';this.desks[0]!.after(solidChoice);
    this.appearanceRefresh.push(()=>{
      const solid=renderedTableAppearance(this.root,this.settings).style==='solid';
      const modern=this.settings.supportsLayoutCustomization;
      appearance.dataset.modern=String(modern);
      solidChoice.hidden=!modern;solidChoice.setAttribute('aria-pressed',String(solid));
      pictures.hidden=false;expand.hidden=true;this.desks.forEach(b=>b.hidden=false);
      colors.hidden=colorHeading.hidden=!modern||!solid;
    });
    const quick=this.pages[1]!;
    const submitHeading=this.heading('MX_SliderSubmit');
    const submitModes=element('div','mx-settings-modes mx-settings-submit-modes');
    for(const [mode,key] of [['release','MX_SliderRelease'],['confirm','MX_SliderConfirm']] as const){
      const b=this.button(key,()=>this.settings.setSliderSubmit(mode));
      this.submitModes.push(b);submitModes.append(b);
    }
    quick.append(submitHeading,submitModes,this.heading('UIGameplaySetting_QuickFillingSetting_GameButton'));
    this.appearanceRefresh.push(()=>{
      submitHeading.hidden=submitModes.hidden=!this.settings.supportsLayoutCustomization;
    });
    const modes=element('div','mx-settings-modes');
    for(const mode of [shortCutMode.Button3,shortCutMode.Button5]){
      const b=element('button','',()=>i18nMgr.Get('UIGameplaySetting_DesktopSetting_MultiButton',[mode===1?3:5]));b.type='button';
      b.onclick=()=>{this.selectedShortcut=0;this.settings.shortCutMode=mode;};this.modes.push(b);modes.append(b);
    }
    this.slider.type='range';this.slider.min='10';this.slider.max='100';this.slider.step='1';
    i18nLabel.bind(this.slider,()=>i18nMgr.Get('UIGameplaySetting_CustomPotTip'),'aria-label');
    this.slider.oninput=()=>this.settings.setCustomPotRatio(this.selectedShortcut,Number(this.slider.value));
    const custom=element('div','mx-settings-custom');
    const handle=element('span','mx-settings-range-handle');SpriteAtlas.paint(handle,config.paths.sliderHandle);handle.setAttribute('aria-hidden','true');
    const track=element('span','mx-settings-range-track');track.setAttribute('aria-hidden','true');
    this.range.append(track,this.ratio,handle,this.slider);
    const limits=element('div','mx-settings-range-limits');
    limits.append(element('span','','10%'),element('span','','100%'));
    custom.append(this.heading('UIGameplaySetting_CustomPotTip'),this.range,limits);
    const reset=this.button('MX_ResetQuickSettings',()=>{this.selectedShortcut=0;this.settings.resetQuickSettings();});reset.className='mx-settings-reset';quick.append(modes,this.shortcuts,custom,reset);
    const system=this.pages[2]!;
    for(const [key,get,set] of [
      ['UITexasSetting_LrI45uIK',()=>this.settings.soundOn,(v:boolean)=>this.settings.setSoundOnToStorage(v)],
    ] as const){const row=element('div','mx-settings-system-row');const b=element('button','mx-settings-switch');b.type='button';b.setAttribute('role','switch');i18nLabel.bind(b,()=>i18nMgr.Get(key),'aria-label');b.onclick=()=>set(!get());this.switches.push(b);
      const state=element('span','mx-settings-switch-state',()=>i18nMgr.Get(get()?'UICreateRoom_Opened':'UIMineSixCloseHas'));this.switchStates.push(state);
      row.append(element('span','mx-settings-system-label',()=>i18nMgr.Get(key)),state,b);system.append(row);}
    this.body.append(...this.pages);
    this.status.setAttribute('role','status');this.panel.append(title,tabs,this.body,this.status);this.root.append(this.panel);
    this.root.onclick=e=>{if(e.target===this.root)this.close();};
    this.root.onkeydown=e=>{
      if(e.key==='Escape'){e.stopPropagation();this.close();}
      if(e.key==='Tab'){const items=[...this.panel.querySelectorAll<HTMLElement>('button,input')].filter(n=>n.getClientRects().length&&!(n as HTMLButtonElement).disabled);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    };
    for(const event of [Settings.APPEARANCE_CHANGE,Settings.SLIDER_SUBMIT_CHANGE,Settings.DESK_TYPE_CHANGE,Settings.POKER_CARD_TYPE_CHANGE,Settings.SHORTCUTS_CHANGGE,Settings.SOUND_ON_CHANGE,Settings.SHOW_BB])this.off.push(this.settings.on(event,()=>this.refresh()));
    this.off.push(this.settings.on(Settings.ACCOUNT_CHANGE,()=>{this.generation++;this.selectedShortcut=0;this.close();this.refresh();}));
    this.selectTab(0);this.refresh();
  }
  private button(key:string,click:()=>void):HTMLButtonElement{const b=element('button','',()=>i18nMgr.Get(key));b.type='button';b.onclick=click;return b;}
  private heading(key:string):HTMLElement{return element('h3','',()=>i18nMgr.Get(key));}
  private selectTab(index:number):void{
    if(this.tabs[index]?.hidden)index=0;
    this.pages.forEach((p,i)=>p.hidden=i!==index);
    this.tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});
    this.body.scrollTop=0;this.fitHeight();
  }
  private async choose(load:()=>Promise<()=>void>):Promise<void>{const generation=++this.generation;this.status.textContent='';this.panel.setAttribute('aria-busy','true');try{const apply=await load();if(generation===this.generation)apply();}catch(e){if(generation===this.generation)this.status.textContent=e instanceof Error?e.message:String(e);}finally{if(generation===this.generation)this.panel.removeAttribute('aria-busy');}}
  private refresh():void{
    this.appearanceRefresh.forEach(refresh=>refresh());
    // Legacy tables also retain the quick-bet mode and ratio controls.
    this.tabs[1]!.hidden=false;
    this.submitModes.forEach((b,i)=>b.setAttribute('aria-pressed',String(this.settings.tableSliderSubmit===(i===0?'release':'confirm'))));
    const numbered=renderedTableAppearance(this.root,this.settings).style==='legacy';
    this.desks.forEach((b,i)=>b.setAttribute('aria-pressed',String(numbered&&i+1===this.settings.deskType)));
    this.cards.forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===this.settings.pokerCardType)));
    this.modes.forEach((b,i)=>b.setAttribute('aria-pressed',String(i+1===this.settings.shortCutMode)));
    this.switches[0]!.setAttribute('aria-checked',String(this.settings.soundOn));
    this.switchStates.forEach((label,i)=>i18nLabel.bind(label,()=>i18nMgr.Get(this.switches[i]!.getAttribute('aria-checked')==='true'?'UICreateRoom_Opened':'UIMineSixCloseHas')));
    // 修改底池比例时复用按钮节点，保留焦点。
    if(this.shortcuts.children.length!==this.settings.shortCuts.length){
      this.shortcuts.replaceChildren(...this.settings.shortCuts.map((_,i)=>{
        const b=element('button','mx-settings-shortcut');b.type='button';
        b.append(element('span','mx-settings-pot-label',()=>i18nMgr.Get('adaptation20005')),element('span','mx-settings-pot-ratio'));
        b.onclick=()=>{this.selectedShortcut=i;this.refresh();};return b;
      }));
    }
    this.settings.shortCuts.forEach((cut,i)=>{
      const b=this.shortcuts.children[i]!;
      b.setAttribute('aria-pressed',String(i===this.selectedShortcut));
      b.querySelector('.mx-settings-pot-ratio')!.textContent=cut.name;
    });
    const percent=Math.round((this.settings.shortCuts[this.selectedShortcut]?.percent??0.5)*100);
    this.slider.value=String(percent);this.ratio.textContent=`${percent}%`;
    this.slider.setAttribute('aria-valuetext',this.ratio.textContent);
    const progress=(Number(this.slider.value)-10)/90;
    this.range.style.setProperty('--ratio-position',`calc(${progress*100}% + ${(0.5-progress)*config.layout.thumbWidth} * var(--settings-unit))`);
    this.fitHeight();
  }
  onFrameResize(width:number,height:number):void{
    // 沿用 CC 的等比缩放规则，短屏让内容区滚动。
    this.frameHeight=height;
    const panelWidth=Math.min(width-config.layout.widthGap,config.layout.designWidth*Math.min(width/config.layout.screenWidth,config.layout.maxScale));
    this.panelHeight=Math.min(height-config.layout.heightGap,panelWidth*config.layout.designHeight/config.layout.designWidth);
    this.root.style.setProperty('--dialog-width',`${panelWidth}px`);
    this.root.style.setProperty('--settings-unit',`${panelWidth/config.layout.unitWidth}px`);
    this.fitHeight();
  }
  private fitHeight():void {
    if(!this.frameHeight||this.root.hidden)return;
    const compact=false;
    this.panel.dataset.compact=String(compact);
    this.panel.style.height=compact?'auto':`${this.panelHeight}px`;
    this.root.dataset.short='false';
    const fixed=this.panel.offsetHeight-this.body.clientHeight;
    this.root.dataset.short=String(fixed+this.body.scrollHeight>this.frameHeight-config.layout.heightGap);
  }
  open():void{this.focus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;this.root.hidden=false;this.selectTab(0);this.tabs[0]?.focus({preventScroll:true});}
  close():void{this.generation++;this.panel.removeAttribute('aria-busy');this.root.hidden=true;this.focus?.focus({preventScroll:true});}
  destroy():void{this.generation++;this.off.forEach(off=>off());this.root.remove();}
}
