import test from 'node:test';
import assert from 'node:assert/strict';
import {DemoHost} from '../.test-build/demo/host.js';
const target={roomID:1001,matchID:0,roomType:0};
async function setup(){
 const host=new DemoHost(()=>{}),session=new AbortController();let state;
 state=await host.enter(target,session.signal,event=>{if(event.type==='snapshot')state=event.snapshot;else if(event.type==='patch')state={...state,...event.changes};});
 return {host,session,get state(){return state;}};
}
test('offline special scenarios reuse room data and clear on a new hand',async()=>{
 const f=await setup();try{
 f.host.features.insurance(2,true);
 const data=f.host.getSpecialOperations().data;
 assert.equal(data.insurance.state.operator.insuranceLimitList.length,2);
 assert.equal(data.record.insuranceForceBuyRatio,333);
 const before=data.insurance.state.operator.opDeadline;
 await f.host.addTime();assert.equal(data.insurance.state.operator.delayTimes,1);assert.equal(data.insurance.state.operator.opDeadline,before+30);
 await f.host.buyInsurance(target,[],true);assert.equal(data.insurance.state.operator,undefined);
 f.host.features.settlement();assert.equal(f.state.watch.peek,true);
 await f.host.watchSettlement(target,'peek');assert.ok(f.state.players.filter(p=>p.seat!==1).every(p=>p.cards.every(Boolean)));
 await f.host.watchSettlement(target,'reveal');assert.equal(f.state.community.length,4);
 await f.host.watchSettlement(target,'reveal');assert.equal(f.state.community.length,5);assert.equal(f.state.watch.reveal,false);
 f.host.deal();assert.equal(f.state.watch,undefined);assert.equal(f.state.handEnded,false);assert.deepEqual(f.state.secondCommunity,[]);
 f.host.features.turn();const first=f.state.countdowns[0].deadline;await f.host.addTime();await f.host.addTime();await f.host.addTime();assert.equal(f.state.countdowns[0].deadline,first+50);assert.equal(f.state.canAddTime,false);
 f.host.features.reserve();assert.ok(f.state.players[0].keepSeatDeadline);await f.host.keepSeat(target,false);assert.equal(f.state.players[0].keepSeatDeadline,undefined);
 }finally{f.session.abort();}
});
test('offline vote callback cannot publish into a reset hand or departed room',async()=>{
 const f=await setup();try{
 f.host.features.secondBoard();await f.host.agreeSecondPcs(target,true);f.host.deal();
 await new Promise(r=>setTimeout(r,750));assert.deepEqual(f.state.secondCommunity,[]);
 f.host.features.secondBoard();await f.host.agreeSecondPcs(target,true);
 await new Promise(r=>setTimeout(r,750));assert.equal(f.state.secondCommunity.length,5);
 f.host.features.secondBoard();await f.host.agreeSecondPcs(target,true);f.session.abort();
 assert.equal(f.host.getSpecialOperations().data.secondPcs.state.active,false);
 }finally{f.session.abort();}
});
test('mushroom and critical-hit demos isolate delayed updates when reset',async()=>{
 const f=await setup();try{
 const data=f.host.getSpecialOperations().data;
 f.host.features.mushroomPool();assert.equal(data.mushroom.state.count,26);
 await new Promise(r=>setTimeout(r,1250));assert.equal(data.mushroom.state.seat,7);assert.equal(data.mushroom.state.count,27);
 f.host.features.criticalHit();assert.equal(data.criticalHit.state.enabled,true);assert.equal(data.criticalHit.state.start,1);
 await new Promise(r=>setTimeout(r,2050));assert.equal(f.state.community.length,3);
 f.host.features.criticalHit();f.host.deal();
 await new Promise(r=>setTimeout(r,2050));assert.equal(f.state.community.length,0);assert.equal(data.criticalHit.state.enabled,false);
 }finally{f.session.abort();}
});
