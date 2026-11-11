import test from 'node:test';
import assert from 'node:assert/strict';
import { H5BridgeTransport } from '../.test-build/host/H5BridgeTransport.js';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
test('sets CC readiness, retries an unacknowledged ready and releases business messages only after h5Ack', async t => {
 const sent = [], win = { H5Bridge: { onMessgeRecv(action) { sent.push(action); } } };
 const transport = new H5BridgeTransport(win); t.after(() => transport.destroy());
 transport.start(); transport.send('wsSend', { dataType: 'binary', data: new Uint8Array() }, 0);
 assert.equal(win.__CC_READY__, true);
 assert.deepEqual(sent, ['ccReady']); assert.equal(transport.handshakeDone, false);
 await wait(280); assert.deepEqual(sent, ['ccReady', 'ccReady']);
 win.CocosBridge.sendMessage('h5Ack', {}, 1, undefined, Date.now(), 'h5');
 assert.equal(transport.handshakeDone,true); assert.equal(sent.at(-1), 'wsSend');
 const count = sent.length; await wait(280); assert.equal(sent.length,count);
 transport.destroy(); assert.equal(win.CocosBridge,undefined);assert.equal(win.__CC_READY__,undefined);
});
test('H5 may load after MX; h5Ready applies context and sends ccAck before queued business messages', async t => {
 const win = {}, sent = [], transport = new H5BridgeTransport(win);t.after(()=>transport.destroy());
 transport.subscribe(message=>{if(message.action==='h5Ready')transport.send('ccAck',{},1)});
 transport.start(); transport.send('h5Show');
 win.H5Bridge = { onMessgeRecv(action) { sent.push(action); if(action==='ccReady')win.CocosBridge.postMessage({action:'h5Ready',payload:{},source:'h5',msgtype:1}); } };
 await wait(280);assert.deepEqual(sent,['ccReady','ccAck','h5Show']);assert.equal(transport.handshakeDone,true);
});
test('destroy cancels pending readiness announcements and discards queued messages',async()=>{
 const win={},transport=new H5BridgeTransport(win);transport.start();transport.send('h5Show');transport.destroy();
 let calls=0;win.H5Bridge={onMessgeRecv(){calls++}};await wait(280);assert.equal(calls,0);
});
