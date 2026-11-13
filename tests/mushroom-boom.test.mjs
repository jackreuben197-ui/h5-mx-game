import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {StartInfo} from '../.test-build/net/messages/texas/StartInfo.js';
import {HandClear} from '../.test-build/net/messages/texas/HandClear.js';
import {PublicCards} from '../.test-build/net/messages/texas/PublicCards.js';
import {Winner} from '../.test-build/net/messages/texas/Winner.js';
import {ChipsChange} from '../.test-build/net/messages/texas/ChipsChange.js';
function setup(){const data=new ProtocolRoomData();data.record=record().toObject();data.record.mushroomBase=40;data.record.mushroomMode=2;data.snapshot=snapshot().toObject();Object.assign(data.snapshot.handInfo,{buSeatId:1,pools:{mushroomPool:360},criticalHitOpen:true});data.restoreSpecialOperations(2,3);return {data,c:new MessageContext(data,pb)};}
function next(data,changes={}){return {...new pb.ServerMessageStartInfo().toObject(),handInfo:{...data.snapshot.handInfo,handNum:data.snapshot.handInfo.handNum+1,publicCardsList:[],secondPublicCardsList:[],...changes},playersList:data.snapshot.playersList.map(p=>({...p}))};}
test('mushroom reconnect restores pool, CC rounded count and dealer without movement; clear-hand retains pool',()=>{
 const {data,c}=setup();assert.equal(data.mushroom.state.count,9);assert.equal(data.mushroom.state.seat,1);assert.equal(data.mushroom.state.animate,false);assert.equal(data.criticalHit.state.start,0);
 HandClear({},c);assert.equal(data.mushroom.state.pool,360);
 StartInfo(next(data,{buSeatId:4,pools:{mushroomPool:399.9999},criticalHitOpen:false}),c);
 assert.equal(data.mushroom.state.previousSeat,1);assert.equal(data.mushroom.state.seat,4);assert.equal(data.mushroom.state.animate,true);assert.equal(data.mushroom.state.count,10);
 data.restoreSpecialOperations(2,3);assert.equal(data.mushroom.state.animate,false);
});
test('critical-hit entry animates once, rejects stale start, restores without replay, and zero pool preserves the CC previous badge',()=>{
 const {data,c}=setup();StartInfo(next(data,{criticalHitOpen:false}),c);const start=next(data,{criticalHitOpen:true,pools:{mushroomPool:0}});StartInfo(start,c);assert.equal(data.criticalHit.state.start,1);assert.equal(data.mushroom.state.seat,1);
 assert.equal(StartInfo(start,c),false);assert.equal(data.criticalHit.state.start,1);
 StartInfo(next(data,{criticalHitOpen:true}),c);assert.equal(data.criticalHit.state.start,1);
 data.restoreSpecialOperations(2,3);assert.equal(data.criticalHit.state.start,0);
 data.clear();assert.equal(data.criticalHit.state.enabled,false);assert.equal(data.mushroom.state.pool,0);
});
test('boompot flop/turn/river and mushroom settlement/split keep authoritative chips and deposit',()=>{
 const {data,c}=setup();StartInfo(next(data,{criticalHitOpen:true}),c);
 for(const [rnd,cards] of [[pb.Def.Round.FLOP,[1,2,3]],[pb.Def.Round.TURN,[4]],[pb.Def.Round.RIVER,[5]]]){
  const message=new pb.ServerMessagePublicCards().toObject();message.rnd=rnd;message.publicCardsArrayList=cards;PublicCards(message,c);
 }
 assert.deepEqual(data.snapshot.handInfo.publicCardsList,[1,2,3,4,5]);assert.equal(data.snapshot.gameStatus,pb.Def.GameStatus.HAND_RIVER);
 const winner=new pb.ServerMessageWinner().toObject(),result=new pb.Result().toObject();Object.assign(result,{seatId:4,chip:740,deposit:80,ehcsList:[{ehcType:pb.Def.EHCType.EHC_MUSHROOM,pb_in:360,out:40}]});Object.assign(winner,{handNum:data.snapshot.handInfo.handNum,resultsList:[result]});Winner(winner,c);
 assert.equal(data.snapshot.playersList.find(p=>p.seatId===4).chip,740);assert.equal(data.snapshot.playersList.find(p=>p.seatId===4).deposit,80);
 ChipsChange({changesList:[{seatId:4,reason:pb.Def.ChipChangeReason.CC_MUSHROOM_SPLIT,chips:820,storeChips:40,change:80}]},c);assert.equal(data.snapshot.playersList.find(p=>p.seatId===4).chip,820);assert.equal(data.snapshot.myInfo.storeChips,40);
});
