import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, FakeTransport, outbound, snapshot, record } from './helpers/protocol-fixture.mjs';
import { ProtocolClient } from '../.test-build/net/ProtocolClient.js';
import { SeatedRequest } from '../.test-build/net/requests/SeatedRequest.js';
import { StandupRequest } from '../.test-build/net/requests/StandupRequest.js';
import { SeatedDataBuilder } from '../.test-build/logic/SeatedDataBuilder.js';
import { BringInRules } from '../.test-build/logic/BringInRules.js';
import { Operator, updateOperatorAfterAddTime } from '../.test-build/logic/Operator.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { AddTimeOthers } from '../.test-build/net/messages/texas/AddTimeOthers.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
const target = { roomID:1001, matchID:0, roomType:0 };
const info = () => ({ ...new pb.RoomInfo().toObject(), smallBlind:1000,currentMinRate:10,currentMaxRate:100,deposit:500,limitRetainMinRate:10,limitRetainMaxRate:100 });
test('CC bring-in min/max and retain branches preserve protocol integer units', () => {
  const room = info();
  assert.deepEqual(new BringInRules(room).caculateCanBringMinMax(), {minAmount:20500,maxAmount:200000,step:2000,needDeposit:true});
  const q = { seat:4, returnOrNew:1 }, selection={amount:30000,clubID:5,autoAmount:0};
  const builder=new SeatedDataBuilder();
  assert.equal(builder.build(target,{...room,retainType:2},q,selection).store,10000);
  const auto=builder.build(target,{...room,retainType:1},q,selection);
  assert.equal(auto.autoOnTable,20000);assert.equal(auto.autoOnTableFix,20000);assert.equal(auto.autoOnTableMax,200000);
  const returned=builder.build(target,{...room,retainType:2},{...q,returnAmount:30000},selection);
  assert.equal(returned.store,9500);
  const smallReturn=builder.build(target,{...room,retainType:2},{...q,returnAmount:9468,autoReturn:true},{...selection,amount:9468});
  assert.equal(smallReturn.store,0,'CC manual retain sends zero store when returned chips are below the retained minimum');
  const recharge=builder.build(target,room,q,{...selection,autoAmount:40000});
  assert.equal(recharge.autoUseWallet,true);assert.equal(recharge.autoOnTableNoStore,true);assert.equal(recharge.autoOnTable,40000);
});
test('seated binary message carries all CC fields over the existing H5 transport', async t => {
  const transport = new FakeTransport(), client = new ProtocolClient(transport,()=> 'test',100);
  t.after(()=>client.destroy());
  const data = new SeatedDataBuilder().build(target,{...info(),retainType:1},{seat:4,returnOrNew:1},{amount:9468,clubID:5,autoAmount:0});
  transport.onSend=(action,payload)=>{
    assert.equal(action,'wsSend');const packet=outbound(payload.data);
    assert.equal(packet.code,pb.Code.MSG_D_SEATED);
    assert.deepEqual(pb.ClientMessageSeated.deserializeBinary(packet.body).toObject(),data);
    const reply=new pb.ServerMessageSeated();reply.setRecvSeatId(4);reply.setChips(9468);
    transport.frame(packet.code,1001,0,reply);
  };
  await new SeatedRequest(client,pb).execute(target,data,new AbortController().signal);
});
test('standup respects server pending-hand response without optimistic removal', async t => {
  const transport=new FakeTransport(),client=new ProtocolClient(transport,()=> 'test',100);t.after(()=>client.destroy());
  transport.onSend=(action,payload)=>{
    const packet=outbound(payload.data),request=pb.ClientMessageStandupActive.deserializeBinary(packet.body);
    assert.equal(request.getCancelStandup(),false);assert.equal(request.getManualChangeRoom(),false);
    const reply=new pb.ServerMessageStandupActive();reply.setWillStandup(true);transport.frame(packet.code,1001,0,reply);
  };
  assert.equal(await new StandupRequest(client,pb).execute(target,new AbortController().signal),true);
});
test('CC operator countdown uses the deadline and adds time without mutating the prior state', () => {
  const now=Date.now,base=100000;Date.now=()=>base;
  try {
    const op=new Operator();op.totalOpDuration=15;op.leftOpDuration=15;op.deadlineTImestamp=105;
    assert.equal(op.leftOpDuration,5);assert.equal(op.elapsedTime,10);
    const added=updateOperatorAfterAddTime(op,{duration:10,times:1,deadline:115});
    assert.equal(added.totalOpDuration,25);assert.equal(added.leftOpDuration,15);assert.equal(op.deadlineTImestamp,105);
    Date.now=()=>116000;assert.equal(added.leftOpDuration,0);
  } finally { Date.now=now; }
});
test('unrelated snapshots do not restart legacy countdown; add-time updates its total', () => {
  const now=Date.now;Date.now=()=>100000;
  try {
    const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();data.snapshot.roomInfo.opDuration=15;
    data.snapshot.operatorList=[{...new pb.Operator().toObject(),seatId:2,leftOpTime:10}];
    const mapper=new EnterRoomMapper(pb);
    assert.deepEqual(mapper.map(data,target,1).countdowns,[{seat:2,deadline:110,totalTime:15}]);
    Date.now=()=>103000;
    assert.deepEqual(mapper.map(data,target,2).countdowns,[{seat:2,deadline:110,totalTime:15}]);
    AddTimeOthers({seatId:2,duration:10,times:1,deadline:120},new MessageContext(data,pb));
    assert.deepEqual(mapper.map(data,target,3).countdowns,[{seat:2,deadline:120,totalTime:25}]);
    data.snapshot.operatorList=[];assert.deepEqual(mapper.map(data,target,4).countdowns,[]);
  } finally {Date.now=now;}
});
