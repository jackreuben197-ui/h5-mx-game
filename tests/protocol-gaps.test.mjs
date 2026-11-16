import test from 'node:test';
import assert from 'node:assert/strict';
import {HostSessionData} from '../.test-build/data/HostSessionData.js';
import {GuestSitdownFlow,SeatLoginRequired} from '../.test-build/logic/GuestSitdownFlow.js';
import {TableSettingNewLabels} from '../.test-build/logic/TableSettingNewLabels.js';
import {DiamondPurchaseService} from '../.test-build/logic/DiamondPurchaseService.js';
import {MxRoomHost} from '../.test-build/host/MxRoomHost.js';
import {H5EntryController} from '../.test-build/host/H5EntryController.js';
import {pb,FakeTransport,outbound,record,snapshot} from './helpers/protocol-fixture.mjs';
const tick=()=>new Promise(r=>setTimeout(r,0));
async function setupHost({frozen=false,seated=false,guest=false}={}){
 const t=new FakeTransport(),a=new AbortController(),urls=[],codes=[];
 let forbid=frozen?0:1;
 const host=new MxRoomHost(t,{runtime:pb,timeoutMs:200,http:{baseURL:'https://test.invalid/api',fetch:async url=>{urls.push(new URL(url).pathname);return Response.json({code:0,data:String(url).endsWith('/user/info')?{user:{p_u_id:77,un_id:777,nickname:'audit',avatar:'',forbid}}:{return_table:false,wallet:[{club_id:1,club_name:'test',gold:100000}],club_id:1,gold:100000}});}}});
 const s=snapshot();if(!seated){s.getMyInfo().setSeatId(0);s.setPlayersList(s.getPlayersList().filter(p=>p.getSeatId()!==4));}s.getRoomInfo().setCurrentMinRate(10);s.getRoomInfo().setCurrentMaxRate(100);
 t.emit('enterTable',{token:'00000000000000000000000000000000'});t.emit('syncUser',{uid:77,randomId:777,isExperience:guest});
 t.onSend=(action,payload)=>{if(action!=='wsSend')return;const p=outbound(payload.data);codes.push(p.code);if(p.code===pb.Code.MSG_R_ROOMS){const b=new pb.ServerMessageRooms(),r=record();r.setGoldType(1);b.setRpcId(pb.ClientMessageRooms.deserializeBinary(p.body).getRpcId());b.setRoomsList([r]);t.frame(p.code,0,0,b);}else if(p.code===1002)t.frame(p.code,1001,0,s);};
 const target={roomID:1001,matchID:0,roomType:0};await host.enter(target,a.signal,()=>{});
 return {host,t,a,target,urls,codes,setFrozen:v=>forbid=v?0:1,dispose(){a.abort();host.destroy();}};
}
test('frozen user is rejected for sit, return and supplemental bring-in before transaction sends',async()=>{
 for(const seated of [false,true]){const c=await setupHost({frozen:true,seated});try{await assert.rejects(c.host.prepareSeat(c.target,seated?0:4,c.a.signal));assert.ok(c.urls.includes('/api/user/info'));assert.ok(!c.codes.includes(pb.Code.MSG_D_SEATED)&&!c.codes.includes(pb.Code.MSG_D_BRING_IN));}finally{c.dispose();}}
});
test('normal account gets quote, a later freeze notification prevents its submission',async()=>{
 const c=await setupHost();try{const q=await c.host.prepareSeat(c.target,4,c.a.signal);assert.equal(q.seat,4);c.t.emit('syncUser',{uid:77,randomId:777,raw:{user:{forbid:0}}});await assert.rejects(c.host.sitDown(c.target,{quoteID:q.id,amount:q.min,clubID:1,autoAmount:0},c.a.signal));assert.ok(!c.codes.includes(pb.Code.MSG_D_SEATED));}finally{c.dispose();}
});
test('guest seat request opens H5 login and never queries buy-in or sends seated',async()=>{
 const c=await setupHost({guest:true});try{const count=c.urls.length;await assert.rejects(c.host.prepareSeat(c.target,4,c.a.signal),SeatLoginRequired);assert.equal(c.urls.length,count);assert.equal(c.t.sent.at(-1).payload.loginContext,'table-sitdown');assert.ok(!c.codes.includes(pb.Code.MSG_D_SEATED));}finally{c.dispose();}
});
test('guest auth preserves pending seat across token switch then resumes once; occupied/cancelled/wrong room never resume',()=>{
 for(const kind of ['success','occupied','cancelled','wrong','already-seated','still-guest']){
  const t=new FakeTransport(),flow=new GuestSitdownFlow(t,()=>kind==='still-guest'),resumed=[],target={roomID:1001,matchID:0,roomType:0};
  flow.begin(target,4);flow.auth('switching');flow.stateChanged({phase:'hidden'},s=>resumed.push(s));
  if(kind==='cancelled')flow.auth('cancelled');flow.entering(kind==='wrong'?2000:1001);
  const state={phase:'table',target,table:{mySeat:kind==='already-seated'?3:0,players:kind==='occupied'?[{seat:4,userRid:99}]:[]}};
  flow.stateChanged(state,s=>resumed.push(s));flow.stateChanged(state,s=>resumed.push(s));assert.deepEqual(resumed,kind==='success'?[4]:[],kind);
 }
});
test('H5 auth integration handles real token arriving in enterTable without losing pending seat',()=>{
 const t=new FakeTransport(),flow=new GuestSitdownFlow(t,()=>false),resumed=[];let state={phase:'hidden',target:null},entry;
 const game={element:{style:{setProperty(){}}},getState:()=>state,leave(){state={phase:'hidden',target:null};entry?.stateChanged(state);},enter(target){state={phase:'table',target,table:{mySeat:0,players:[]}};entry.stateChanged(state);return Promise.resolve();},requestSeat:s=>resumed.push(s)};
 entry=new H5EntryController(t,game,flow);const payload={token:'guest',roomId:1001,roomInfo:{rid:1001,room_type:0},websocketPort:1234};
 t.emit('enterTable',payload);flow.begin(state.target,4);t.emit('tableSitdownAuth',{state:'switching'});t.emit('enterTable',{...payload,token:'real'});assert.deepEqual(resumed,[4]);entry.destroy();
});
test('identity fields and diamond notifications are account scoped, equal sync is silent',()=>{
 const s=new HostSessionData(),values=[];s.on(HostSessionData.DIAMONDS_CHANGE,v=>values.push(v));
 const p={uid:1,randomId:2,isExperience:true,raw:{user:{forbid:0,diamonds:100}}};s.update('syncUser',p);s.update('syncUser',p);assert.equal(s.forbid,true);assert.equal(s.isGuestAccount,true);assert.deepEqual(values,[100]);
 s.update('syncUser',{uid:3,randomId:4});assert.equal(s.forbid,false);assert.equal(s.isGuestAccount,false);assert.equal(s.diamonds,undefined);s.clear();
});
test('new labels read camel counts, deduplicate labels, stop after three displays, no unsupported key report',async()=>{
 const calls=[],a=new AbortController();let changes=0;
 const n=new TableSettingNewLabels({request:async(path,body)=>{calls.push({path,body});return {user_new_label_num:{roomRandomSeat:2,room_jackpot:3}};}},7,a.signal,()=>changes++);
 await Promise.all([n.load(),n.load()]);assert.equal(calls.length,1);assert.equal(n.isNew('room_random_seat'),true);assert.equal(n.isNew('room_jackpot'),false);
 await n.report(['room_random_seat','room_random_seat','fake','room_jackpot']);assert.deepEqual(calls[1].body,{tribe_id:7,user_read_labels:['room_random_seat']});assert.equal(n.isNew('room_random_seat'),false);await n.report(['room_random_seat']);assert.equal(calls.length,2);assert.equal(changes,2);
});
test('new labels retry failures and ignore absent tribe or disposed room',async()=>{
 const a=new AbortController();let fail=true,calls=0,changes=0;
 const http={request:async()=>{calls++;if(fail)throw Error('offline');return {user_new_label_num:{}};}};
 const n=new TableSettingNewLabels(http,7,a.signal,()=>changes++);await n.load();assert.equal(n.isNew('room_jackpot'),false);fail=false;await n.load();assert.equal(n.isNew('room_jackpot'),true);
 fail=true;await n.report(['room_jackpot']);assert.equal(n.isNew('room_jackpot'),true);const before=calls;a.abort();await n.report(['room_jackpot']);await new TableSettingNewLabels(http,0,new AbortController().signal,()=>{}).load();assert.equal(calls,before);
});
test('diamond catalog cannot overwrite newer sync with an in-flight wallet result',async()=>{
 const a=new AbortController(),s=new HostSessionData();s.setDiamonds(100);let resolve;
 const service=new DiamondPurchaseService({request:async path=>path.endsWith('user_diamonds_wallet')?new Promise(r=>resolve=r):path.endsWith('/info')?{user:{trader_expire_time:Date.now()/1000+60}}:{list:[],pay_types:[]}},a.signal,s);
 const changes=[],off=service.subscribeBalance(v=>changes.push(v)),task=service.catalog();s.setDiamonds(200);resolve({diamonds_wallet:{diamonds:100}});assert.equal((await task).balance,200);assert.deepEqual(changes,[200]);off();s.setDiamonds(300);assert.deepEqual(changes,[200]);a.abort();
});
