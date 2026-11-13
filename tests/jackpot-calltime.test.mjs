import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {TexasMessageHandler} from '../.test-build/net/messages/texas/TexasMessageHandler.js';
import {Winner} from '../.test-build/net/messages/texas/Winner.js';
import {Standup} from '../.test-build/net/messages/texas/Standup.js';
import {JackpotService} from '../.test-build/logic/JackpotService.js';
function setup(){const d=new ProtocolRoomData();d.record=record().toObject();Object.assign(d.record,{jackpot:1,jackpotId:3,jackpotGold:20000,jackpotParentGold:50000,calltime:1,calltimeWinLine:10,calltimeLimit:10});d.snapshot=snapshot().toObject();Object.assign(d.snapshot.myInfo,{callTimeCount:2,callTimeStay:true});d.restoreSpecialOperations(2,3);return {d,c:new MessageContext(d,pb)};}
test('Jackpot wire changes preserve parent-pool fallback and reconnect does not replay opening',()=>{
 const {d,c}=setup(),router=new TexasMessageHandler(pb),m=new pb.ServerMessageJackpotGoldChange();m.setJackpotId(3);m.setJackpotGold(25000);m.setJackpotParentGold(0);
 assert.ok(router.accepts(pb.Code.MSG_S_JACKPOT_GOLD_CHANGE));router.dispatch({code:pb.Code.MSG_S_JACKPOT_GOLD_CHANGE,body:m.serializeBinary()},c);
 assert.equal(d.jackpot.displayPool,25000);d.jackpot.start();assert.equal(d.jackpot.state.start,1);d.restoreSpecialOperations(2,3);assert.equal(d.jackpot.state.start,0);assert.equal(d.jackpot.displayPool,25000);
 d.clear();assert.equal(d.jackpot.enabled,false);
});
test('CallTime uses own authoritative settlement, rejects stale hands and clears on standup',()=>{
 const {d,c}=setup();assert.deepEqual(d.callTime.state,{count:2,stay:true});
 const winner=new pb.ServerMessageWinner().toObject(),result=new pb.Result().toObject();Object.assign(result,{seatId:d.snapshot.myInfo.seatId,callTimeCount:3,callTimeStay:true,totalChips:900,storeChips:100});Object.assign(winner,{handNum:d.snapshot.handInfo.handNum,resultsList:[result]});
 Winner(winner,c);assert.deepEqual(d.callTime.state,{count:3,stay:true});assert.equal(d.snapshot.myInfo.totalChips,900);
 Winner({...winner,handNum:0},c);assert.equal(d.callTime.state.count,3);
 result.callTimeStay=false;result.callTimeCount=10;Winner(winner,c);assert.equal(d.callTime.state.stay,false);
 Standup({seatId:result.seatId},c);assert.deepEqual(d.callTime.state,{count:0,stay:false});
});
test('Jackpot preloads once, forwards CC panel props and awards; abort suppresses late UI',async()=>{
 const {d,c}=setup(),sent=[],requests=[],abort=new AbortController();
 const service=new JackpotService(d,{request:async(path,body)=>{requests.push([path,body]);return path.endsWith('/info')?{item:{name:'test'}}:{items:[{id:1}],top_cards_type_data:{id:1}};}},{send:(...args)=>sent.push(args)},abort.signal);
 await Promise.all([service.preload(),service.preload()]);assert.equal(requests.length,2);service.open();assert.equal(sent[0][1].props.jackpot_parent_gold,50000);assert.equal(sent[0][1].props.initial_records.length,1);
 const message=new pb.ServerMessageJackpotAward();message.addAwardUsers();new TexasMessageHandler(pb).dispatch({code:pb.Code.MSG_S_JACKPOT_AWARD,body:message.serializeBinary()},c);assert.equal(sent[1][1].panelType,'jackpotAward');
 abort.abort();service.open();d.jackpot.award([{}]);assert.equal(sent.length,2);
});
