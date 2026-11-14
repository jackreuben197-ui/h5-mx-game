import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {EnterRoomMapper} from '../.test-build/logic/EnterRoomMapper.js';
import {BettingMapper} from '../.test-build/logic/BettingMapper.js';
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
