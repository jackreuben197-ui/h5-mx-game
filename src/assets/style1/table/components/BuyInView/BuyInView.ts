import { AnchoredPopup } from '../../AnchoredPopup.js';
import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { DiamondPurchaseView } from '../DiamondPurchaseView/DiamondPurchaseView.js';
import type { RoomRecords } from '../../../../../core/RoomRecords.js';
import type { TableConfirmDialog } from '../TableConfirmDialog/TableConfirmDialog.js';
import '../../diamond-purchase.css';
import { GameplayTableSettingView } from '../GameplayTableSettingView/GameplayTableSettingView.js';
import '../../buyin-settings.css';
import './layout.css';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { BuyInData, type BuyInState } from '../../../../../data/BuyInData.js';
import { BuyInController } from '../../../../../logic/BuyInController.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { WalletSelectView } from '../WalletSelectView/WalletSelectView.js';
export class BuyInView {
  readonly root = componentBox(element('section','mx-buyin-overlay mx-dialog-overlay'),config);
  private panel = element('div','mx-buyin-panel mx-dialog-glass');
  private title = element('h2','mx-buyin-title');
  private details = element('div','mx-buyin-details');
  private amountBox = element('div','mx-buyin-amount-area');
  private amount = element('output','mx-buyin-amount');
  private sliderRail = element('span','mx-buyin-slider-rail');
  private autoArea = element('div','mx-buyin-auto-area');
  private slider = element('input','mx-buyin-slider');
  private limits = element('div','mx-buyin-limits');
  private wallet: WalletSelectView;
  private walletTitle = element('span','mx-buyin-wallet-title',() => i18nMgr.Get("UIHoldemAddChipsPaywallet", [], "支付钱包"));
  private amountTitle = element('span', 'mx-buyin-amount-title');
  private tipButton = element('button', 'mx-buyin-tip-button');
  private tip = element('p', 'mx-buyin-tip', () => i18nMgr.Get("UIBringInTips", [], "带入上桌金额和押金，其中押金的作用为代替余额不足时使用，在退出牌桌后剩余押金正常结算返还"));
  private auto = element('input','mx-buyin-auto');
  private autoLabel = element('label','mx-buyin-auto-label',() => i18nMgr.Get("UICreate_AutoRechage", [], "自动充值"));
  private error = element('p','mx-buyin-error');
  private confirm = element('button','mx-buyin-confirm');
  private close = element('button','mx-buyin-close',() => i18nMgr.Get("UIBackDialog_ticketsbtnClose", [], "关闭"));
  private bindings = new BindingScope(this);
  private settings:GameplayTableSettingView;
  private body=element('div','mx-buyin-body');
  private footer=element('div','mx-buyin-footer');
  private cancel=element('button','mx-buyin-cancel',()=>i18nMgr.Get('UIBackDialog_ticketsbtnClose'));
  private lastStep='';
  private tabs=element('div','mx-buyin-tabs');
  private purchase?:DiamondPurchaseView;
  private diamondTab=false;
  private frame?:{width:number;height:number};
  constructor(private controller: BuyInController,private records?:RoomRecords,confirmDialog?:TableConfirmDialog) {
    this.settings=new GameplayTableSettingView(controller.settings);
    this.cancel.type='button';this.cancel.onclick=()=>controller.skipNotices();
    i18nMgr.register(this);
    this.root.hidden = true;
    this.root.setAttribute('role','dialog'); this.root.setAttribute('aria-modal','true'); i18nLabel.bind(this.root, () => i18nMgr.Get("MX_SeatAndBuyIn", [], "坐下与带入"), 'aria-label');
    this.slider.type='range'; i18nLabel.bind(this.slider, () => i18nMgr.Get("UITexas_AddChips", [], "带入筹码"), 'aria-label');
    this.slider.oninput=()=>{const q=controller.data.state.quote;if(q)controller.data.update({amount:Math.min(q.max,q.min+Number(this.slider.value)*q.step)});};
    this.wallet = new WalletSelectView(new AnchoredPopup(this.root,this.body), clubID => controller.data.update({clubID}));
    this.tipButton.type='button';i18nLabel.bind(this.tipButton, () => i18nMgr.Get("MX_BuyInDepositDetails", [], "带入押金说明"), 'aria-label');
    SpriteAtlas.paintWarning(this.tipButton, config.paths.infoTip);this.tip.hidden=true;
    this.tipButton.onclick=()=>{this.tip.hidden=!this.tip.hidden;this.tipButton.setAttribute('aria-expanded',String(!this.tip.hidden));};
    this.auto.type='checkbox'; this.auto.onchange=()=>controller.data.update({auto:this.auto.checked}); this.autoLabel.append(this.auto);
    this.confirm.type='button'; this.confirm.onclick=()=>controller.data.state.step==='amount'?void controller.submit():controller.next();
    this.close.type='button'; this.close.textContent='×';i18nLabel.bind(this.close, () => i18nMgr.Get("MX_CloseBuyIn", [], "关闭带入窗口"), 'aria-label');this.close.onclick=()=>controller.close();
    this.root.onclick=(event)=>{if(event.target===this.root)controller.close();};
    this.root.onkeydown=(event)=>{if(event.key==='Escape'&&!this.wallet.close(true))controller.close();};
    SpriteAtlas.paint(this.confirm,config.paths.dialogConfirm);
    const sliderHandle=element('span','mx-buyin-slider-handle');
    SpriteAtlas.paint(sliderHandle,config.paths.sliderHandle);this.sliderRail.append(sliderHandle);
    const autoSwitch=element('span','mx-buyin-switch');const knob=element('span','mx-buyin-switch-knob');
    const switchTrack=element('span','mx-buyin-switch-track');
    // CC SwitchNode tints the white track; keep the handle outside that tint.
    SpriteAtlas.mask(switchTrack,config.paths.switchTrack,'var(--mx-switch-color)');
    SpriteAtlas.paint(knob,config.paths.switchKnob);autoSwitch.append(switchTrack,knob);this.autoLabel.append(autoSwitch);
    this.autoArea.append(this.autoLabel,element('p','mx-buyin-auto-description',() => i18nMgr.Get("UIAutoRechageTips", [], "如果您不想将筹码自动带到牌桌，请不要使用此工具")),element('p','mx-buyin-auto-description',() => i18nMgr.Get("UIGesPwdTip5", [], "选择后，带入时无安全验证")));
    const sliderTrack=element('div','mx-buyin-slider-track');sliderTrack.append(this.sliderRail,this.slider);
    const amountHeading = element('div', 'mx-buyin-amount-heading');amountHeading.append(this.amountTitle,this.tipButton);
    const amountSection=element('div','mx-buyin-amount-section');
    
    amountSection.append(amountHeading,this.tip,this.amount,element('span','mx-buyin-amount-caption',() => i18nMgr.Get("UITexas_AddChips", [], "带入筹码")),sliderTrack,this.limits);
    this.amountBox.append(amountSection,this.autoArea,this.walletTitle,this.wallet.root);
    this.body.append(this.settings.root,this.details,this.amountBox,this.error);
    this.footer.append(this.cancel,this.confirm);
    this.panel.append(this.title,this.body,this.close,this.footer); this.root.prepend(this.panel);
    if(records?.diamondPurchase&&confirmDialog){
      this.purchase=new DiamondPurchaseView(records.diamondPurchase,confirmDialog);this.body.append(this.purchase.root);this.root.append(this.purchase.receipt.root);
      for(const [diamond,key] of [[true,'UIMine_VIP_diamond'],[false,'UIClub_RoomSitApplyRecords_title']] as const){const button=element('button','',()=>i18nMgr.Get(key,[],diamond?'钻石':'带入申请'));button.onclick=()=>this.changeTab(diamond);button.dataset.diamond=String(diamond);this.tabs.append(button);}
      this.panel.insertBefore(this.tabs,this.title);
    }
    this.bindings.bind({buyin:controller.data});
  }
  refreshLanguage(): void { if (this.root.isConnected) this.render(this.controller.data.state); }
  @bindEvent(BuyInData.CHANGE,'buyin')
  private render(s: BuyInState): void {
    this.root.hidden=s.step==='closed';
    this.panel.dataset.step=s.step;
    const settingsStep=s.step==='security'||s.step==='rules';
    this.settings.show(settingsStep?s.step as 'security'|'rules':null);
    this.details.hidden=settingsStep;this.cancel.hidden=!settingsStep;this.close.hidden=true;
    if(this.lastStep!==s.step){this.body.scrollTop=0;this.lastStep=s.step;}
    i18nLabel.bind(this.title, () => ({closed:'',loading:i18nMgr.Get("MX_LoadingBuyInDetails", [], "正在获取带入信息"),security:i18nMgr.Get("UISecuritySetting_title", [], "安全提示"),rules:i18nMgr.Get("UITableSetting_title", [], "牌局配置"),amount:s.quote?.mode==='add'?i18nMgr.Get('UITexas_AddChipsMenu'):s.quote?.returnAmount!==undefined?i18nMgr.Get("MX_ReturnBuyIn", [], "返场带入"):i18nMgr.Get("UIClub_RoomSitApplyRecords_title", [], "带入申请")}[s.step]));
    const q=s.quote;
    this.amountBox.hidden=s.step!=='amount';
    this.details.replaceChildren();
    if(q) {
      const money=StringHelper.GetLongString;
      const rows=s.step==='amount'?[[i18nMgr.Get("UITexas_smallBigBlind", [], "小盲/大盲"),`${money(q.smallBlind)}/${money(q.smallBlind*2)}`],[i18nMgr.Get("UIClub_CreateRoom31", [], "余额"),StringHelper.GetLongStringLocale(q.wallets.find(w=>w.club_id===s.clubID)?.gold??0)]]:[];
      if(q.funding==='score')rows.splice(1);
      if(q.funding==='diamond' && rows.length>1)rows[1]=[i18nMgr.Get('UIClub_CreateRoom31'),StringHelper.GetLongStringLocale(q.diamondBalance??0,1,0)];
      this.walletTitle.hidden=this.wallet.root.hidden=q.funding==='score'||q.funding==='diamond';
      for(const [label,value] of rows) {
        const row=element('div','mx-buyin-detail');const labelNode=element('span','mx-buyin-detail-label',label);
        if(label===i18nMgr.Get("UIClub_CreateRoom31", [], "余额")) {const icon=element('span','mx-buyin-coin');SpriteAtlas.paint(icon,q.funding==='diamond'?config.paths.recordDiamond:config.paths.chip);labelNode.prepend(icon);}
        row.append(labelNode,element('span','',value));this.details.append(row);
      }
      i18nLabel.bind(this.amountTitle, () => q.deposit?i18nMgr.Get("MX_BuyInDeposit", [], "带入筹码 + 押金"):i18nMgr.Get("UITexas_AddChips", [], "带入筹码"));
      this.tipButton.hidden=!q.deposit;if(!q.deposit)this.tip.hidden=true;
      const steps=Math.ceil((q.max-q.min)/q.step);
      this.amount.textContent=q.deposit?`${money(s.amount-q.deposit)} + ${money(q.deposit)}`:money(s.amount); this.slider.min='0';this.slider.max=String(steps);this.slider.step='1';this.slider.value=String(Math.ceil((s.amount-q.min)/q.step));
      this.limits.replaceChildren(element('span','',() => i18nMgr.Get("The_smallest", [], "最小")),element('span','',() => i18nMgr.Get("Maximum", [], "最大")));
      this.slider.setAttribute('aria-valuetext',`${money(s.amount)}，最小 ${money(q.min)}，最大 ${money(q.max)}`);
      this.sliderRail.style.setProperty('--mx-buyin-slider-progress',`${steps>0?this.slider.valueAsNumber/steps*100:0}%`);
      this.wallet.render(q.wallets.filter(w=>q.returnClubID===undefined||w.club_id===q.returnClubID),s.clubID,s.busy);
      this.autoArea.hidden=true;this.auto.checked=false;
    }
    this.error.textContent=s.error;
    this.confirm.hidden=s.step==='loading';i18nLabel.bind(this.confirm, () => s.step==='security'?i18nMgr.Get("UITableSetting_nextPage", [], "下一页"):i18nMgr.Get("UITexas_confirm", [], "确定"));
    if(s.step==='closed'){this.diamondTab=false;this.purchase?.reset();}
    if(s.step==='amount'&&q?.funding==='diamond'&&s.error===i18nMgr.Get('UISend_diamondsNo'))this.changeTab(true);
    this.refreshTabs();
    this.confirm.disabled=s.busy;this.close.disabled=s.busy;this.slider.disabled=s.busy||q?.min===q?.max;this.auto.disabled=s.busy;
  }
  private changeTab(diamond:boolean):void{
    this.diamondTab=diamond&&!this.records?.config.global.isChannelDiamondFreeMode;
    if(this.diamondTab)void this.purchase?.open();else this.purchase?.close();
    this.refreshTabs();
  }
  private refreshTabs():void{
    const enabled=!!this.purchase&&!this.records?.config.global.isChannelDiamondFreeMode&&this.controller.data.state.step==='amount';
    this.tabs.hidden=!enabled;this.title.hidden=enabled;
    const diamond=enabled&&this.diamondTab;
    this.panel.classList.toggle('mx-buyin-diamond-tab',diamond);
    this.details.hidden=this.amountBox.hidden=diamond||this.controller.data.state.step!=='amount';
    if(this.amountBox.hidden||this.wallet.root.hidden)this.wallet.close();
    this.footer.hidden=diamond;
    for(const button of this.tabs.querySelectorAll('button'))button.setAttribute('aria-selected',String((button.dataset.diamond==='true')===diamond));
    if(this.frame)this.onFrameResize(this.frame.width,this.frame.height);
  }
  onFrameResize(width:number,height:number):void {
    this.frame={width,height};
    const desktop=width>height;
    this.root.dataset.desktop=String(desktop);
    const unit=desktop
      ? Math.min((width-config.layout.widthGap)/config.layout.panelWidth,config.layout.desktopWidth/config.layout.panelWidth)
      : Math.min(width/config.layout.screenWidth,height/(this.diamondTab?config.layout.diamondHeight:config.layout.shortHeight),config.layout.maxWidth/config.layout.panelWidth);
    this.root.dataset.short=String(!desktop&&height<config.layout.shortHeight*unit);
    this.root.style.setProperty('--mx-setup-unit',`${unit}px`);
    this.root.style.setProperty('--dialog-width',`${Math.min(width-config.layout.widthGap,config.layout.panelWidth*unit)}px`);
    this.wallet.positionList();
  }
  destroy(): void { this.wallet.destroy();this.purchase?.destroy();this.settings.destroy();this.bindings.destroy();this.root.remove(); }
}
