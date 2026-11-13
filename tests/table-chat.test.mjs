import test from 'node:test';
import assert from 'node:assert/strict';
import {pb} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {GetMsg} from '../.test-build/net/messages/texas/GetMsg.js';
import {TableChatService} from '../.test-build/logic/TableChatService.js';

test('chat displays server-filtered text, deduplicates echoes and keeps danmu out of history',()=>{
 const d=new ProtocolRoomData(),c=new MessageContext(d,pb);c.session.userID=7;
 const make=(bullet=false)=>({message:'filtered',extra:new TextEncoder().encode(JSON.stringify({code:1000,data:JSON.stringify({user_id:7,type:0,msgType:2,name:'me',message:'original',time:1700000000000,isDanmu:bullet})}))});
 d.chat.setPendingMessage({content:'original'});d.chat.confirmPendingMessage(0);assert.equal(d.chat.messages.length,0);
 GetMsg(make(),c);GetMsg(make(),c);assert.equal(d.chat.messages.length,1);assert.equal(d.chat.messages[0].content,'filtered');assert.equal(d.chat.hasNewMessageAlert,false);
 const bullets=[];d.chat.on('DANMU_ADDED',m=>bullets.push(m));GetMsg(make(true),c);assert.equal(bullets[0].content,'filtered');assert.equal(d.chat.messages.length,1);
});
test('history paging preserves cursor, order, overlap and abort isolation',async()=>{
 const d=new ProtocolRoomData(),c=new MessageContext(d,pb),abort=new AbortController(),calls=[];
 let rows=Array.from({length:20},(_,i)=>({id:40-i,extra:JSON.stringify({code:1000,data:JSON.stringify({user_id:8,type:0,msgType:2,message:`row${40-i}`,time:1700000000000+40-i})})}));
 const http={request:async(path,body)=>{calls.push(body);return {data:rows}}};
 const svc=new TableChatService(d,{roomID:42,matchID:0},c.session,{},pb,http,abort.signal);
 await svc.history();assert.equal(d.chat.oldestHistoryID,21);assert.equal(d.chat.messages[0].content,'row21');
 rows=[rows.at(-1),{id:20,extra:JSON.stringify({code:1000,data:JSON.stringify({user_id:8,message:'older',time:1699999999999})})}];
 await svc.history(true);assert.equal(calls[1].before_id,21);assert.equal(d.chat.messages.length,21);assert.equal(d.chat.messages[0].content,'older');assert.equal(d.chat.hasMoreHistory,false);
 abort.abort();await assert.rejects(svc.history(false,true));assert.equal(d.chat.messages.length,21);
});
test('chat+danmu sends normal then bullet using the existing broadcast protocol',async()=>{
 const d=new ProtocolRoomData(),c=new MessageContext(d,pb),sent=[];c.session.userID=7;
 const client={request:async(code,room,match,body)=>{sent.push({code,...body.toObject()});d.chat.confirmPendingMessage(0);return {status:0}}};
 const svc=new TableChatService(d,{roomID:42,matchID:0},c.session,client,pb,{request:async()=>({data:[]})},new AbortController().signal);
 await svc.send(' hello ',true);assert.deepEqual(sent.map(x=>x.msgType),[pb.Def.BroadcastMsgType.BC_MSG_AVATAR,pb.Def.BroadcastMsgType.BC_MSG_BULLET]);assert.ok(sent.every(x=>x.code===1019&&x.message==='hello'));assert.equal(d.chat.messages.length,0);
});
