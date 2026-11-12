import test from 'node:test';
import assert from 'node:assert/strict';
import {pb,FakeTransport,outbound,record,snapshot} from './helpers/protocol-fixture.mjs';
import {MxRoomHost} from '../.test-build/host/MxRoomHost.js';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {PublicReplay} from '../.test-build/net/messages/texas/PublicReplay.js';
import ReportData from '../.test-build/data/TexasGameRoomDataReport.js';
import {HistoryController} from '../.test-build/logic/HistoryController.js';
import {parseHistoryHand} from '../.test-build/logic/HistoryReplayModel.js';
import {HistoryPricing} from '../.test-build/logic/HistoryPricing.js';
import {EnterRoomMapper} from '../.test-build/logic/EnterRoomMapper.js';
import {GlobalConfigStore} from '../.test-build/data/GlobalConfigStore.js';
import {DiamondModel} from '../.test-build/data/DiamondModel.js';
import {canWatchPlayerCards} from '../.test-build/logic/ViewPlayerCardsConfig.js';
const tick=()=>new Promise(r=>setImmediate(r));
function hand(n=24){return {d:[14,29],u:104,s:{rid:1001,mid:0,unique:'room-one',name:'中文牌桌',hand:n,stime:0,etime:0,straddle:false,
 table:{btn:4,sb:{sn:4,bet:10},bb:{sn:5,bet:20},seatcount:9,ante:0,pl:[{sn:4,c:1000,uid:104,name:'自己',avatar:''},{sn:5,c:1000,uid:105,name:'玩家',avatar:''}]},
 procedure:{ante:{pl:[]},preflop:{pl:[{sn:4,act:'bet',act_amt:100,c:900,pot_out:100,ins:0},{sn:5,act:'call',act_amt:100,c:900,pot_out:200,ins:0}]},flop:{pl:[],card:[2,18,36]},turn:{pl:[],card:[45]},river:{pl:[],card:[57],scard:[]}},
 result:[{sn:4,win:100,ins:0,fee:0,card:[14,29],card_type:2,maxcard_idx:[0,1,2,5,6],maxcard_idx2:[],sp_detail:[]},{sn:5,win:-100,ins:0,fee:0,card:[],card_type:0,maxcard_idx:[],maxcard_idx2:[],sp_detail:[]}]}};}
async function setup(t, combineValue){
 const transport=new FakeTransport(),session=new AbortController(),requests=[],httpCalls=[];
 const host=new MxRoomHost(transport,{runtime:pb,timeoutMs:250,http:{baseUrl:'https://test.invalid/api',fetch:async(url,options)=>{
   httpCalls.push({url:String(url),body:JSON.parse(options.body)});
   const path=new URL(url).pathname;
   const value=path.endsWith('get_round_status')?{records:[{remove:0}]}:path.endsWith('/watch/num')?{pay_times:0}:path.endsWith('user_diamonds_wallet')?{diamonds_wallet:{diamonds:100}}:path.endsWith('/diamond/config')?{data:[]}:path.endsWith('/misc/combine')?combineValue??{}:{};
   return Response.json({code:0,data:value});
 }}});
 t.after(()=>{session.abort();host.destroy();});
 transport.emit('enterTable',{token:'00000000000000000000000000000000'});transport.emit('syncUser',{randomId:104});
 transport.onSend=(action,payload)=>{
   if(action==='ccStorageOp'){queueMicrotask(()=>transport.emit('ccStorageResult',{requestId:payload.requestId,ok:true,value:null}));return;}
   if(action!=='wsSend')return;
   const p=outbound(payload.data);requests.push(p);
   if(p.code===pb.Code.MSG_R_ROOMS){const res=new pb.ServerMessageRooms();res.setRpcId(pb.ClientMessageRooms.deserializeBinary(p.body).getRpcId());res.setRoomsList([record()]);transport.frame(p.code,0,0,res);}
   else if(p.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(p.code,1001,0,snapshot());
   else if(p.code===pb.Code.MSG_D_SYNC_ENTER)transport.frame(p.code,1001,0,snapshot(true));
   else if(p.code===pb.Code.MSG_D_ROOMERS){const res=new pb.ServerMessageRoomers(),player=new pb.PlayerSummary();player.setUserRid(104);player.setName('自己');player.setHandNum(10);player.setPoolCount(3);player.setBringInTotal(10000);player.setWin(123);player.setStoreChips(20);player.setIsOnline(true);res.setPlayersList([player]);res.setTotalPot(555);res.setTotalHand(24);transport.frame(p.code,1001,0,res);}
   else if(p.code===pb.Code.MSG_D_PUBLIC_REPLAY){const request=pb.ClientMessagePublicReplay.deserializeBinary(p.body),res=new pb.ServerMessagePublicReplay();res.setData(new TextEncoder().encode(JSON.stringify(hand(request.getHandNum()))));transport.frame(p.code,1001,0,res);}
 };
 const updates=[];await host.enter({roomID:1001,matchID:0,roomType:0},session.signal,e=>updates.push(e));
 return {host,transport,session,requests,httpCalls,updates,records:host.getRecords()};
}
test('seat player profile uses CC combine API and keeps public info and All-in data read-only',async t=>{
 const c=await setup(t,{user_info_by_rid_resp:[{random_num:105,nick_name:'玩家',remark_name:'朋友'}],user_stats_by_user_rid_resp:[{data:{user_random_id:105,room_data:{total_hand:42,vpip:27},pool_rate:350,allin_data:{active_count:5,active_profit_count:3}}}]});
 const profile=await c.records.playerProfile(105);
 assert.equal(profile.basic.remark_name,'朋友');assert.equal(profile.stats.room_data.total_hand,42);assert.equal(profile.stats.allin_data.active_profit_count,3);
 const calls=c.httpCalls.filter(item=>item.url.endsWith('/misc/combine')&&item.body.api_list?.includes(24));
 const call=calls[0];
 assert.deepEqual(call.body.api_list,[24,25]);assert.ok(call.body.user_stats_by_user_rid_req.user_random_id.includes(105));
 assert.equal(calls.length,1,'opening the cached player must reuse the entry request');
 assert.equal(c.records.peekPlayerProfile(105),profile);
 assert.equal(call.body.user_stats_by_user_rid_req.room_id,1001);
 assert.equal(c.updates.length,0,'opening public information must not redraw the table');
 const player=c.host.roomData.snapshot.playersList.find(p=>p.seatId===5);
 assert.equal(player.userRid,105);
 const mapped=new EnterRoomMapper(pb).map(c.host.roomData,{roomID:1001,matchID:0,roomType:0},0);
 assert.equal(mapped.players.find(p=>p.seat===5).userRid,105);
});
test('player profile operations preserve CC admin, seating and gift gates',async t=>{
 const c=await setup(t),r=c.records,room=c.host.roomData;
 await assert.rejects(r.managePlayer(105,'stand'),/权限/);
 await assert.rejects(r.setPlayerMuted(105,true),/权限/);
 room.record.roomAdmin={isAdmin:true,userStandUp:1,userLeave:0};room.record.clubId=77;
 await r.managePlayer(105,'stand');
 await assert.rejects(r.managePlayer(105,'leave'),/权限/);
 await r.setPlayerMuted(105,true);
 await r.savePlayerRemark(105,'  好友  ');
 assert.deepEqual(c.httpCalls.at(-1).body,{club_id:77,user_id:105,remark_name:'好友',remark_desc:''});
 assert.ok(c.httpCalls.some(x=>x.url.endsWith('/room/user_stand_up')&&x.body.user_random_id===105));
 assert.ok(c.httpCalls.some(x=>x.url.endsWith('/user/mute')&&x.body.mute===true));
 await assert.rejects(r.savePlayerRemark(104,'自己'),/失效/);
 await r.giftDiamonds(105,50);
 assert.deepEqual(c.httpCalls.at(-1).body,{target_user_id:105,send_type:2,amount:50,room_id:1001});
 room.snapshot.myInfo.seatId=0;
 room.snapshot.playersList=room.snapshot.playersList.filter(p=>p.userRid!==104);
 await assert.rejects(r.giftDiamonds(105,50),/不能赠送/);
 room.snapshot.myInfo.seatId=4;
 room.snapshot.playersList.push({userRid:104,seatId:4});
 c.host.globalConfig.setConfig({channel_package_diamond_free_mode:true});
 await assert.rejects(r.giftDiamonds(105,50),/不能赠送/);
});
test('Roomers travels through H5 bridge and updates only room-scoped report events',async t=>{
 const c=await setup(t),other=new ProtocolRoomData();let own=0,foreign=0;
 c.host.roomData.report.on(ReportData.PLAYERS_CHANGE,()=>own++);other.report.on(ReportData.PLAYERS_CHANGE,()=>foreign++);
 await Promise.all([c.records.refreshReport(),c.records.refreshReport()]);
 const sent=c.requests.filter(p=>p.code===pb.Code.MSG_D_ROOMERS);assert.equal(sent.length,1);
 const req=pb.ClientMessageRoomers.deserializeBinary(sent[0].body).toObject();assert.equal(req.history,true);assert.equal(req.historyLimit,1000);
 assert.equal(own,1);assert.equal(foreign,0);assert.equal(c.updates.length,0);
 const p=c.records.data.report.players[0];assert.equal(p.poolRate,300);assert.equal(p.win,123);assert.equal(p.storeChips,20);
 assert.equal(c.records.data.report.summary.totalPot,555);
 const data=c.host.roomData;await c.host.sync();assert.equal(c.host.roomData,data);assert.equal(c.host.getRecords(),c.records);assert.equal(data.report.roomersFetched,false);
});
test('history reads latest completed hand, decodes Chinese, reopens cached data and does not redraw table',async t=>{
 const c=await setup(t),controller=new HistoryController(c.records);t.after(()=>controller.destroy());
 controller.open();await tick();await tick();assert.equal(controller.state.page,24);assert.equal(controller.state.loading,false);assert.equal(controller.state.model.players[0].userName,'自己');
 assert.equal(controller.state.collected,true);assert.equal(c.updates.length,0);
 controller.close();controller.open();await tick();assert.equal(controller.state.model.handNum,24,'cache hits emit even for the same current hand');
 assert.equal(c.requests.filter(p=>p.code===pb.Code.MSG_D_PUBLIC_REPLAY).length,1);
 const storage=c.transport.sent.find(p=>p.action==='ccStorageOp'&&p.payload.op==='put');assert.equal(storage.payload.key,'104_1001_24');
 await controller.go(23);assert.equal(controller.state.model.handNum,23);
 await controller.collect();assert.equal(controller.state.collected,false);assert.ok(c.httpCalls.some(c=>c.url.endsWith('/remove_round')));
 assert.equal(c.records.data.replay.getCached(23).collected,false);
 controller.close();controller.open();await tick();await controller.go(23);assert.equal(controller.state.collected,false);
});
test('PublicReplay ignores wrong hand and safely handles malformed/empty payloads',()=>{
 const data=new ProtocolRoomData(),context=new MessageContext(data,pb);data.replay.pendingHandNum=24;
 PublicReplay({data:Buffer.from(JSON.stringify(hand(23))).toString('base64')},context);assert.equal(data.replay.current,null);assert.equal(data.replay.pendingHandNum,24);
 PublicReplay({data:Buffer.from(JSON.stringify(hand())).toString('base64')},context);assert.equal(data.replay.current.s.hand,24);
 data.replay.pendingHandNum=25;PublicReplay({data:'%%%bad'},context);assert.equal(data.replay.pendingHandNum,-1);assert.equal(data.replay.current,null);
});
test('CC report winner arithmetic includes winning fees, jackpot and insurance exactly once per callback',()=>{
 const data=new ProtocolRoomData();data.snapshot=snapshot().toObject();data.report.applySitDown(104,10000,0,'自己','',4);
 data.report.applyWinnerResult({handNum:25,resultsList:[{seatId:4,win:500,handBet:200,fee:10,jackpotFee:5,insuranceWin:70,insurance:30,ehcsList:[],inPool:true,jawd:0}]},1);
 assert.equal(data.report.players[0].win,325);assert.equal(data.report.players[0].poolRate,1000);assert.equal(data.report.summary.totalPot,500);
 assert.equal(data.report.jackpotRecords[0].contributeTotal,5);
 data.report.applyStandUp(104,10325,'自己','');assert.equal(data.report.players[0].seatId,undefined);assert.equal(data.report.players[0].isOnline,false);
});
test('CC dual-board model allocates fee and hand bets and preserves both max-card index sets',()=>{
 const data=hand();data.s.procedure.river.scard=[58];data.s.result[0].sp_detail=[{is_winner:true,win:150},{is_winner:false,win:0}];data.s.result[0].fee=10;data.s.result[0].maxcard_idx2=[0,1,2,3,5];data.s.result[0].card_type2=3;
 const m=parseHistoryHand(data,104);assert.deepEqual(m.secondPublicCards,[2,18,36,45,58]);assert.deepEqual(m.players[0].winAnte2,[90,-50]);assert.deepEqual(m.players[0].maxCardIndex2,[0,1,2,3,5]);assert.equal(m.players[0].handBet,100);
});
test('CC watch-card permissions use shareTable and room origin, not wallet currency',()=>{
 const g=new GlobalConfigStore(),basic={shareTable:1,originType:3,tribeID:0};
 assert.equal(canWatchPlayerCards(basic,true,g),false);
 g.setConfig({view_player_cards_config:JSON.stringify({audience_scoreboard_club_room:1})});assert.equal(canWatchPlayerCards(basic,true,g),true);assert.equal(canWatchPlayerCards(basic,false,g),false);
 g.setConfig({view_player_cards_config:{audience_tribe_room:2}});assert.equal(canWatchPlayerCards({...basic,shareTable:2},false,g),true);
});
test('CC private UC pricing uses type aliases, capped peek tier, raw SB and active discount',async()=>{
 const g=new GlobalConfigStore();g.setConfig({channel_package_diamond_free_mode:true,private_view_public_cards:{view_type:2,free_count:0}});
 const data=new ProtocolRoomData();data.snapshot=snapshot().toObject();let fetches=0;const d=new DiamondModel(async()=>{fetches++;return [];});
 const now=Math.floor(Date.now()/1000),item={status:1,setting:[{sb:10,price:9,discount:0.5,discount_price:4}],start_time:now-10,end_time:now+100};
 d.setFromH5Sync(30,{52:item});d.setFromH5Sync(31,{0:item});const p=new HistoryPricing(data,g,d);
 assert.equal(await p.getPeekPrice(20),4);assert.equal(await p.getViewPubPrice(3),4);assert.equal(fetches,0);
 item.setting[0].discount=1;assert.equal(await p.getPeekPrice(20),9,'discount_price=0 or 4 must not mean free when discount=1');
});
test('peek/reveal merge only changes the targeted replay and emits new references',()=>{
 const data=new ProtocolRoomData();data.replay.pendingHandNum=24;data.replay.applyReplay(hand());const previous=data.replay.current;let events=0;
 data.replay.on('REPLAY_DATA_CHANGE',()=>events++);data.replay.mergeWatchedHands(24,[{user_rid:105,data:'3,4'}]);
 assert.notEqual(data.replay.current,previous);assert.equal(parseHistoryHand(data.replay.current,104).players[1].handCards[0],3);
 data.replay.mergeViewedPublicCards(24,{pub_cards:'5,6,7'});data.replay.mergeViewedPublicCards(24,{pub_cards:'8'});
 assert.equal(data.replay.current.pub_cards,'5,6,7,8,0');assert.equal(events,3);
 data.clear();assert.equal(data.replay.getCached(24),undefined);assert.equal(data.replay.current,null);
});
