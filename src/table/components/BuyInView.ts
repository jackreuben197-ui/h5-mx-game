import { GameplayTableSettingView } from './GameplayTableSettingView.js';
import '../buyin-settings.css';
import { i18nLabel } from '../../i18n/i18nLabel.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { BindingScope } from '../../binding/BindingScope.js';
import { bindEvent } from '../../binding/bindEvent.js';
import { BuyInData, type BuyInState } from '../../data/BuyInData.js';
import { BuyInController } from '../../logic/BuyInController.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { WalletSelectView } from './WalletSelectView.js';
export class BuyInView {
  readonly root = element('section','mx-buyin-overlay mx-dialog-overlay');
  private panel = element('div','mx-buyin-panel mx-dialog-glass');
  private title = element('h2','mx-buyin-title');
  private details = element('div','mx-buyin-details');
  private amountBox = element('div','mx-buyin-amount-area');
  private amount = element('output','mx-buyin-amount');
  private sliderHandle = element('span','mx-buyin-slider-handle');
  private autoArea = element('div','mx-buyin-auto-area');
  private slider = element('input','mx-buyin-slider');
  private limits = element('div','mx-buyin-limits');
  private wallet: WalletSelectView;
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
  constructor(private controller: BuyInController) {
    this.settings=new GameplayTableSettingView(controller.settings);
    this.cancel.type='button';this.cancel.onclick=()=>controller.close();
    i18nMgr.register(this);
    this.root.hidden = true;
    this.panel.setAttribute('role','dialog'); this.panel.setAttribute('aria-modal','true'); i18nLabel.bind(this.panel, () => i18nMgr.Get("MX_SeatAndBuyIn", [], "坐下与带入"), 'aria-label');
    this.slider.type='range'; i18nLabel.bind(this.slider, () => i18nMgr.Get("UITexas_AddChips", [], "带入筹码"), 'aria-label');
    this.slider.oninput=()=>controller.data.update({amount:Number(this.slider.value)});
    this.wallet = new WalletSelectView(clubID => controller.data.update({clubID}));
    this.tipButton.type='button';i18nLabel.bind(this.tipButton, () => i18nMgr.Get("MX_BuyInDepositDetails", [], "带入押金说明"), 'aria-label');
    SpriteAtlas.paintWarning(this.tipButton);this.tip.hidden=true;
    this.tipButton.onclick=()=>{this.tip.hidden=!this.tip.hidden;this.tipButton.setAttribute('aria-expanded',String(!this.tip.hidden));};
    this.auto.type='checkbox'; this.auto.onchange=()=>controller.data.update({auto:this.auto.checked}); this.autoLabel.append(this.auto);
    this.confirm.type='button'; this.confirm.onclick=()=>controller.data.state.step==='amount'?void controller.submit():controller.next();
    this.close.type='button'; this.close.textContent='×';i18nLabel.bind(this.close, () => i18nMgr.Get("MX_CloseBuyIn", [], "关闭带入窗口"), 'aria-label');this.close.onclick=()=>controller.close();
    this.root.onclick=(event)=>{if(event.target===this.root)controller.close();};
    this.root.onkeydown=(event)=>{if(event.key==='Escape')controller.close();};
    SpriteAtlas.paint(this.confirm,'dialogConfirm');
    SpriteAtlas.paint(this.sliderHandle,'sliderHandle');
    const autoSwitch=element('span','mx-buyin-switch');const knob=element('span','mx-buyin-switch-knob');
    const switchTrack=element('span','mx-buyin-switch-track');
    // CC SwitchNode tints the white track; keep the handle outside that tint.
    SpriteAtlas.mask(switchTrack,'switchTrack','var(--mx-switch-color)');
    SpriteAtlas.paint(knob,'switchKnob');autoSwitch.append(switchTrack,knob);this.autoLabel.append(autoSwitch);
    this.autoArea.append(this.autoLabel,element('p','mx-buyin-auto-description',() => i18nMgr.Get("UIAutoRechageTips", [], "如果您不想将筹码自动带到牌桌，请不要使用此工具")),element('p','mx-buyin-auto-description',() => i18nMgr.Get("UIGesPwdTip5", [], "选择后，带入时无安全验证")));
    const sliderTrack=element('div','mx-buyin-slider-track');sliderTrack.append(this.slider,this.sliderHandle);
    const amountHeading = element('div', 'mx-buyin-amount-heading');amountHeading.append(this.amountTitle,this.tipButton);
    const amountSection=element('div','mx-buyin-amount-section');
    
    amountSection.append(amountHeading,this.tip,this.amount,element('span','mx-buyin-amount-caption',() => i18nMgr.Get("UITexas_AddChips", [], "带入筹码")),sliderTrack,this.limits);
    this.amountBox.append(amountSection,this.autoArea,element('span','mx-buyin-wallet-title',() => i18nMgr.Get("UIHoldemAddChipsPaywallet", [], "支付钱包")),this.wallet.root);
    this.body.append(this.settings.root,this.details,this.amountBox,this.error);
    this.footer.append(this.cancel,this.confirm);
    this.panel.append(this.title,this.body,this.close,this.footer); this.root.append(this.panel);
    this.bindings.bind({buyin:controller.data});
  }
  refreshLanguage(): void { if (this.root.isConnected) this.render(this.controller.data.state); }
  @bindEvent(BuyInData.CHANGE,'buyin')
  private render(s: BuyInState): void {
    this.root.hidden=s.step==='closed';
    this.panel.dataset.step=s.step;
    const settingsStep=s.step==='security'||s.step==='rules';
    this.settings.show(settingsStep?s.step as 'security'|'rules':null);
    this.details.hidden=settingsStep;this.cancel.hidden=s.step!=='security';this.close.hidden=settingsStep;
    if(this.lastStep!==s.step){this.body.scrollTop=0;this.lastStep=s.step;}
    i18nLabel.bind(this.title, () => ({closed:'',loading:i18nMgr.Get("MX_LoadingBuyInDetails", [], "正在获取带入信息"),security:i18nMgr.Get("UISecuritySetting_title", [], "安全提示"),rules:i18nMgr.Get("UITableSetting_title", [], "牌局配置"),amount:s.quote?.mode==='add'?i18nMgr.Get('UITexas_AddChipsMenu'):s.quote?.returnAmount!==undefined?i18nMgr.Get("MX_ReturnBuyIn", [], "返场带入"):i18nMgr.Get("UIClub_RoomSitApplyRecords_title", [], "带入申请")}[s.step]));
    const q=s.quote;
    this.amountBox.hidden=s.step!=='amount';
    this.details.replaceChildren();
    if(q) {
      const money=StringHelper.GetLongString;
      const rows=s.step==='amount'?[[i18nMgr.Get("UITexas_smallBigBlind", [], "小盲/大盲"),`${money(q.smallBlind)}/${money(q.smallBlind*2)}`],[i18nMgr.Get("UIClub_CreateRoom31", [], "余额"),StringHelper.GetLongStringLocale(q.wallets.find(w=>w.club_id===s.clubID)?.gold??0)]]:[];
      for(const [label,value] of rows) {
        const row=element('div','mx-buyin-detail');const labelNode=element('span','mx-buyin-detail-label',label);
        if(label===i18nMgr.Get("UIClub_CreateRoom31", [], "余额")) {const icon=element('span','mx-buyin-coin');SpriteAtlas.paint(icon,'chip');labelNode.prepend(icon);}
        row.append(labelNode,element('span','',value));this.details.append(row);
      }
      i18nLabel.bind(this.amountTitle, () => q.deposit?i18nMgr.Get("MX_BuyInDeposit", [], "带入筹码 + 押金"):i18nMgr.Get("UITexas_AddChips", [], "带入筹码"));
      this.tipButton.hidden=!q.deposit;if(!q.deposit)this.tip.hidden=true;
      this.amount.textContent=money(s.amount); this.slider.min=String(q.min);this.slider.max=String(q.max);this.slider.step=String(q.step);this.slider.value=String(s.amount);
      this.limits.replaceChildren(element('span','',() => i18nMgr.Get("The_smallest", [], "最小")),element('span','',() => i18nMgr.Get("Maximum", [], "最大")));
      this.slider.setAttribute('aria-valuetext',`${money(s.amount)}，最小 ${money(q.min)}，最大 ${money(q.max)}`);
      this.sliderHandle.style.left=`${q.max>q.min?(s.amount-q.min)/(q.max-q.min)*100:0}%`;
      this.wallet.render(q.wallets.filter(w=>q.returnClubID===undefined||w.club_id===q.returnClubID),s.clubID,s.busy);
      this.autoArea.hidden=!q.canAuto;this.auto.checked=s.auto;
    }
    this.error.textContent=s.error;
    this.confirm.hidden=s.step==='loading';i18nLabel.bind(this.confirm, () => s.step==='security'?i18nMgr.Get("UITableSetting_nextPage", [], "下一页"):i18nMgr.Get("UITexas_confirm", [], "确定"));
    this.confirm.disabled=s.busy;this.close.disabled=s.busy;this.slider.disabled=s.busy||q?.min===q?.max;this.auto.disabled=s.busy;
  }
  onFrameResize(width:number,height:number):void {
    const unit=Math.min(width/1440,height/2290,600/1100);
    this.root.dataset.short=String(height<2290*unit);
    this.root.style.setProperty('--mx-setup-unit',`${unit}px`);
    this.root.style.setProperty('--dialog-width',`${Math.min(width-16,1100*unit)}px`);
  }
  destroy(): void { this.settings.destroy();this.bindings.destroy();this.root.remove(); }
}
