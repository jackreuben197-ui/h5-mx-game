import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, FakeTransport, outbound, record, snapshot } from './helpers/protocol-fixture.mjs';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
import { TexasMessageHandler } from '../.test-build/net/messages/texas/TexasMessageHandler.js';
import { BettingMapper } from '../.test-build/logic/BettingMapper.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';
import { ProtocolClient } from '../.test-build/net/ProtocolClient.js';
import { AddTimeRequest } from '../.test-build/net/requests/AddTimeRequest.js';
import { AgreePostRequest } from '../.test-build/net/requests/AgreePostRequest.js';
import { ShowdownRequest } from '../.test-build/net/requests/ShowdownRequest.js';
import { SettlementWatchRequest } from '../.test-build/net/requests/SettlementWatchRequest.js';
import { validAutoRight,resolveAutoChoice } from '../.test-build/logic/AutoOperation.js';
import { MxRoomHost } from '../.test-build/host/MxRoomHost.js';
import { HostSessionData } from '../.test-build/data/HostSessionData.js';

const target={roomID:1001,matchID:0,roomType:0};
function roomData(){const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();return data;}
function dispatch(data,code,body){
  return new TexasMessageHandler(pb).dispatch({code,roomID:1001,matchID:0,body:body.serializeBinary()},new MessageContext(data,pb));
}

test('H5 club room logo and anti-cheat mode drive the table presentation',()=>{
  const session=new HostSessionData();
  session.update('syncUserClub',{response:{data:[{club_id:17,room_logo:' https://example.com/club.png '},{club_id:18,room_logo:''}]}});
  assert.equal(session.roomLogo(17),'https://example.com/club.png');
  assert.equal(session.roomLogo(18),'');
  const data=roomData();data.snapshot.roomInfo.antiCheatType=2;
  assert.equal(new EnterRoomMapper(pb).map(data,target,1).antiCheatType,2);
  session.clear();assert.equal(session.roomLogo(17),'');
});

test('normal turn maps CC straddle and sends the exact server minimum',()=>{
  const data=roomData(),op=new pb.Operator();op.setSeatId(4);op.setOpDeadline(1000);
  const limit=new pb.ActionLimit();limit.setAction(pb.Def.Action.STRADDLE);limit.setMin(200);limit.setMax(200);
  op.setActionsList([limit]);data.snapshot.operatorList=[op.toObject()];
  const mapped=new BettingMapper(pb).map(data);
  assert.deepEqual(mapped.actions,['straddle']);assert.equal(mapped.betting.straddle,200);
  assert.deepEqual(new BettingMapper(pb).resolve(data,'straddle'),{action:pb.Def.Action.STRADDLE,amount:200});
  assert.throws(()=>new BettingMapper(pb).resolve(data,'fold'),/不是该操作时机/);
});

test('CC auto choices follow round bet, stack, and fold-to-check precedence',()=>{
  const player={seat:4,name:'me',chips:100,cards:[14,29],action:'',roundBet:20,roundActioned:false};
  assert.deepEqual(validAutoRight(20,player),{choice:'check',amount:0});
  assert.deepEqual(validAutoRight(50,player),{choice:'call',amount:30});
  assert.deepEqual(validAutoRight(120,player),{choice:'allin',amount:100});
  assert.deepEqual(resolveAutoChoice('fold',{actions:['fold','check']}),{action:'check',amount:undefined});
  assert.deepEqual(resolveAutoChoice('allin',{actions:['allin'],betting:{allIn:100}}),{action:'allin',amount:100});
  assert.equal(resolveAutoChoice('call',{actions:['fold']}),undefined);
});

test('post, trustee, keep seat and add time packets update only authoritative seat fields',()=>{
  const data=roomData(),s=data.snapshot,p=s.playersList.find(v=>v.seatId===4);
  const change=new pb.PostStatusChange();change.setSeatId(4);change.setCurrentPostStatus(pb.Def.CanPlayStatus.NEED_POST);
  const post=new pb.ServerMessagePostStatusChange();post.setChangesList([change]);
  dispatch(data,pb.Code.MSG_S_POST_STATUS_CHANGE,post);
  assert.equal(new EnterRoomMapper(pb).map(data,target,1).players.find(v=>v.seat===4).canPlayStatus,pb.Def.CanPlayStatus.NEED_POST);
  const auto=new pb.ServerMessageAutoOp();auto.setSeatId(4);auto.setEnable(true);
  dispatch(data,pb.Code.MSG_S_AUTO_OP,auto);assert.equal(p.isAutoop,true);
  const keep=new pb.ServerMessageKeepSeat();keep.setSeatId(4);keep.setKeep(true);keep.setDeadline(2000);keep.setLeftTime(100);keep.setKeepSeatReason(pb.Def.KeepSeatReason.KSR_NOCHIP);
  dispatch(data,pb.Code.MSG_S_KEEP_SEAT,keep);
  assert.equal(new EnterRoomMapper(pb).map(data,target,2).menu.keepingSeat,true);
  assert.equal(p.keepSeatReason,pb.Def.KeepSeatReason.KSR_NOCHIP);
  keep.setKeep(false);dispatch(data,pb.Code.MSG_S_KEEP_SEAT,keep);
  assert.equal(p.keepSeatReason,pb.Def.KeepSeatReason.KSR_NONE);
  const op=new pb.Operator();op.setSeatId(4);op.setOpDeadline(Date.now()/1000+15);op.setLeftOpTime(15);s.operatorList=[op.toObject()];
  const add=new pb.ServerMessageAddTime();add.setDuration(10);add.setTimes(1);add.setDeadline(Math.floor(Date.now()/1000)+25);
  assert.equal(dispatch(data,pb.Code.MSG_D_ADD_TIME,add),true);
  assert.equal(s.operatorList[0].delayTimes,1);
  assert.ok(new EnterRoomMapper(pb).map(data,target,3).countdowns[0].totalTime>=25);
});

test('StartInfo clears waiting status only for players dealt into the new hand',()=>{
  const data=roomData(),seat=data.snapshot.playersList.find(v=>v.seatId===4);
  seat.status=pb.Def.CanPlayStatus.NEED_POST;
  const start=new pb.ServerMessageStartInfo(),hand=new pb.HandInfo(),mine=new pb.PlayerStartInfo();
  hand.setHandNum(26);hand.setDealOrderList([4]);mine.setSeatId(4);mine.setChip(1000);
  start.setHandInfo(hand);start.setPlayersList([mine]);
  dispatch(data,pb.Code.MSG_S_START_INFO,start);
  assert.equal(seat.status,pb.Def.CanPlayStatus.NORMAL);
  assert.equal(new EnterRoomMapper(pb).map(data,target,1).players.find(v=>v.seat===4).canPlayStatus,pb.Def.CanPlayStatus.NORMAL);
});

test('add time, agree post and showdown requests preserve CC wire fields',async t=>{
  const transport=new FakeTransport(),client=new ProtocolClient(transport,()=> 'test',200),signal=new AbortController().signal;
  t.after(()=>client.destroy());
  transport.onSend=(action,payload)=>{
    if(action!=='wsSend')return;
    const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_D_ADD_TIME){
      const body=pb.ClientMessageAddTime.deserializeBinary(packet.body);
      assert.equal(body.getConsume(),pb.Def.ConsumeType.CT_DELAY_4);assert.equal(body.getDirectConsume(),false);
      transport.frame(packet.code,1001,0,new pb.ServerMessageAddTime());
    }else if(packet.code===pb.Code.MSG_D_AGREE_POST){
      assert.equal(pb.ClientMessageAgreePost.deserializeBinary(packet.body).getRoom().getRoomId(),1001);
      transport.frame(packet.code,1001,0,new pb.ServerMessageAgreePost());
    }else if(packet.code===pb.Code.MSG_D_SHOWDOWN){
      assert.deepEqual(pb.ClientMessageShowdown.deserializeBinary(packet.body).getShowCardsList(),[1,0]);
      transport.frame(packet.code,1001,0,new pb.ServerMessageShowdown());
    }
  };
  await new AddTimeRequest(client,pb).execute(target,2,signal);
  await new AgreePostRequest(client,pb).execute(target,signal);
  await new ShowdownRequest(client,pb).execute(target,[1,0],signal);
});

test('live settlement watch uses CC 1029/1026/1013 fields and clears on hand clear',async t=>{
  const data=roomData();data.record.viewPlayerCards=1;data.snapshot.handInfo.handNum=26;
  const result=new pb.Result();result.setSeatId(4);result.setMyCardsList([14,29]);
  const winner=new pb.ServerMessageWinner();winner.setHandNum(26);winner.setRound(pb.Def.Round.FLOP);winner.setResultsList([result]);
  assert.equal(dispatch(data,pb.Code.MSG_S_WINNER,winner),true);
  assert.equal(data.watch.peek,true);assert.equal(data.watch.reveal,true);
  data.watch.peekCost=8;data.watch.revealCost=5;
  assert.deepEqual(new EnterRoomMapper(pb).map(data,target,2).watch,{peek:true,reveal:true,peekCost:8,revealCost:5,revealFree:false});
  const transport=new FakeTransport(),client=new ProtocolClient(transport,()=> 'test',200),signal=new AbortController().signal;
  t.after(()=>client.destroy());
  transport.onSend=(action,payload)=>{
    if(action!=='wsSend')return;
    const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_D_VIEW_PLAYER_CARDS_NUM){
      assert.equal(pb.ClientMessageViewPlayerCardsNum.deserializeBinary(packet.body).getRoom().getRoomId(),1001);
      const reply=new pb.ServerMessageViewPlayerCardsNum();reply.setPayTimes(2);transport.frame(packet.code,1001,0,reply);
    }else if(packet.code===pb.Code.MSG_D_VIEW_PLAYER_CARDS){
      const request=pb.ClientMessageViewPlayerCards.deserializeBinary(packet.body);
      assert.equal(request.getTargetSeatId(),0);assert.equal(request.getTargetUserRid(),0);
      transport.frame(packet.code,1001,0,new pb.ServerMessageViewPlayerCards());
    }else if(packet.code===pb.Code.MSG_D_SHOW_PUBLIC_CARDS){
      const request=pb.ClientMessageShowPublicCards.deserializeBinary(packet.body);
      assert.equal(request.getRound(),pb.Def.Round.FLOP);assert.equal(request.getConsume(),pb.Def.ConsumeType.CT_VC_2);
      const reply=new pb.ServerMessageShowPublicCards();reply.setPublicCardsList([20]);transport.frame(packet.code,1001,0,reply);
    }
  };
  const watch=new SettlementWatchRequest(client,pb);
  assert.equal(await watch.peekTimes(target,signal),2);
  await watch.peek(target,signal);
  const shown=new pb.ServerMessageShowcards(),departed=new pb.PlayerCards(),opponent=new pb.PlayerCards(),folded=new pb.PlayerCards(),mine=new pb.PlayerCards();
  departed.setSeatId(6);departed.setCardsList([9,24]);
  opponent.setSeatId(1);opponent.setCardsList([15,28]);
  folded.setSeatId(2);folded.setCardsList([16,29]);
  mine.setSeatId(4);mine.setCardsList([17,30]);
  shown.setPlayerCardsList([departed,opponent,folded,mine]);
  dispatch(data,pb.Code.MSG_S_SHOWCARDS,shown);
  const revealed=new EnterRoomMapper(pb).map(data,target,3);
  assert.deepEqual(revealed.players.find(v=>v.seat===1).cards,[15,28]);
  assert.deepEqual(revealed.players.find(v=>v.seat===2).cards,[16,29],'folded opponent also receives purchased cards');
  assert.deepEqual(revealed.players.find(v=>v.seat===4).cards,[14,29],'CC skips own cards when isAll is false');
  assert.deepEqual((await watch.reveal(target,pb.Def.Round.FLOP,signal)).publicCardsList,[20]);
  dispatch(data,pb.Code.MSG_S_HAND_CLEAR,new pb.ServerMessageHandClear());
  assert.equal(new EnterRoomMapper(pb).map(data,target,3).watch,undefined);
});

test('Winner quotes live watch actions and reveal merges server cards into the same hand',async t=>{
  const transport=new FakeTransport(),host=new MxRoomHost(transport,{runtime:pb,timeoutMs:200}),abort=new AbortController(),updates=[];
  t.after(()=>{abort.abort();host.destroy();});
  const room=record(),entry=snapshot();room.setViewPlayerCards(1);
  host.diamonds.setFromH5Sync(30,{12:{status:1,setting:[{sb:10,price:8}],start_time:0,end_time:0}});
  host.diamonds.setFromH5Sync(8,{2000:{status:1,setting:[{sb:10,price:5}],start_time:0,end_time:0},3000:{status:1,setting:[{sb:10,price:6}],start_time:0,end_time:0}});
  transport.emit('enterTable',{token:'00000000000000000000000000000000'});
  transport.onSend=(action,payload)=>{
    if(action!=='wsSend')return;
    const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms();reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
    else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,entry);
    else if(packet.code===pb.Code.MSG_D_VIEW_PLAYER_CARDS_NUM){const reply=new pb.ServerMessageViewPlayerCardsNum();reply.setPayTimes(0);transport.frame(packet.code,1001,0,reply);}
    else if(packet.code===pb.Code.MSG_D_VIEW_PLAYER_CARDS){
      transport.frame(packet.code,1001,0,new pb.ServerMessageViewPlayerCards());
      const shown=new pb.ServerMessageShowcards();
      shown.setPlayerCardsList([[6,9,24],[1,15,28],[2,16,29]].map(([seat,a,b])=>{const cards=new pb.PlayerCards();cards.setSeatId(seat);cards.setCardsList([a,b]);return cards;}));
      transport.frame(pb.Code.MSG_S_SHOWCARDS,1001,0,shown);
    }
    else if(packet.code===pb.Code.MSG_D_SHOW_PUBLIC_CARDS){const reply=new pb.ServerMessageShowPublicCards();reply.setRound(pb.Def.Round.TURN);reply.setPublicCardsList([42]);transport.frame(packet.code,1001,0,reply);}
  };
  await host.enter(target,abort.signal,update=>updates.push(update));
  const winner=new pb.ServerMessageWinner(),result=new pb.Result();winner.setHandNum(25);winner.setRound(pb.Def.Round.FLOP);result.setSeatId(4);winner.setResultsList([result]);
  transport.frame(pb.Code.MSG_S_WINNER,1001,0,winner);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual({peek:updates.at(-1).snapshot.watch.peek,reveal:updates.at(-1).snapshot.watch.reveal,peekCost:updates.at(-1).snapshot.watch.peekCost,revealCost:updates.at(-1).snapshot.watch.revealCost},{peek:true,reveal:true,peekCost:8,revealCost:5});
  await host.watchSettlement(target,'reveal',abort.signal);
  assert.deepEqual(updates.at(-1).snapshot.community,[2,18,36,42]);
  await new Promise(resolve=>setTimeout(resolve,20));
  await host.watchSettlement(target,'peek',abort.signal);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(updates.at(-1).snapshot.players.find(v=>v.seat===1).cards,[15,28]);
  assert.deepEqual(updates.at(-1).snapshot.players.find(v=>v.seat===2).cards,[16,29]);
  assert.equal(updates.at(-1).snapshot.watch.reveal,true);
});

test('paid peek reveals opponents via CC ShowViewCards 1127 without 1101',async t=>{
  const transport=new FakeTransport(),host=new MxRoomHost(transport,{runtime:pb,timeoutMs:250}),abort=new AbortController(),updates=[];
  t.after(()=>{abort.abort();host.destroy();});
  const room=record(),entry=snapshot();room.setViewPlayerCards(1);
  host.diamonds.setFromH5Sync(30,{12:{status:1,setting:[{sb:10,price:8}],start_time:0,end_time:0}});
  transport.emit('enterTable',{token:'00000000000000000000000000000000'});
  transport.onSend=(action,payload)=>{
    if(action==='ccStorageOp'){queueMicrotask(()=>transport.emit('ccStorageResult',{requestId:payload.requestId,ok:true,value:null}));return;}
    if(action!=='wsSend')return;
    const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms();reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
    else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,entry);
    else if(packet.code===pb.Code.MSG_D_VIEW_PLAYER_CARDS_NUM)transport.frame(packet.code,1001,0,new pb.ServerMessageViewPlayerCardsNum());
    else if(packet.code===pb.Code.MSG_D_VIEW_PLAYER_CARDS){
      transport.frame(packet.code,1001,0,new pb.ServerMessageViewPlayerCards());
      const reply=new pb.ServerMessageShowViewCards();
      reply.setPlayerCardsList([[1,15,28],[2,16,29],[6,9,24],[0,5,6]].map(([seat,a,b])=>{const card=new pb.PlayerCards();card.setSeatId(seat);card.setCardsList([a,b]);return card;}));
      transport.frame(pb.Code.MSG_S_SHOW_VIEW_CARDS,1001,0,reply);
    }
  };
  await host.enter(target,abort.signal,update=>updates.push(update));
  const winner=new pb.ServerMessageWinner(),result=new pb.Result();winner.setHandNum(25);result.setSeatId(4);winner.setResultsList([result]);
  transport.frame(pb.Code.MSG_S_WINNER,1001,0,winner);
  await new Promise(resolve=>setTimeout(resolve,20));
  await host.watchSettlement(target,'peek',abort.signal);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(updates.at(-1).snapshot.players.find(v=>v.seat===1).cards,[15,28]);
  assert.deepEqual(updates.at(-1).snapshot.players.find(v=>v.seat===2).cards,[16,29]);
});

test('one normal hand sends own actions and handles deal, board, winner, clear',async t=>{
  const transport=new FakeTransport(),host=new MxRoomHost(transport,{runtime:pb,timeoutMs:200});
  const abort=new AbortController(),updates=[];
  t.after(()=>{abort.abort();host.destroy();});
  transport.emit('enterTable',{token:'00000000000000000000000000000000'});
  transport.onSend=(action,payload)=>{
    if(action!=='wsSend')return;
    const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){
      const reply=new pb.ServerMessageRooms();reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([record()]);
      transport.frame(packet.code,0,0,reply);
    }else if(packet.code===pb.Code.MSG_D_ENTER_ROOM){transport.frame(packet.code,1001,0,snapshot());}
    else if(packet.code===pb.Code.MSG_D_ACTION){transport.frame(packet.code,1001,0,new pb.ServerMessageAction());}
  };
  await host.enter(target,abort.signal,update=>updates.push(update));
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  const makeOperator=(kind,min=0)=>{
    const op=new pb.Operator(),limit=new pb.ActionLimit();op.setSeatId(4);op.setOpDeadline(Math.floor(Date.now()/1000)+20);op.setLeftOpTime(20);
    limit.setAction(kind);limit.setMin(min);limit.setMax(min);op.setActionsList([limit]);return op;
  };
  const start=new pb.ServerMessageStartInfo(),hand=new pb.HandInfo(),mine=new pb.PlayerStartInfo();
  hand.setHandNum(26);hand.setDealOrderList([4]);mine.setSeatId(4);mine.setChip(1000);mine.setCardsList([14,29]);
  start.setHandInfo(hand);start.setPlayersList([mine]);start.setNextOperator(makeOperator(pb.Def.Action.CHECK));
  transport.frame(pb.Code.MSG_S_START_INFO,1001,0,start);await tick();
  assert.deepEqual(updates.at(-1).snapshot.actions,['check']);
  await host.command(target,'check',abort.signal);
  const first=new pb.ServerMessageActionAll();first.setOperatorSeatId(4);first.setAction(pb.Def.Action.CHECK);first.setLeftChips(1000);first.setRoundBet(0);
  transport.frame(pb.Code.MSG_S_ACTION_ALL,1001,0,first);await tick();
  const flop=new pb.ServerMessagePublicCards();flop.setRnd(pb.Def.Round.FLOP);flop.setPublicCardsArrayList([2,18,36]);flop.setNextOperator(makeOperator(pb.Def.Action.CALL,100));
  transport.frame(pb.Code.MSG_S_PUBLIC_CARDS,1001,0,flop);await tick();
  assert.deepEqual(updates.at(-1).snapshot.community,[2,18,36]);
  await host.command(target,'call',abort.signal);
  const second=new pb.ServerMessageActionAll();second.setOperatorSeatId(4);second.setAction(pb.Def.Action.CALL);second.setAmount(100);second.setLeftChips(900);second.setAllBet(100);second.setRoundBet(100);
  transport.frame(pb.Code.MSG_S_ACTION_ALL,1001,0,second);await tick();
  const winner=new pb.ServerMessageWinner(),result=new pb.Result();winner.setHandNum(26);result.setSeatId(4);result.setChip(1100);result.setMyCardsList([14,29]);winner.setResultsList([result]);
  transport.frame(pb.Code.MSG_S_WINNER,1001,0,winner);await tick();
  assert.equal(updates.at(-1).snapshot.handEnded,true);
  transport.frame(pb.Code.MSG_S_HAND_CLEAR,1001,0,new pb.ServerMessageHandClear());await tick();
  assert.deepEqual(updates.at(-1).snapshot.community,[]);
  const sent=transport.sent.filter(v=>v.action==='wsSend').map(v=>outbound(v.payload.data).code);
  assert.equal(sent.filter(code=>code===pb.Code.MSG_D_ACTION).length,2);
});

test('NEED_POST sends one CC fire-and-forget agree request per status transition',async t=>{
  const transport=new FakeTransport(),host=new MxRoomHost(transport,{runtime:pb,timeoutMs:100});
  const abort=new AbortController(),initial=snapshot();
  initial.getPlayersList().find(p=>p.getSeatId()===4).setStatus(pb.Def.CanPlayStatus.NEED_POST);
  t.after(()=>{abort.abort();host.destroy();});
  transport.emit('enterTable',{token:'00000000000000000000000000000000'});
  transport.onSend=(action,payload)=>{
    if(action!=='wsSend')return;
    const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){
      const reply=new pb.ServerMessageRooms();reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([record()]);
      transport.frame(packet.code,0,0,reply);
    }else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,initial);
  };
  await host.enter(target,abort.signal,()=>{});
  const count=()=>transport.sent.filter(v=>v.action==='wsSend'&&outbound(v.payload.data).code===pb.Code.MSG_D_AGREE_POST).length;
  assert.equal(count(),1);
  const post=new pb.ServerMessagePostStatusChange(),change=new pb.PostStatusChange();
  change.setSeatId(4);change.setCurrentPostStatus(pb.Def.CanPlayStatus.NEED_POST);post.setChangesList([change]);
  transport.frame(pb.Code.MSG_S_POST_STATUS_CHANGE,1001,0,post);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(count(),1,'unrelated same-status packets must not repeat AgreePost');
  change.setCurrentPostStatus(pb.Def.CanPlayStatus.AGREE_POST);post.setChangesList([change]);
  transport.frame(pb.Code.MSG_S_POST_STATUS_CHANGE,1001,0,post);
  await new Promise(resolve=>setImmediate(resolve));
  change.setCurrentPostStatus(pb.Def.CanPlayStatus.NEED_POST);post.setChangesList([change]);
  transport.frame(pb.Code.MSG_S_POST_STATUS_CHANGE,1001,0,post);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(count(),2,'a new NEED_POST transition sends again');
});


test('folded player can select and deselect end-of-hand show cards without revealing early',async t=>{
 const transport=new FakeTransport(),host=new MxRoomHost(transport,{runtime:pb,timeoutMs:250}),abort=new AbortController(),updates=[],choices=[];
 t.after(()=>{abort.abort();host.destroy();});
 const room=record(),entry=snapshot(),mine=entry.getPlayersList().find(p=>p.getSeatId()===4);
 mine.setStatus(pb.Def.CanPlayStatus.NORMAL);mine.setAction(pb.Def.Action.FOLD);
 transport.emit('enterTable',{token:'00000000000000000000000000000000'});
 transport.onSend=(action,payload)=>{
  if(action==='ccStorageOp'){queueMicrotask(()=>transport.emit('ccStorageResult',{requestId:payload.requestId,ok:true,value:null}));return;}
  if(action!=='wsSend')return;
  const packet=outbound(payload.data);
  if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms();reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
  else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,entry);
  else if(packet.code===pb.Code.MSG_D_SHOWDOWN){choices.push(pb.ClientMessageShowdown.deserializeBinary(packet.body).getShowCardsList());transport.frame(packet.code,1001,0,new pb.ServerMessageShowdown());}
 };
 await host.enter(target,abort.signal,u=>updates.push(u));
 await host.showdown(target,0,abort.signal);assert.deepEqual(choices.at(-1),[1,0]);
 assert.deepEqual(updates.at(-1).snapshot.players.find(p=>p.seat===4).showCardsSelection,[1,0]);
 await host.showdown(target,1,abort.signal);assert.deepEqual(choices.at(-1),[1,1]);
 await host.showdown(target,0,abort.signal);assert.deepEqual(choices.at(-1),[0,1]);
 await assert.rejects(host.showdown(target,-1,abort.signal));
 transport.frame(pb.Code.MSG_S_HAND_CLEAR,1001,0,new pb.ServerMessageHandClear());
 await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(host.showdown(target,0,abort.signal));
 assert.deepEqual(updates.at(-1).snapshot.players.find(p=>p.seat===4).showCardsSelection,[]);
});
