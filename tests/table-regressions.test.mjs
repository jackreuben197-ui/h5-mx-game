import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {EnterRoomMapper} from '../.test-build/logic/EnterRoomMapper.js';
import {BettingMapper} from '../.test-build/logic/BettingMapper.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {TexasMessageHandler} from '../.test-build/net/messages/texas/TexasMessageHandler.js';
const fixture=()=>{const d=new ProtocolRoomData();d.record=record().toObject();d.snapshot=snapshot().toObject();return d;};
test('ordinary operator clears stale away/waiting state, insurance voting does not',()=>{
 for(const insurance of [false,true]){
  const d=fixture(),p=d.snapshot.playersList.find(p=>p.seatId===4);
  Object.assign(p,{status:0,keepSeatReason:4,keepSeatDeadline:9999999999,keepSeatLeftTime:30});
  d.snapshot.operatorList=[{...new pb.Operator().toObject(),seatId:4,isInsurance:insurance,actionsList:[{action:pb.Def.Action.CHECK,min:0,max:0,straddleLevel:0}]}];
  new EnterRoomMapper(pb).map(d,{roomID:1001,matchID:0,roomType:0},1);
  assert.equal(p.keepSeatReason,insurance?4:0);assert.equal(p.status,insurance?0:pb.Def.CanPlayStatus.NORMAL);
 }
});
test('straddle obeys explicit room limit and defaults to a single level',()=>{
 const d=fixture(),mapper=new BettingMapper(pb),limit={action:pb.Def.Action.STRADDLE,min:40,max:40,straddleLevel:1};
 d.snapshot.operatorList=[{...new pb.Operator().toObject(),seatId:4,actionsList:[limit]}];
 assert.ok(mapper.map(d).actions.includes('straddle'));
 limit.straddleLevel=2;assert.ok(!mapper.map(d).actions.includes('straddle'));
 d.record.straddleMax=2;assert.ok(mapper.map(d).actions.includes('straddle'));
 d.record.straddleMax=1;limit.straddleLevel=0;d.snapshot.playersList[0].action=pb.Def.Action.STRADDLE;
 assert.ok(!mapper.map(d).actions.includes('straddle'));
 limit.straddleLevel=1;assert.ok(!mapper.map(d).actions.includes('straddle'));
});

test('turn changes and checks preserve the prior blind until the next street',()=>{
 const data=fixture(),target={roomID:1001,matchID:0,roomType:0},context=new MessageContext(data,pb);
 const router=new TexasMessageHandler(pb),mapper=new EnterRoomMapper(pb);
 const hand=data.snapshot.handInfo;
 data.snapshot.gameStatus=pb.Def.GameStatus.HAND_PREFLOP;
 hand.publicCardsList=[];
 hand.roundBet=20;
 data.snapshot.playersList.find(p=>p.seatId===4).roundBet=20;
 let rev=0;
 const apply=(code,message)=>{
  assert.equal(router.dispatch({...target,code,body:message.serializeBinary()},context),true);
  return mapper.map(data,target,++rev);
 };
 const check=new pb.ActionLimit();check.setAction(pb.Def.Action.CHECK);
 const next=new pb.Operator();next.setSeatId(4);next.setActionsList([check]);
 const call=new pb.ServerMessageActionAll();call.setOperatorSeatId(1);call.setAction(pb.Def.Action.CALL);
 call.setAmount(20);call.setLeftChips(981);call.setRoundBet(20);call.setAllBet(40);call.setNextOperator(next);
 let state=apply(pb.Code.MSG_S_ACTION_ALL,call);
 assert.equal(state.actingSeat,4);
 assert.deepEqual(state.actions,['check']);
 assert.equal(state.players.find(p=>p.seat===4).roundBet,20);
 const checked=new pb.ServerMessageActionAll();checked.setOperatorSeatId(4);checked.setAction(pb.Def.Action.CHECK);
 checked.setLeftChips(1004);checked.setRoundBet(20);checked.setAllBet(40);
 state=apply(pb.Code.MSG_S_ACTION_ALL,checked);
 assert.equal(state.players.find(p=>p.seat===4).roundBet,20);
 const flop=new pb.ServerMessagePublicCards();flop.setRnd(pb.Def.Round.FLOP);flop.setPublicCardsArrayList([2,18,36]);
 state=apply(pb.Code.MSG_S_PUBLIC_CARDS,flop);
 assert.equal(state.players.find(p=>p.seat===4).roundBet,0);
 assert.equal(state.pot,40);
});
