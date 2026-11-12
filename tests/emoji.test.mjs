import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,FakeTransport,outbound,record,snapshot} from './helpers/protocol-fixture.mjs';
import {MxRoomHost} from '../.test-build/host/MxRoomHost.js';
import {EmojiPropRules} from '../.test-build/logic/EmojiPropRules.js';
import MagicEmojiConfig from '../.test-build/logic/MagicEmojiConfig.js';
import {TexasGameRoomDataEmoji} from '../.test-build/data/TexasGameRoomDataEmoji.js';
const tick=()=>new Promise(r=>setImmediate(r));
const prop=(overrides={})=>({prop_id:1,prop_type:1,price_id:1,prop_code:'smoke',raw_price:9,pay_price:3,start_time:0,end_time:9999999999,subscription_name:'',prop_amount:0,game_prop_id:0,prop_type_category:1,prop_type_category_name:'分类',prop_type_category_icon:'https://test.invalid/icon.png',...overrides});
async function setup(t, props=[prop()]) {
 const transport=new FakeTransport(),session=new AbortController(),sent=[],http=[];
 const host=new MxRoomHost(transport,{runtime:pb,timeoutMs:500,http:{baseUrl:'https://test.invalid/api',fetch:async(url,options)=>{
  http.push({url:String(url),body:JSON.parse(options.body)});
  return Response.json({code:0,data:String(url).endsWith('/misc/combine')?{get_chat_shop_prop_list_resp:{list:props}}:{}});
 }}});
 t.after(()=>{session.abort();host.destroy()});
 transport.emit('enterTable',{token:'00000000000000000000000000000000'});transport.emit('syncUser',{uid:904,randomId:104,nickname:'中文昵称',avatar:'https://test.invalid/avatar.png',sex:2});
 transport.onSend=(action,payload)=>{
  if(action!=='wsSend')return;
  const p=outbound(payload.data);sent.push(p);
  if(p.code===pb.Code.MSG_R_ROOMS){const res=new pb.ServerMessageRooms();res.setRpcId(pb.ClientMessageRooms.deserializeBinary(p.body).getRpcId());res.setRoomsList([record()]);transport.frame(p.code,0,0,res)}
  if(p.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(p.code,1001,0,snapshot());
 };
 const updates=[];await host.enter({roomID:1001,matchID:0,roomType:0},session.signal,u=>updates.push(u));
 const service=host.getEmojis();await service.refresh();
 return {host,transport,session,sent,http,updates,service};
}
function extra(userID,type=710) {return new TextEncoder().encode(JSON.stringify({code:1000,data:JSON.stringify({user_id:userID,type,name:'中文昵称',msgType:1})}));}
function reply(c,status=0){const msg=new pb.ServerMessageBroadcastMsg();msg.setStatus(status);c.transport.frame(pb.Code.MSG_D_BROADCAST_MSG,1001,0,msg)}
function echo(c,userID,room=1001){const msg=new pb.ServerMessageGetMsg();msg.setExtra(extra(userID));c.transport.frame(pb.Code.MSG_S_GET_MSG,room,0,msg)}
test('CC prop mapping preserves discount windows, subscriptions, inventory and category limits',()=>{
 assert.equal(EmojiPropRules.map([prop()],100)[0].payPrice,3);
 assert.equal(EmojiPropRules.map([prop({end_time:99})],100)[0].payPrice,9);
 assert.equal(EmojiPropRules.isPropFree(EmojiPropRules.map([prop({subscription_name:'VIP'})])[0]),true);
 assert.equal(EmojiPropRules.isPropFree(EmojiPropRules.map([prop({prop_amount:1})])[0]),true);
 assert.equal(EmojiPropRules.isPropFree(EmojiPropRules.map([prop({raw_price:0,pay_price:0})])[0]),false,'CC free eligibility is subscription/inventory, not price');
 const list=Array.from({length:7},(_,i)=>Array.from({length:12},(_,j)=>prop({prop_id:i*12+j,prop_type_category:7-i}))).flat();
 const categories=EmojiPropRules.categories(EmojiPropRules.map([...list,prop({prop_code:'unknown'}),prop({prop_type:4})]));
 assert.deepEqual(categories.map(c=>c.id),[1,2,3,4,5]);assert.ok(categories.every(c=>c.items.length===10));
 assert.equal(MagicEmojiConfig.DEFINITIONS.length,17);
});
test('Emoji uses H5 binary bridge, waits for 1019, ignores self echo and scopes 1121 by room',async t=>{
 const c=await setup(t),plays=[];c.service.data.on(TexasGameRoomDataEmoji.EMOJI,e=>plays.push(e));
 const pending=c.service.send(c.service.data.propList[0]);await tick();
 assert.equal(plays.length,0);const sent=c.sent.find(p=>p.code===pb.Code.MSG_D_BROADCAST_MSG);
 assert.equal(sent.roomID,1001);const body=pb.ClientMessageBroadcastMsg.deserializeBinary(sent.body).toObject();
 assert.equal(body.consume,1);assert.equal(body.msgType,pb.Def.BroadcastMsgType.BC_MSG_EMOJI);
 const envelope=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.extra),s=>s.charCodeAt(0))));
 const inner=JSON.parse(envelope.data);assert.equal(inner.name,'中文昵称');assert.equal(inner.user_id,104);assert.equal(inner.type,710);assert.equal(inner.target_user_id,0);assert.equal(inner.sex,2);
 echo(c,104);echo(c,904);await tick();assert.equal(plays.length,0);
 reply(c);await pending;assert.deepEqual(plays,[{type:710,userID:104}]);
 reply(c);echo(c,104);echo(c,105,999);await tick();assert.equal(plays.length,1);
 echo(c,105);await tick();assert.deepEqual(plays[1],{type:710,userID:105});assert.equal(c.updates.length,0,'emoji does not republish a whole table snapshot');
 const propCalls=c.http.filter(item=>item.body.api_list?.includes(62));
 assert.equal(propCalls.length,1,'entry prefetch and opening the panel share the prop list');
 assert.deepEqual(propCalls[0].body.get_chat_shop_prop_list_req.prop_types,[1,4]);
});
test('Failed, malformed and unseated emoji messages do not play or send',async t=>{
 const c=await setup(t),plays=[];c.service.data.on(TexasGameRoomDataEmoji.EMOJI,e=>plays.push(e));
 const rejected=assert.rejects(c.service.send(c.service.data.propList[0]),/17/);await tick();reply(c,17);await rejected;assert.equal(plays.length,0);
 const bad=new pb.ServerMessageGetMsg();bad.setExtra(new Uint8Array([255,0]));c.transport.frame(pb.Code.MSG_S_GET_MSG,1001,0,bad);await tick();assert.equal(plays.length,0);
 const pending=c.service.send(c.service.data.propList[0]);await tick();c.host.roomData.snapshot.playersList=c.host.roomData.snapshot.playersList.filter(p=>p.userRid!==104);reply(c);await pending;assert.equal(plays.length,0);
 assert.equal(c.service.canSend(),false);const count=c.sent.length;await assert.rejects(c.service.send(c.service.data.propList[0]));assert.equal(c.sent.length,count);
});
test('CC owned prop consumes inventory once and broadcasts with CT_NONE',async t=>{
 const c=await setup(t,[prop({prop_amount:2,game_prop_id:88})]);const pending=c.service.send(c.service.data.propList[0]);await tick();
 const body=pb.ClientMessageBroadcastMsg.deserializeBinary(c.sent.find(p=>p.code===pb.Code.MSG_D_BROADCAST_MSG).body).toObject();assert.equal(body.consume,pb.Def.ConsumeType.CT_NONE);
 reply(c);await pending;await tick();const consumed=c.http.filter(x=>x.url.endsWith('/user_prop/used'));assert.equal(consumed.length,1);assert.equal(consumed[0].body.prop_id,88);assert.equal(consumed[0].body.quantity,1);
});
test('throw prop keeps CC eligibility, target and 1019/1121 deduplication',async t=>{
 const c=await setup(t,[prop({prop_id:7,prop_type:4,prop_code:'tomato_Button',prop_amount:1,game_prop_id:88})]);
 const events=[];c.service.data.on(TexasGameRoomDataEmoji.THROW_PROP,e=>events.push(e));
 await assert.rejects(c.service.throwProp(104,c.service.data.propList[0],600),/不能扔/);
 const pending=c.service.throwProp(105,c.service.data.propList[0],600);await tick();
 const message=c.sent.find(p=>p.code===pb.Code.MSG_D_BROADCAST_MSG),body=pb.ClientMessageBroadcastMsg.deserializeBinary(message.body).toObject();
 assert.equal(body.msgType,pb.Def.BroadcastMsgType.BC_MSG_THROW);assert.equal(body.consume,pb.Def.ConsumeType.CT_NONE);
 const envelope=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.extra),s=>s.charCodeAt(0))));
 assert.deepEqual(JSON.parse(envelope.data),{name:'中文昵称',target_user_id:105,user_id:104,type:600});
 reply(c);await pending;assert.deepEqual(events,[{type:600,userID:104,targetUserID:105}]);
 const msg=new pb.ServerMessageGetMsg();msg.setExtra(new TextEncoder().encode(JSON.stringify({code:1000,data:JSON.stringify({user_id:104,target_user_id:105,type:600})})));
 c.transport.frame(pb.Code.MSG_S_GET_MSG,1001,0,msg);await tick();assert.equal(events.length,1);
 msg.setExtra(new TextEncoder().encode(JSON.stringify({code:1000,data:JSON.stringify({user_id:105,target_user_id:104,type:600})})));
 c.transport.frame(pb.Code.MSG_S_GET_MSG,1001,0,msg);await tick();assert.deepEqual(events[1],{type:600,userID:105,targetUserID:104});
 assert.equal(c.http.filter(x=>x.url.endsWith('/user_prop/used')).length,1);
});
