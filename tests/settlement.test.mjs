import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, record, snapshot } from './helpers/protocol-fixture.mjs';
import { SettlementMapper } from '../.test-build/logic/SettlementMapper.js';
import { Winner } from '../.test-build/net/messages/texas/Winner.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';
import { SeatData } from '../.test-build/data/SeatData.js';
const result=(seatId,values={})=>({...new pb.Result().toObject(),seatId,...values});
test('CC settlement separates personal highlight from highest winning-type popup and gray',()=>{
 const mine=result(4,{win:50,handBet:100,handValueType:2,winCardsList:[{card:14,isPublic:false},{card:2,isPublic:true}]});
 const winner=result(2,{win:500,handBet:100,insuranceWin:20,insurance:10,fee:5,handValueType:5,winCardsList:[{card:29,isPublic:false},{card:18,isPublic:true},{card:36,isPublic:true}]});
 const s=new SettlementMapper().map(25,[mine,winner],4,new Set([2,4]));
 assert.deepEqual(s.seats[4].cards,{highlight:[14],popup:[]});
 assert.deepEqual(s.seats[2].cards,{popup:[29]});
 assert.deepEqual(s.community,{highlight:[2],popup:[18,36]});
 assert.deepEqual(s.seats[2].win,{handValueType:5,collectedChips:405});
 assert.equal(s.seats[4].win,undefined);
});
test('CC uses first max-type winner, skips stood-up results, and does not gray an unshown walkover',()=>{
 const a=result(1,{win:200,handBet:100,handValueType:3,winCardsList:[{card:2,isPublic:false}]});
 const b=result(2,{win:200,handBet:100,handValueType:3,winCardsList:[{card:3,isPublic:false}]});
 const stood=result(3,{win:1000,handBet:100,handValueType:10,standUp:true});
 const mapper=new SettlementMapper();const s=mapper.map(25,[a,b,stood],0,new Set([1,2,3]));
 assert.deepEqual(s.seats[1].cards.popup,[2]);assert.deepEqual(s.seats[2].cards.popup,[]);assert.equal(s.seats[3],undefined);
 const walk=mapper.map(25,[result(1,{win:100,handBet:50})],0,new Set([1]));
 assert.equal(walk.community.popup,undefined);assert.equal(walk.seats[1].cards.popup,undefined);
});
test('Winner emphasis reaches both UI projections and clears on next hand, stale Winner is ignored',()=>{
 const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();
 const ctx=new MessageContext(data,pb),handler=Winner,mapper=new EnterRoomMapper(pb),target={roomID:1001,matchID:0,roomType:0};
 const payload={...new pb.ServerMessageWinner().toObject(),handNum:25,resultsList:[result(4,{win:200,handBet:100,chip:1104,handValueType:2,myCardsList:[14,29],winCardsList:[{card:14,isPublic:false},{card:2,isPublic:true}]})]};
 assert.equal(handler(payload,ctx),true);
 const ui=mapper.map(data,target,1);assert.deepEqual(ui.communityEmphasis.popup,[2]);assert.deepEqual(ui.players.find(p=>p.seat===4).settlement.cards.highlight,[14]);
 const before=data.snapshot.settlement;assert.equal(handler({...payload,handNum:24},ctx),false);assert.equal(data.snapshot.settlement,before);
 ctx.clearHand();const cleared=mapper.map(data,target,2);assert.equal(cleared.communityEmphasis,undefined);assert.equal(cleared.players.find(p=>p.seat===4).settlement,undefined);
});

test('pre-river direct wins project the cleared hand and winning amount together',()=>{
 for(const community of [[],[2,18,36],[2,18,36,39]]){
  const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();
  data.snapshot.handInfo.publicCardsList=community;
  const ctx=new MessageContext(data,pb),mapper=new EnterRoomMapper(pb),target={roomID:1001,matchID:0,roomType:0};
  const seat=new SeatData(4);seat.replace(mapper.map(data,target,1));assert.equal(seat.state.player.cards.length,2);
  const body={...new pb.ServerMessageWinner().toObject(),handNum:25,resultsList:[result(4,{win:200,handBet:100,chip:1104,handValueType:0,myCardsList:[]})]};
  assert.equal(Winner(body,ctx),true);seat.replace(mapper.map(data,target,2));
  assert.equal(seat.state.handEnded,true);assert.deepEqual(seat.state.player.cards,[]);
  assert.deepEqual(seat.state.player.settlement.win,{handValueType:0,collectedChips:100});
  ctx.clearHand();seat.replace(mapper.map(data,target,3));assert.equal(seat.state.player.settlement,undefined);
 }
});
