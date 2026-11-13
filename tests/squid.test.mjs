import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,record,snapshot} from './helpers/protocol-fixture.mjs';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {TexasMessageHandler} from '../.test-build/net/messages/texas/TexasMessageHandler.js';
import {EnterRoomMapper} from '../.test-build/logic/EnterRoomMapper.js';
import {StartInfo} from '../.test-build/net/messages/texas/StartInfo.js';
import {Winner} from '../.test-build/net/messages/texas/Winner.js';
import {HandClear} from '../.test-build/net/messages/texas/HandClear.js';
const target={roomID:1001,matchID:0,roomType:0};
function setup(){const data=new ProtocolRoomData();data.record=record().toObject();data.record.squidBase=100;data.snapshot=snapshot().toObject();data.snapshot.handInfo.inSquid=true;data.snapshot.playersList.forEach(p=>{p.inSquid=true;p.squidCount=0;});data.restoreSpecialOperations(2,3);return{data,c:new MessageContext(data,pb),router:new TexasMessageHandler(pb)};}
test('squid reconnect restores participation; wire join and next-change update only target seat',()=>{
 const {data,c,router}=setup();const mine=data.snapshot.playersList.find(p=>p.seatId===4);mine.inSquid=false;data.restoreSpecialOperations(2,3);new EnterRoomMapper(pb).map(data,target,1);assert.equal(data.squid.state.showJoin,true);assert.equal(data.squid.state.start,0);
 const join=new pb.ServerMessageSquidIn();join.setSeatId(4);join.setEnable(true);join.setSquidTotalLimit(6);
 assert.ok(router.accepts(1125));router.dispatch({code:1125,body:join.serializeBinary()},c);new EnterRoomMapper(pb).map(data,target,2);assert.equal(data.squid.state.showJoin,false);assert.equal(mine.inSquid,true);assert.equal(data.squid.totalLimit,6);
 const next=new pb.ServerMessageNextChange();next.setSquidOpen(false);next.setSquidTotalLimit(8);router.dispatch({code:1126,body:next.serializeBinary()},c);assert.equal(data.squid.totalLimit,8);
});
test('remaining classic/head/tail and bloody squid counts use CC rules, survive hand clear',()=>{
 const {data,c}=setup();data.record.squidHead=1;data.record.squidTail=1;data.snapshot.playersList[0].squidCount=1;
 new EnterRoomMapper(pb).map(data,target,1);assert.equal(data.squid.state.remaining,data.snapshot.playersList.length);HandClear({},c);assert.equal(data.snapshot.playersList[0].squidCount,1);
 data.record.squidMode=1;data.squid.totalLimit=8;new EnterRoomMapper(pb).map(data,target,2);assert.equal(data.squid.state.remaining,8);
 data.clear();assert.equal(data.squid.state.enabled,false);assert.equal(data.squid.totalLimit,0);
});
test('squid winner projects counts, signed EHC settlement, penalties and rejects stale hands',()=>{
 const {data,c}=setup();data.record.squidCountRateList=[{count:1,rate:2}];const w=new pb.ServerMessageWinner();w.setHandNum(data.snapshot.handInfo.handNum);const r=new pb.Result();r.setSeatId(4);r.setChip(1000);r.setSquidCount(1);const raw=r.toObject();raw.ehcsList=[{ehcType:pb.Def.EHCType.EHC_SQUID,pb_in:300,out:100}];
 const body={...w.toObject(),resultsList:[raw],pools:{squidDetailsList:[{userRid:99,name:'left',avatar:'',punishFee:-200}]}};
 assert.equal(Winner({...body,handNum:body.handNum-1},c),false);assert.equal(data.squid.state.resultSerial,0);
 Winner(body,c);assert.equal(data.squid.state.enabled,false);assert.deepEqual(data.squid.state.results.map(r=>[r.money,r.rate,r.isPunish]),[[200,2,false],[-200,0,true]]);assert.equal(data.snapshot.playersList.find(p=>p.seatId===4).squidCount,1);
 data.restoreSpecialOperations(2,3);assert.deepEqual(data.squid.state.results,[]);assert.equal(data.squid.state.start,0);
});
test('dealt players and waiting newcomers follow CC join-button rules without replay on sync',()=>{
 const {data,c}=setup();const mine=data.snapshot.playersList.find(p=>p.seatId===4);mine.inSquid=false;data.squid.showJoin=true;
 const msg=new pb.ServerMessageStartInfo().toObject();msg.handInfo={...data.snapshot.handInfo,handNum:data.snapshot.handInfo.handNum+1,inSquid:true,dealOrderList:[1]};msg.playersList=data.snapshot.playersList.map(p=>({...p}));
 StartInfo(msg,c);assert.equal(data.squid.showJoin,true);
 msg.handInfo={...msg.handInfo,handNum:msg.handInfo.handNum+1,dealOrderList:[1,4]};msg.playersList=msg.playersList.map(p=>p.seatId===4?{...p,inSquid:true}:p);StartInfo(msg,c);assert.equal(data.squid.showJoin,false);assert.equal(data.snapshot.playersList.find(p=>p.seatId===4).status,pb.Def.CanPlayStatus.NORMAL);
 data.restoreSpecialOperations(2,3);assert.equal(data.squid.state.start,0);
});
