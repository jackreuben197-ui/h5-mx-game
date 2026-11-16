import { HostSessionData } from '../data/HostSessionData.js';
import { RoomPanelCache } from './RoomPanelCache.js';
import type { DiamondPurchase,DiamondCatalog,DiamondOrderRequest,DiamondReceipt,DiamondProduct,DiamondPayType,DiamondOrderNotice } from '../core/DiamondPurchase.js';
import type { HttpClient } from '../net/http/HttpClient.js';
/** CC TradeStoreUtils/USDTDiamond price and request contracts, without an independent wallet. */
export class DiamondPurchaseService implements DiamondPurchase {
  private notices=new Map<string,number>();
  private listeners=new Set<(notice:DiamondOrderNotice)=>void>();
  private cache:RoomPanelCache<DiamondCatalog>;
  constructor(private http:HttpClient,private signal:AbortSignal,private session?:HostSessionData){
    const off=session?.on(HostSessionData.DIAMONDS_CHANGE,()=>this.invalidate());signal.addEventListener('abort',()=>off?.(),{once:true});this.cache=new RoomPanelCache(()=>this.fetchCatalog(),signal);signal.addEventListener("abort",()=>{this.listeners.clear();this.notices.clear();},{once:true});}
  subscribeBalance(listener:(balance:number)=>void):()=>void {
    const owner=this.session?.userRID;
    const off=this.session?.on(HostSessionData.DIAMONDS_CHANGE,(value:number|undefined)=>{if(value!==undefined&&!this.signal.aborted&&owner===this.session?.userRID)listener(value);})??(()=>{});
    this.signal.addEventListener('abort',off,{once:true});
    return ()=>{off();this.signal.removeEventListener('abort',off);};
  }
  subscribeOrders(listener:(notice:DiamondOrderNotice)=>void):()=>void{this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
  notifyOrder(notice:DiamondOrderNotice):boolean{
    if(this.signal.aborted||!notice.orderNo||![2,3,4,5].includes(notice.status)||this.notices.get(notice.orderNo)===notice.status)return false;
    this.notices.set(notice.orderNo,notice.status);
    if(this.notices.size>100)this.notices.delete(this.notices.keys().next().value!);
    this.invalidate();
    for(const listener of this.listeners)listener(notice);
    return true;
  }
  peek():DiamondCatalog|undefined{const value=this.cache.peek();return value?{...value,balance:this.session?.diamonds??value.balance}:undefined;}
  invalidate():void{this.cache.invalidate();}
  catalog():Promise<DiamondCatalog>{return this.cache.get();}
  static quote(item:DiamondProduct,pay:DiamondPayType):DiamondOrderRequest {
    const round=(n:number)=>Math.round(n*10000)/10000;
    const total=round(item.gold_count*pay.rate);
    const discount=pay.discount>0?round(total*pay.discount):0;
    return {price_id:item.id,pay_id:pay.id,gold_count:item.gold_count,pay_price:round(total-discount)};
  }
  private async fetchCatalog():Promise<DiamondCatalog>{
    const revision=this.session?.diamondRevision;
    const [catalog,user,wallet]=await Promise.all([
      this.http.request<Pick<DiamondCatalog,'list'|'pay_types'>>('/api/prop/gold/price/list',{source_type:2,gold_types:[4],pay_gold_types:[],trader_type:0,limit:100,offset:0},{signal:this.signal}),
      this.http.request<{user:{trader_expire_time?:number}}>('/api/user/info',{}, {signal:this.signal}),
      this.http.request<{diamonds_wallet:{diamonds:number}}>('/api/user/user_diamonds_wallet',{}, {signal:this.signal})
    ]);
    this.signal.throwIfAborted();
    const isTrader=Date.now()<Number(user.user.trader_expire_time??0)*1000;
    const applying=isTrader?undefined:await this.http.request<{list:unknown[]}>('/api/user/trader/apply/list',{status:1},{signal:this.signal});
    this.signal.throwIfAborted();
    if(this.session&&revision===this.session.diamondRevision)this.session.setDiamonds(wallet.diamonds_wallet.diamonds);
    return {...catalog,balance:this.session?.diamonds??wallet.diamonds_wallet.diamonds,isTrader,isApplying:!!applying?.list.length};
  }
  async order(request:DiamondOrderRequest):Promise<DiamondReceipt>{
    const result=await this.http.request<DiamondReceipt>('/api/order/user/usdt/recharge',request,{signal:this.signal});
    this.signal.throwIfAborted();this.invalidate();return result;
  }
  async applyTrader():Promise<void>{await this.http.request('/api/user/trader/apply',{}, {signal:this.signal});this.signal.throwIfAborted();this.invalidate();}
}
