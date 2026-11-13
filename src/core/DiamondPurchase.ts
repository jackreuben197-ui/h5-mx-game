export interface DiamondProduct { id:number; gold_count:number; give_gold_count:number; trader_type:number; }
export interface DiamondPayType { id:number; type:number; rate:number; discount:number; image:string; name:string; }
export interface DiamondCatalog { list:DiamondProduct[]; pay_types:DiamondPayType[]; balance:number; isTrader:boolean; isApplying:boolean; }
export interface DiamondOrderRequest {price_id:number; pay_price:number; pay_id:number; gold_count:number;}
export interface DiamondReceipt {usdt_address:{qr_code:string;address:string;address_type:string};order?:{order_no:string;amount:number};}
export interface DiamondOrderNotice {orderNo:string;status:number;}
export interface DiamondPurchase {
  subscribeOrders?(listener:(notice:DiamondOrderNotice)=>void):()=>void;
  peek?():DiamondCatalog|undefined;
  catalog():Promise<DiamondCatalog>;
  order(request:DiamondOrderRequest):Promise<DiamondReceipt>;
  applyTrader():Promise<void>;
}
