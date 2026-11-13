import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomPanelCache} from '../.test-build/logic/RoomPanelCache.js';
test('panel reads retry after failure and reject late room responses',async()=>{
 const abort=new AbortController();let calls=0,resolve;
 const cache=new RoomPanelCache(async()=>{calls++;if(calls===1)throw Error('offline');return new Promise(r=>resolve=r)},abort.signal);
 await assert.rejects(cache.get(),/offline/);const pending=cache.get();abort.abort();resolve({balance:100});
 await assert.rejects(pending,{name:'AbortError'});assert.equal(cache.peek(),undefined);
});
test('invalidation during a request does not leave that result fresh',async()=>{
 const abort=new AbortController();let calls=0,resolve;
 const cache=new RoomPanelCache(()=>{calls++;return calls===1?new Promise(r=>resolve=r):Promise.resolve(2)},abort.signal);
 const pending=cache.get();cache.invalidate();resolve(1);await pending;assert.equal(await cache.get(),2);
});
