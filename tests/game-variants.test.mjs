import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot} from './helpers/protocol-fixture.mjs';
import {RoomEntryPolicy} from '../.test-build/logic/RoomEntryPolicy.js';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {StartInfo} from '../.test-build/net/messages/texas/StartInfo.js';
import {EnterRoomMapper} from '../.test-build/logic/EnterRoomMapper.js';
import {BettingMapper} from '../.test-build/logic/BettingMapper.js';
const target={roomID:1001,matchID:0,roomType:0};
test('cash entry allows Omaha4/5/6 and 6+, but still excludes encrypted cards and matches',()=>{
 const policy=new RoomEntryPolicy(),room=record().toObject();
 for(const gameType of [0,1,2,3]) assert.doesNotThrow(()=>policy.check(target,{...room,gameType}));
 assert.doesNotThrow(()=>policy.check(target,{...room,pokerType:2}));
 for(const extra of [{gameType:7},{pokerType:7},{encryptCards:1}])assert.throws(()=>policy.check(target,{...room,...extra}));
 assert.throws(()=>policy.check({...target,matchID:1},room));
});
test('Omaha start, projection and pot-limit betting retain authoritative card count and maximum',()=>{
 for(const [gameType,count] of [[1,4],[2,5],[3,6]]){
  const data=new ProtocolRoomData();data.record={...record().toObject(),gameType,limitBetType:1};data.snapshot=snapshot().toObject();
  const hand={...data.snapshot.handInfo,handNum:26,publicCardsList:[],dealOrderList:[1,4]};
  const players=data.snapshot.playersList.filter(p=>[1,4].includes(p.seatId)).map(p=>({...p,cardsList:[]}));
  const op=new pb.Operator();op.setSeatId(4);const limit=new pb.ActionLimit();limit.setAction(pb.Def.Action.RAISE);limit.setMin(40);limit.setMax(120);op.setActionsList([limit]);
  StartInfo({handInfo:hand,playersList:players,nextOperator:op.toObject()},new MessageContext(data,pb));
  assert.equal(data.snapshot.playersList.find(p=>p.seatId===1).cardsList.length,count);
  const mapped=new EnterRoomMapper(pb).map(data,target,1);assert.equal(mapped.gameType,gameType);assert.equal(mapped.betting.max,120);
  assert.throws(()=>new BettingMapper(pb).resolve(data,'raise',121));
 }
});
