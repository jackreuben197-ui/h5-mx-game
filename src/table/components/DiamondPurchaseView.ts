import type { DiamondPurchase,DiamondCatalog } from '../../core/DiamondPurchase.js';
import { DiamondPurchaseService } from '../../logic/DiamondPurchaseService.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { element } from '../dom.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { DialogSurface } from './DialogSurface.js';
import type { TableConfirmDialog } from './TableConfirmDialog.js';
/** CC UIBringIn diamond tab, USDTDiamond and UIRechargeDiamond. */
export class DiamondPurchaseView {
  readonly root=element('div','mx-diamond-purchase');
  readonly receipt=new DialogSurface('mx-diamond-receipt',420);
  private data?:DiamondCatalog;
  private product=0;private channel=0;private busy=false;private dead=false;private epoch=0;
  private receiptOrder='';
  private offOrders?:()=>void;
  private timer?:ReturnType<typeof setInterval>;
  private status=element('p','mx-diamond-status');
  private balance=element('p','mx-diamond-balance');
  private grid=element('div','mx-diamond-grid');
  private channels=element('div','mx-diamond-channels');
  private rate=element('p','mx-diamond-rate');
  private pay=element('button','mx-diamond-pay');
  constructor(private service:DiamondPurchase,private confirm:TableConfirmDialog){
    this.root.style.setProperty('--diamond-product',`url("${new URL('../../assets/raw/diamond-purchase/product.png',import.meta.url).href}")`);
    this.root.style.setProperty('--diamond-usdt',`url("${new URL('../../assets/raw/diamond-purchase/usdt.png',import.meta.url).href}")`);
    this.root.hidden=true;SpriteAtlas.paint(this.pay,'dialogConfirm');
    this.pay.onclick=()=>void this.purchase();this.root.append(this.balance,this.grid,this.rate,this.channels,this.status,this.pay);
    this.offOrders=service.subscribeOrders?.(notice=>{
      if(this.dead)return;
      if(notice.orderNo===this.receiptOrder){this.receipt.show(false);this.receiptOrder='';if(this.timer)clearInterval(this.timer);this.timer=undefined;}
      if(!this.root.hidden){const epoch=this.epoch;void service.catalog().then(data=>{if(!this.dead&&epoch===this.epoch){this.data=data;this.render();}}).catch(()=>{});}
    });
    i18nMgr.register(this);
  }
  async open():Promise<void>{
    this.root.hidden=false;this.data=this.service.peek?.()??this.data;if(this.data){if(!this.product)this.product=this.data.list[0]?.id??0;if(!this.channel)this.channel=this.data.pay_types[0]?.id??0;this.render();}
    const epoch=++this.epoch;this.busy=true;this.render();
    try{const data=await this.service.catalog();if(this.dead||epoch!==this.epoch)return;this.data=data;this.product=data.list[0]?.id??0;this.channel=data.pay_types[0]?.id??0;}
    catch(e){if(epoch===this.epoch)this.status.textContent=e instanceof Error?e.message:'';}
    finally{if(epoch===this.epoch){this.busy=false;this.render();}}
  }
  close():void{this.root.hidden=true;this.receipt.show(false);if(this.timer)clearInterval(this.timer);this.timer=undefined;this.confirm.close('diamond-trader');}
  reset():void{this.close();this.epoch++;this.data=undefined;this.busy=false;this.status.textContent='';}
  refreshLanguage():void{this.render();}
  private render():void{
    const d=this.data;this.pay.disabled=this.busy||!d?.list.length||!d.pay_types.length;
    if(!d)return;
    this.balance.textContent=`${i18nMgr.Get('UISend_diamondsNum')}: ${StringHelper.GetLongStringLocale(d.balance,1,0)}`;
    const pay=d.pay_types.find(p=>p.id===this.channel),product=d.list.find(p=>p.id===this.product);
    this.grid.replaceChildren(...d.list.map(item=>{
      const button=element('button','mx-diamond-product');button.setAttribute('aria-pressed',String(item.id===this.product));button.disabled=this.busy;
      const icon=element('span','mx-diamond-treasure');icon.style.backgroundImage=`url("${new URL('../../assets/raw/diamond-purchase/treasure.png',import.meta.url).href}")`;
      button.append(icon,element('strong','',String(item.gold_count)));
      if(item.give_gold_count>0)button.append(element('span','',StringHelper.FormatString(i18nMgr.Get('UIBuyDiamondMore'),item.give_gold_count)));
      if(item.trader_type===2)button.prepend(element('small','mx-diamond-exclusive',i18nMgr.Get('MX_DiamondTraderOnly',[],'批发商专属')));
      if(pay)button.append(element('span','mx-diamond-price',StringHelper.GetLongStringLocale(DiamondPurchaseService.quote(item,pay).pay_price,1,4)));
      button.onclick=()=>{this.product=item.id;this.status.textContent='';this.render();};return button;
    }));
    this.channels.replaceChildren(...d.pay_types.map((p,index)=>{
      const button=element('button','mx-diamond-channel');button.setAttribute('aria-pressed',String(p.id===this.channel));button.disabled=this.busy;
      const icon=element('img','');icon.src=p.image;icon.alt='';button.append(icon,element('span','',p.name+' '+i18nMgr.Get('MX_Pay',[],'支付')));
      if(index===0)button.append(element('small','',i18nMgr.Get('MX_Recommended',[],'推荐')));
      if(p.discount>0)button.append(element('small','',`${i18nMgr.Get('UIMineUSDTSheet_CanSubtractTip')}${StringHelper.GetLongString(p.discount*100,1)}%`));
      button.onclick=()=>{this.channel=p.id;this.status.textContent='';this.render();};return button;
    }));
    if(pay)this.rate.textContent=StringHelper.FormatString(i18nMgr.Get('UIBuyDiamondExchangeRate'),StringHelper.GetLongString(Math.max(1,Math.round(1/pay.rate)),1,0));
    const exclusive=product?.trader_type===2;
    this.pay.disabled||=!!exclusive&&d.isApplying;
    this.pay.textContent=exclusive&&d.isApplying?i18nMgr.Get('roomError171_5'):exclusive&&!d.isTrader?i18nMgr.Get('OpCodeString_TRADERAPPLYFEE'):product&&pay?StringHelper.FormatString(i18nMgr.Get('Wallet_PayNow'),StringHelper.GetLongString(DiamondPurchaseService.quote(product,pay).pay_price,1,4)):'';
  }
  private async purchase():Promise<void>{
    const d=this.data,p=d?.list.find(p=>p.id===this.product),pay=d?.pay_types.find(p=>p.id===this.channel);
    if(!d||!p||!pay||this.busy)return;
    if(p.trader_type===2&&!d.isTrader){
      if(d.isApplying)return;
      this.confirm.open({owner:'diamond-trader',singleButton:true,longContent:true,highlightNumbers:true,message:()=>i18nMgr.Get('MX_DiamondTraderTerms'),cancel:()=>i18nMgr.Get('UIBackDialog_ticketsbtnClose'),commit:()=>i18nMgr.Get('MX_DiamondTraderPay'),onCancel:()=>{},onCommit:()=>void this.apply()});return;
    }
    const epoch=this.epoch;this.busy=true;this.status.textContent='';this.render();
    try{
      const request=DiamondPurchaseService.quote(p,pay),result=await this.service.order(request);
      if(this.dead||epoch!==this.epoch||this.root.hidden)return;
      if(pay.type===1){
        this.receiptOrder=result.order?.order_no??'';
        const address=result.usdt_address,content=this.receipt.content;content.replaceChildren();
        const close=element('button','mx-diamond-receipt-close','×');close.onclick=()=>{this.receipt.show(false);if(this.timer)clearInterval(this.timer);};
        const img=element('img','mx-diamond-qr');img.src=address.qr_code;img.alt=i18nMgr.Get('UIMineMallUSDTShopPayDialogCopyAddress');
        const text=element('p','mx-diamond-address',`${i18nMgr.Get('UIMineMallUSDTShopPayDialogCopyAddress')}\n${address.address_type}: ${address.address}`);
        const copy=element('button','mx-diamond-copy',i18nMgr.Get('MX_CopyAddress',[],'复制地址'));copy.onclick=()=>void this.copyAddress(address.address,copy);
        const countdown=element('p','');const deadline=Date.now()+900000;
        const tick=()=>{const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));countdown.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;if(!seconds){clearInterval(this.timer);countdown.textContent=i18nMgr.Get('roomError148_2');}};
        content.append(close,element('h2','',String(request.pay_price)),element('p','',StringHelper.FormatString(i18nMgr.Get('UIBuyDiamondExchangeRateReverse'),StringHelper.GetLongString(1/Math.max(1,Math.round(1/pay.rate)),1,4))),img,text,copy,countdown);
        if(this.timer)clearInterval(this.timer);tick();this.timer=setInterval(tick,1000);this.receipt.show(true);
      }else if(pay.type===2)this.status.textContent=i18nMgr.Get('UIMine_Setting108');
    }catch(e){if(epoch===this.epoch)this.status.textContent=e instanceof Error?e.message:'';}
    finally{if(epoch===this.epoch){this.busy=false;this.render();}}
  }
  private async copyAddress(address:string,button:HTMLButtonElement):Promise<void>{
    let copied=false;
    try { await navigator.clipboard.writeText(address); copied=true; } catch {
      const input=document.createElement('textarea'); input.value=address;input.readOnly=true;
      input.style.cssText='position:fixed;left:0;top:0;opacity:0';this.receipt.content.append(input);
      input.select();input.setSelectionRange(0,address.length);
      try { copied=document.execCommand('copy'); } catch {} finally {input.remove();}
    }
    button.textContent=i18nMgr.Get(copied?'MX_AddressCopied':'MX_AddressCopyFailed');
  }
  private async apply():Promise<void>{
    if(this.busy)return;const epoch=this.epoch;this.busy=true;this.render();
    try{await this.service.applyTrader();if(epoch===this.epoch&&this.data)this.data.isApplying=true;}
    catch(e){if(epoch===this.epoch)this.status.textContent=e instanceof Error?e.message:'';}
    finally{if(epoch===this.epoch){this.busy=false;this.render();}}
  }
  destroy():void{this.dead=true;this.offOrders?.();this.reset();this.receipt.destroy();this.root.remove();}
}
