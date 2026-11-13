import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot,FakeTransport,inbound,outbound} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import Mtt from '../.test-build/data/TexasGameRoomDataMtt.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {TexasMessageHandler} from '../.test-build/net/messages/texas/TexasMessageHandler.js';
import {ProtocolClient} from '../.test-build/net/ProtocolClient.js';
import {EnterRoomRequest} from '../.test-build/net/requests/EnterRoomRequest.js';
import {MttRoomLifecycle} from '../.test-build/logic/MttRoomLifecycle.js';
function setup(){const d=new ProtocolRoomData();d.record=record().toObject();d.snapshot=snapshot().toObject();d.mtt=new Mtt(d,pb);d.mtt.initialize(false,'test','',100,1);return d;}
test('MTT assignment accepts only the same match; cash requests remain room-bound',async()=>{
 const t=new FakeTransport(),c=new ProtocolClient(t,()=>'test-token',1000),a=new AbortController();
 const target={roomID:0,matchID:55,roomType:512};
 t.onSend=(action,p)=>{if(action!=='wsSend')return;const out=outbound(p.data);assert.equal(pb.ClientMessageEnterRoom.deserializeBinary(out.body).getWantSeat(),pb.Def.WantSeatType.WST_NO);
 t.emit('wsMessage',{dataType:'binary',data:inbound(1002,88,54,snapshot())});t.emit('wsMessage',{dataType:'binary',data:inbound(1002,99,55,snapshot())});};
 await new EnterRoomRequest(c,pb).execute(target,a.signal);assert.equal(target.roomID,99);c.destroy();
});
test('MTT add-on follows normal and plus limits, resets per hand, prevents duplicate submissions',()=>{
 const d=setup(),m=d.mtt,p=d.snapshot.playersList.find(p=>p.seatId===4);p.status=pb.Def.CanPlayStatus.NORMAL;
 Object.assign(m,{gameStarted:true,blindLevel:2,addOnMode:pb.Def.AddOnMode.PLUS_MODE1,addOnPlusMode1:true,addOnPlusMode1Limit:2000,addOnPlusMode1MaxTimes:2,maxRebuyBlindLevel:5});
 assert.equal(m.currentAddOnMode,pb.Def.AddOnMode.PLUS_MODE1);assert.ok(m.beginAddOn(m.currentAddOnMode));assert.equal(m.currentAddOnMode,0);m.completeAddOn(0,100);assert.equal(m.currentAddOnMode,0);m.handleHandStart();assert.equal(m.currentAddOnMode,pb.Def.AddOnMode.PLUS_MODE1);
 m.beginAddOn(m.currentAddOnMode);m.completeAddOn(0,100);m.handleHandStart();assert.equal(m.currentAddOnMode,0);
 Object.assign(m,{addOnEnabled:true,addOnMode:pb.Def.AddOnMode.ADDON_NORMAL,startAddOnBlindLevel:2,endAddOnBlindLevel:4});assert.equal(m.currentAddOnMode,pb.Def.AddOnMode.ADDON_NORMAL);m.beginAddOn(m.currentAddOnMode);m.completeAddOn(0,100);assert.equal(m.currentAddOnMode,0);
});
test('MTT break waits for end of hand and idle grace; clear retains occupied seats and chips',()=>{
 const d=setup(),m=d.mtt,now=Math.floor(Date.now()/1000),chips=d.snapshot.playersList.map(p=>p.chip);
 m.handleHandStart();m.applyBreak({...new pb.ServerMessageMttBreak().toObject(),eventType:1,startTime:now,endTime:now+90});m.updateBreakPresentation(now+5);assert.equal(m.shouldShowBreak(now+5),false);
 m.handleHandEnd();m.updateBreakPresentation(now+2);assert.equal(d.snapshot.handInfo.publicCardsList.length,3);
 m.updateBreakPresentation(now+5);assert.equal(m.shouldShowBreak(now+5),true);assert.deepEqual(d.snapshot.handInfo.publicCardsList,[]);assert.deepEqual(d.snapshot.playersList.map(p=>p.chip),chips);
 m.applyBreak({...new pb.ServerMessageMttBreak().toObject(),eventType:3});assert.equal(m.breakWindowActive,false);
});
test('MTT named handlers update blind and bubble state from actual protocol serialization',()=>{
 const d=setup(),c=new MessageContext(d,pb),r=new TexasMessageHandler(pb),b=new pb.ServerMessageUpBlind(),p=new pb.MTTProgress();p.setBlindLevel(3);b.setMttProgress(p);b.setSmallBlind(50);b.setAnte(5);
 r.dispatch({code:1120,body:b.serializeBinary()},c);assert.equal(d.mtt.blindLevel,3);assert.equal(d.snapshot.roomInfo.smallBlind,50);
 r.dispatch({code:1124,body:new pb.ServerMessageSyncHand().serializeBinary()},c);assert.equal(d.mtt.bubbleWaiting,true);d.mtt.handleHandStart();assert.equal(d.mtt.bubbleWaiting,false);
});
test('MTT global room-ready trusts body match and only transfers after exchange',async()=>{
 const d=setup(),transport=new FakeTransport(),target={roomID:1,matchID:55},moved=[],a=new AbortController();
 const life=new MttRoomLifecycle(d,target,{},pb,transport,a.signal,()=>true,async(...x)=>moved.push(x),()=>{},()=>{});
 const b=new pb.ServerMessageNotificationRoomReady(),room=new pb.Room();room.setRoomId(77);room.setMatchId(55);b.setRoom(room);
 const packet={code:101,roomID:0,matchID:0,body:b.serializeBinary()};life.global(packet);assert.equal(moved.length,0);
 life.leave({...new pb.ServerMessageLeaveNotification().toObject(),reason:pb.Def.LeaveReason.LR_EXCHANGE});life.global(packet);assert.deepEqual(moved,[[77,false]]);
 room.setMatchId(56);b.setRoom(room);life.global({...packet,body:b.serializeBinary()});assert.equal(moved.length,1);life.destroy();
});
test('MTT elimination keeps settlement props and only enables watching after authoritative observer entry',async()=>{
 const d=setup(),t=new FakeTransport(),sent=[];t.send=(...args)=>sent.push(args);
 const a=new AbortController(),target={roomID:10,matchID:55},exits=[];let finish;
 const life=new MttRoomLifecycle(d,target,{},pb,t,a.signal,()=>true,()=>new Promise(resolve=>finish=resolve),()=>{},()=>exits.push(true));
 Object.assign(d.mtt,{blindLevel:2,maxRebuyBlindLevel:5,rebuyTimes:3});
 life.leave({...new pb.ServerMessageLeaveNotification().toObject(),reason:pb.Def.LeaveReason.LR_NOCHIP,accountChips:1000,rebuyTimes:1});
 const first=sent.find(x=>x[0]==='showPanel');assert.equal(first[1].props.watchingPending,true);assert.equal(first[1].props.remainRebuyTimes,2);assert.equal(d.snapshot.myInfo.seatId,0);
 t.emit('panelEvent',{panelRequestId:first[3],event:'continueWatching'});assert.equal(sent.filter(x=>x[0]==='h5Hide').length,0);
 finish();await new Promise(r=>setTimeout(r,0));const last=sent.filter(x=>x[0]==='showPanel').at(-1);assert.equal(last[1].props.canContinueWatching,true);
 t.emit('panelEvent',{panelRequestId:first[3],event:'rebuy'});assert.equal(exits.length,0);
 t.emit('panelEvent',{panelRequestId:last[3],event:'continueWatching'});assert.equal(sent.at(-1)[0],'h5Hide');life.destroy();
});
test('aborted assigned-room request drains a late response before same-match retry',async()=>{
 const t=new FakeTransport(),c=new ProtocolClient(t,()=>'test-token',1000),a=new AbortController(),target={roomID:0,matchID:55,roomType:512};
 const pending=new EnterRoomRequest(c,pb).execute(target,a.signal);a.abort();await assert.rejects(pending,{name:'AbortError'});
 await assert.rejects(new EnterRoomRequest(c,pb).execute({...target},new AbortController().signal),/上一条/);
 t.frame(1002,99,55,snapshot());await new Promise(r=>setTimeout(r,0));
 t.onSend=(action)=>{if(action==='wsSend')t.frame(1002,100,55,snapshot());};
 const retry={...target};await new EnterRoomRequest(c,pb).execute(retry,new AbortController().signal);assert.equal(retry.roomID,100);c.destroy();
});
test('MTT entrance requests detail rather than cash Rooms and retains assigned room in snapshot',async()=>{
 const {EnterRoomProcedure}=await import('../.test-build/logic/EnterRoomProcedure.js');
 const t=new FakeTransport(),c=new ProtocolClient(t,()=>'test-token',1000),codes=[];
 t.onSend=(action,payload)=>{if(action!=='wsSend')return;const p=outbound(payload.data);codes.push(p.code);
  if(p.code===pb.Code.MSG_R_MTT_DETAIL){const req=pb.ClientMessageMttDetail.deserializeBinary(p.body),b=new pb.ServerMessageMttDetail(),m=new pb.MTTRecord();m.setMatchId(55);m.setType(512);m.setSeatCount(9);m.setName('');m.setDelayTimeType(1);b.setMtt(m);b.setStateCode(4);b.setRpcId(req.getRpcId());t.frame(pb.Code.MSG_R_MTT_DETAIL,0,0,b);}
  if(p.code===1002)t.frame(1002,99,55,snapshot());
 };
 const target={roomID:0,matchID:55,roomType:512},d=await new EnterRoomProcedure(c,pb).run(target,new AbortController().signal);
 assert.deepEqual(codes,[pb.Code.MSG_R_MTT_DETAIL,1002]);assert.equal(target.roomID,99);assert.equal(d.record.rid,99);assert.equal(d.record.roomType,512);assert.ok(d.mtt);assert.equal(d.mtt.delayTimeType,1);c.destroy();
});
