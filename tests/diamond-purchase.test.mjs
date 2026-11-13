import test from 'node:test';
import assert from 'node:assert/strict';
import {DiamondPurchaseService} from '../.test-build/logic/DiamondPurchaseService.js';
test('diamond quote preserves CC rounding before discount and excludes bonus diamonds',()=>{
 const p={id:7,gold_count:12345,give_gold_count:1000,trader_type:1},pay={id:9,rate:.00123,discount:.1234};
 assert.deepEqual(DiamondPurchaseService.quote(p,pay),{price_id:7,pay_id:9,gold_count:12345,pay_price:13.3106});
 assert.equal(DiamondPurchaseService.quote(p,{...pay,discount:0}).pay_price,15.1844);
});
test('catalog checks pending trader application only when trader eligibility expired',async()=>{
 for(const active of [false,true]){
  const calls=[],abort=new AbortController(),svc=new DiamondPurchaseService({request:async(path,body)=>{
   calls.push({path,body});if(path.endsWith('/price/list'))return {list:[],pay_types:[]};
   if(path.endsWith('/info'))return {user:{trader_expire_time:active?Date.now()/1000+60:0}};
   if(path.endsWith('user_diamonds_wallet'))return {diamonds_wallet:{diamonds:123}};
   return {list:[{}]};
  }},abort.signal);
  const result=await svc.catalog();assert.equal(result.isTrader,active);assert.equal(result.isApplying,!active);assert.equal(result.balance,123);
  assert.equal(calls.some(x=>x.path.endsWith('/apply/list')),!active);assert.deepEqual(calls[0].body.gold_types,[4]);
 }
});
test('late purchase response after room disposal is rejected',async()=>{
 const abort=new AbortController();let done;const svc=new DiamondPurchaseService({request:()=>new Promise(r=>done=r)},abort.signal);
 const task=svc.order({price_id:1,pay_id:2,gold_count:1000,pay_price:1});abort.abort();done({usdt_address:{}});await assert.rejects(task,{name:'AbortError'});
});
test('preloaded catalog is reused, concurrent opens deduplicate and mutations invalidate',async()=>{
 const abort=new AbortController();let calls=0;
 const svc=new DiamondPurchaseService({request:async(path)=>{
  calls++;if(path.endsWith('/price/list'))return {list:[],pay_types:[]};
  if(path.endsWith('/info'))return {user:{trader_expire_time:Date.now()/1000+60}};
  if(path.endsWith('user_diamonds_wallet'))return {diamonds_wallet:{diamonds:123}};
  return {};
 }},abort.signal);
 await Promise.all([svc.catalog(),svc.catalog()]);assert.equal(calls,3);
 assert.equal(svc.peek().balance,123);await svc.catalog();assert.equal(calls,3);
 await svc.applyTrader();await svc.catalog();assert.equal(calls,7);
 abort.abort();assert.equal(svc.peek(),undefined);assert.throws(()=>svc.catalog(),{name:'AbortError'});
});
