import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,FakeTransport} from './helpers/protocol-fixture.mjs';
import {MxRoomHost} from '../.test-build/host/MxRoomHost.js';
import {DiamondPurchaseService} from '../.test-build/logic/DiamondPurchaseService.js';

test('global 145 passes the room filter, deduplicates approval, refreshes funds and emits notice',async t=>{
 const transport=new FakeTransport(),abort=new AbortController();
 const host=new MxRoomHost(transport,{runtime:pb});t.after(()=>{abort.abort();host.destroy()});
 const service=new DiamondPurchaseService({},abort.signal);let refreshed=0,invalidated=0;
 service.catalog=async()=>{refreshed++;return {}};
 const notices=[],toasts=[];service.subscribeOrders(n=>notices.push(n));
 transport.onSend=(action,payload)=>{if(action==='showToast')toasts.push(payload)};
 host.pb=pb;host.current={entered:true,signal:abort.signal,target:{roomID:1001,matchID:0},panelFunds:{invalidate(){invalidated++}}};
 host.getRecords=()=>({diamondPurchase:service});
 const send=status=>{const msg=new pb.ServerMessageUserUsdtOrderNotify();msg.setOrderNo('order-test');msg.setStatus(status);transport.frame(pb.Code.MSG_S_USER_USDT_ORDER_NOTIFY,0,0,msg)};
 send(1);assert.equal(toasts.length,0);
 send(2);send(2);await host.client.queue;
 assert.equal(notices.length,1);assert.deepEqual(notices[0],{orderNo:'order-test',status:2});
 assert.equal(toasts.length,1);assert.equal(toasts[0].type,'success');assert.equal(refreshed,1);assert.equal(invalidated,1);
 abort.abort();send(3);assert.equal(toasts.length,1);
});
test('order listeners unsubscribe and only terminal statuses are accepted',()=>{
 const abort=new AbortController(),service=new DiamondPurchaseService({},abort.signal);let count=0;
 const off=service.subscribeOrders(()=>count++);
 assert.equal(service.notifyOrder({orderNo:'',status:2}),false);
 assert.equal(service.notifyOrder({orderNo:'a',status:0}),false);
 for(const status of [3,4,5])assert.equal(service.notifyOrder({orderNo:String(status),status}),true);
 assert.equal(count,3);off();service.notifyOrder({orderNo:'b',status:2});assert.equal(count,3);
});
