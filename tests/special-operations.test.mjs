import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, record, snapshot } from './helpers/protocol-fixture.mjs';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
import { AgreeSecondPcsTrigged } from '../.test-build/net/messages/texas/AgreeSecondPcsTrigged.js';
import { AgreeSecondPcs } from '../.test-build/net/messages/texas/AgreeSecondPcs.js';
import { AgreeSecondPcsActive } from '../.test-build/net/messages/texas/AgreeSecondPcsActive.js';
import { InsuranceTrigged } from '../.test-build/net/messages/texas/InsuranceTrigged.js';
import { BuyInsurance } from '../.test-build/net/messages/texas/BuyInsurance.js';
import { PublicCards } from '../.test-build/net/messages/texas/PublicCards.js';
import { HandClear } from '../.test-build/net/messages/texas/HandClear.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';
import { InsuranceRules, PoolType } from '../.test-build/logic/InsuranceRules.js';
function setup(){const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();return {data,context:new MessageContext(data,pb)};}
function operator(seat,second=false){const op=new pb.Operator();op.setSeatId(seat);op.setIsInsurance(!second);op.setIsAgreeSecondPc(second);op.setLeftOpTime(30);return op.toObject();}
test('second-board voting preserves all participants, reject result and retry, closes on real cards',()=>{
 const {data,context}=setup();
 AgreeSecondPcsTrigged({operatorList:[operator(4,true),operator(1,true)]},context);
 assert.equal(data.secondPcs.state.active,true);assert.deepEqual(data.secondPcs.state.participantSeatIds,[4,1]);
 assert.ok(data.secondPcs.state.deadline>Date.now()/1000);
 AgreeSecondPcs({seatId:1,result:false},context);assert.equal(data.secondPcs.state.votes[1],false);
 AgreeSecondPcsActive({status:99},context);assert.equal(data.secondPcs.state.pending,false);
 AgreeSecondPcsActive({status:0},context);assert.equal(data.secondPcs.state.pending,true);
 PublicCards({rnd:pb.Def.Round.TURN,publicCardsArrayList:[42],publicCardsArray2List:[],extPublicCardsArrayList:[43,44],allinUsersList:[]},context);
 assert.equal(data.secondPcs.state.active,false);
 const mapped=new EnterRoomMapper(pb).map(data,{roomID:1001,matchID:0,roomType:0},1);
 assert.deepEqual(mapped.secondCommunity,[...mapped.community.slice(0,3),43,44]);
 HandClear({},context);assert.deepEqual(data.snapshot.handInfo.secondPublicCardsList,[]);
});
test('insurance restores on reconnect, settles only the purchased seat and clears on hand boundary',()=>{
 const {data,context}=setup();
 InsuranceTrigged({round:pb.Def.Round.FLOP,operatorList:[operator(4),operator(1)],invalidPotsList:[]},context);
 assert.equal(data.insurance.state.operator.seatId,4);
 data.restoreSpecialOperations(pb.Def.Round.FLOP,pb.Def.Round.TURN);
 assert.equal(data.insurance.state.round,pb.Def.Round.FLOP);
 BuyInsurance({seatId:1,round:pb.Def.Round.FLOP,buyList:[]},context);
 assert.equal(data.insurance.state.operator.seatId,4);
 assert.deepEqual(data.snapshot.operatorList.map(o=>o.seatId),[4]);
 BuyInsurance({seatId:4,round:pb.Def.Round.FLOP,buyList:[]},context);
 assert.equal(data.insurance.state.operator,undefined);
 assert.equal(data.insurance.purchases.size,2);
 HandClear({},context);assert.equal(data.insurance.purchases.size,0);
});
test('CC insurance arithmetic keeps odds buckets, split outs and forced minimum rounding',()=>{
 const pot={potAmount:100000,potLeaderCount:2,potUserCount:3,bet:10000,insuranced:1000,min:2345,max:50000,odds:4,outsDetailList:[{outsCardsList:[{card:12,isEqual:false},{card:13,isEqual:true}]},{outsCardsList:[{card:12,isEqual:false}]}]};
 const rules=new InsuranceRules(2,2,333,[{potUserCount:3,oddsList:[{outs:1,odds:5}]}]);
 assert.deepEqual(rules._splitOuts(pot),{overOuts:[12],equalOuts:[13]});
 assert.equal(rules._compensateAmount(pot,PoolType.THIRD),166.5);
 assert.equal(rules._overOutsPay(pot,PoolType.THIRD),2345);
 assert.equal(rules._equalOutsPay(pot,2345),469);
 assert.equal(rules._realPayAmount(pot,PoolType.THIRD),28.14);
 rules.round=3;assert.equal(rules._overOutsPay(pot,PoolType.THIRD),3330);
 assert.equal(rules._canPayFromPoolType({...pot,max:1},PoolType.ALL),false);
});

test('insurance keeps per-pot selections and builds one complete purchase without duplicates',async()=>{
 const {InsuranceChoices}=await import('../.test-build/logic/InsuranceChoices.js');
 const make=(id,amount)=>({potId:id,potAmount:amount,potLeaderCount:1,potUserCount:2,bet:10000,insuranced:0,min:0,max:100000,odds:5,outsDetailList:[{seatId:2,outsCardsList:[{card:13,isEqual:false}]}]});
 const pots=[make(1,100000),make(2,60000)],rules=new InsuranceRules(2,2,0,[]),choices=new InsuranceChoices(rules,pots);
 choices.select(pots[0],PoolType.THIRD);choices.select(pots[1],PoolType.HALF);
 assert.equal(choices.get(pots[0]),PoolType.THIRD);assert.equal(choices.get(pots[1]),PoolType.HALF);
 const list=choices.purchases(true);assert.deepEqual(list.map(v=>[v.potId,v.activeAmount]),[[1,6660],[2,6000]]);
 assert.equal(choices.purchases(true).length,2);assert.deepEqual(choices.purchases(false),[]);
});
test('insurance number and suit sorting preserve the same outs with distinct ordering',()=>{
 const rules=new InsuranceRules(2,2,0,[]),cards=[44,18,13,31,28];
 rules._sortCards(cards);assert.deepEqual(cards,[31,18,13,28,44]);
 rules._sortByGraphics=true;rules._sortCards(cards);assert.deepEqual(cards,[13,18,28,31,44]);
});
