import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, FakeTransport, outbound, record, snapshot } from './helpers/protocol-fixture.mjs';
import { MxRoomHost } from '../.test-build/host/MxRoomHost.js';
import { BuyInController } from '../.test-build/logic/BuyInController.js';
import { SeatPositionMotion } from '../.test-build/table/SeatPositionMotion.js';

test('successful sit-down closes buy-in and keeps the live seat move without an immediate SyncEnter', async t => {
  const transport = new FakeTransport(), signal = new AbortController();
  const host = new MxRoomHost(transport, { runtime: pb, timeoutMs: 200, http: {
    baseURL: 'https://test.invalid/api', fetch: async url => Response.json({ code: 0, data:
      String(url).endsWith('/user/info')
        ? { user: { un_id: 777, nickname: '测试玩家', avatar: '/test-avatar.png' } }
        : { return_table: false, wallet: [{ club_id: 1, club_name: '测试俱乐部', gold: 100000 }] },
    }),
  } });
  t.after(() => { signal.abort(); host.destroy(); });
  const initial = snapshot();
  initial.getMyInfo().setSeatId(0);
  initial.setPlayersList(initial.getPlayersList().filter(p => p.getSeatId() !== 4));
  initial.getRoomInfo().setCurrentMinRate(10);
  initial.getRoomInfo().setCurrentMaxRate(100);
  let syncRequests = 0, seatedReply;
  transport.emit('enterTable', { token: '00000000000000000000000000000000' });
  transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    const packet = outbound(payload.data);
    if (packet.code === pb.Code.MSG_R_ROOMS) {
      const reply = new pb.ServerMessageRooms(), room = record(); room.setGoldType(1);
      reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());
      reply.setRoomsList([room]); transport.frame(packet.code, 0, 0, reply);
    } else if (packet.code === pb.Code.MSG_D_ENTER_ROOM) {
      transport.frame(packet.code, 1001, 0, initial);
    } else if (packet.code === pb.Code.MSG_D_SEATED) {
      const request = pb.ClientMessageSeated.deserializeBinary(packet.body);
      seatedReply = () => {
        const reply = new pb.ServerMessageSeated();
        reply.setRecvSeatId(request.getSeatId()); reply.setChips(request.getBringIn());
        transport.frame(packet.code, 1001, 0, reply);
      };
    } else if (packet.code === pb.Code.MSG_D_SYNC_ENTER) {
      syncRequests++;
      transport.frame(packet.code, 1001, 0, snapshot(true));
    }
  };
  const target = { roomID: 1001, matchID: 0, roomType: 0 };
  const modes = [];
  let previous = await host.enter(target, signal.signal, event => {
    if (event.type !== 'snapshot') return;
    modes.push(SeatPositionMotion.mode(previous, event.snapshot));
    previous = event.snapshot;
  });
  const buyIn = new BuyInController({
    prepare: seat => host.prepareSeat(target, seat, signal.signal),
    submit: selection => host.sitDown(target, selection, signal.signal),
    standup: () => host.standup(target, signal.signal),
  });
  t.after(() => buyIn.destroy());
  await buyIn.open(4); buyIn.next(); buyIn.next();
  const submit = buyIn.submit();
  assert.equal(buyIn.data.state.busy, true);
  assert.equal(previous.mySeat, 0, 'never move seats optimistically');
  seatedReply();
  await submit;
  assert.equal(buyIn.data.state.step, 'closed');
  assert.equal(buyIn.data.state.error, '');
  assert.equal(previous.mySeat, 4);
  assert.equal(syncRequests, 0, 'SyncEnter would cancel the animation before the dialog closes');
  assert.deepEqual(modes, ['seat']);
  assert.equal(host.roomData.snapshot.myInfo.totalChips, 200);
});

test('positive return-table chips seat directly while zero chips opens buy-in', async t => {
  const submitted=[];
  const quote={id:1,seat:4,roomName:'桌',smallBlind:1000,min:30000,max:30000,step:2000,
    wallets:[{club_id:5,gold:50000,club_name:'俱乐部'}],returnOrNew:1,returnAmount:30000,
    returnClubID:5,canAuto:false,autoReturn:true,security:{ip:false,gps:false,delay:false,media:false}};
  const buyIn=new BuyInController({prepare:async()=>quote,submit:async selection=>{submitted.push(selection);},standup:async()=>false});
  t.after(()=>buyIn.destroy());
  await buyIn.open(4);
  assert.equal(buyIn.data.state.step,'closed');
  assert.deepEqual(submitted,[{quoteID:1,amount:30000,clubID:5,autoAmount:0}]);
  quote.id=2;quote.returnAmount=undefined;quote.returnClubID=undefined;quote.autoReturn=false;
  await buyIn.open(4);
  assert.equal(buyIn.data.state.step,'security');
  assert.equal(submitted.length,1);
});

test('return-to-game keeps the dialog closed while deciding whether bring-in is needed', async t => {
  let resolvePrepare;
  const quote={id:3,seat:0,roomName:'桌',smallBlind:1000,min:30000,max:30000,step:2000,
    wallets:[{club_id:5,gold:50000,club_name:'俱乐部'}],returnOrNew:1,returnAmount:30000,
    returnClubID:5,canAuto:false,autoReturn:true,security:{ip:false,gps:false,delay:false,media:false}};
  const buyIn=new BuyInController({prepare:()=>new Promise(resolve=>{resolvePrepare=resolve;}),submit:async()=>{},standup:async()=>false});
  t.after(()=>buyIn.destroy());
  const opening=buyIn.open(0);
  assert.equal(buyIn.data.state.step,'closed','no loading prompt before the return decision');
  resolvePrepare(quote);
  await opening;
  assert.equal(buyIn.data.state.step,'closed','auto return never opens the buy-in dialog');
  quote.mode='add';quote.autoReturn=false;quote.returnAmount=undefined;quote.returnClubID=undefined;
  const next=buyIn.open(0);
  assert.equal(buyIn.data.state.step,'closed','zero-chip bring-in also waits for actual quote');
  resolvePrepare(quote);
  await next;
  assert.equal(buyIn.data.state.step,'amount','show the real bring-in dialog when CC needs one');
});

test('CC return_table with positive chips sends Seated immediately without opening buy-in', async t => {
  const transport=new FakeTransport(),signal=new AbortController();
  const host=new MxRoomHost(transport,{runtime:pb,timeoutMs:200,http:{baseURL:'https://test.invalid/api',fetch:async url=>Response.json({code:0,data:
    String(url).endsWith('/user/info')?{user:{un_id:777,nickname:'测试玩家'}}:
    {return_table:true,last_bring_out:{to_wallet:500,fee:0,club_id:1},wallet:[{club_id:1,club_name:'俱乐部',gold:10000}]}})}});
  t.after(()=>{signal.abort();host.destroy()});
  const initial=snapshot();initial.getMyInfo().setSeatId(0);
  initial.setPlayersList(initial.getPlayersList().filter(p=>p.getSeatId()!==4));
  initial.getRoomInfo().setCurrentMinRate(10);initial.getRoomInfo().setCurrentMaxRate(100);
  transport.emit('enterTable',{token:'00000000000000000000000000000000'});
  let seated;
  transport.onSend=(action,payload)=>{
    if(action!=='wsSend')return;const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms(),room=record();room.setGoldType(1);reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
    else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,initial);
    else if(packet.code===pb.Code.MSG_D_SEATED){seated=pb.ClientMessageSeated.deserializeBinary(packet.body).toObject();const reply=new pb.ServerMessageSeated();reply.setRecvSeatId(4);reply.setChips(seated.bringIn);transport.frame(packet.code,1001,0,reply);}
  };
  const target={roomID:1001,matchID:0,roomType:0};await host.enter(target,signal.signal,()=>{});
  const buyIn=new BuyInController({prepare:seat=>host.prepareSeat(target,seat,signal.signal),submit:value=>host.sitDown(target,value,signal.signal),standup:()=>host.standup(target,signal.signal)});
  t.after(()=>buyIn.destroy());
  await buyIn.open(4);
  assert.equal(buyIn.data.state.step,'closed');
  assert.equal(seated.bringIn,500);assert.equal(seated.returnOrNew,1);assert.equal(seated.clubId,1);
});

test('score tables allow wallet-free buy-in, positive-chip return and zero-chip repurchase',async t=>{
 for(const returned of [undefined,500,0]){
  const transport=new FakeTransport(),signal=new AbortController();let seated;
  const host=new MxRoomHost(transport,{runtime:pb,timeoutMs:200,http:{baseURL:'https://test.invalid/api',fetch:async url=>Response.json({code:0,data:String(url).endsWith('/user/info')?{user:{un_id:777,nickname:'测试玩家'}}:{return_table:returned!==undefined,last_bring_out:returned===undefined?null:{to_wallet:returned,fee:0,club_id:0},wallet:[]}})}});
  try{
   const initial=snapshot();initial.getMyInfo().setSeatId(0);initial.setPlayersList(initial.getPlayersList().filter(p=>p.getSeatId()!==4));initial.getRoomInfo().setCurrentMinRate(10);initial.getRoomInfo().setCurrentMaxRate(100);
   transport.emit('enterTable',{token:'00000000000000000000000000000000'});
   transport.onSend=(action,payload)=>{if(action!=='wsSend')return;const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms(),room=record();room.setGoldType(3);room.setClubId(0);reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
    else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,initial);
    else if(packet.code===pb.Code.MSG_D_SEATED){seated=pb.ClientMessageSeated.deserializeBinary(packet.body).toObject();const reply=new pb.ServerMessageSeated();reply.setRecvSeatId(4);reply.setChips(seated.bringIn);transport.frame(packet.code,1001,0,reply);}
   };
   const target={roomID:1001,matchID:0,roomType:0};await host.enter(target,signal.signal,()=>{});
   const controller=new BuyInController({prepare:seat=>host.prepareSeat(target,seat,signal.signal),submit:selection=>host.sitDown(target,selection,signal.signal),standup:async()=>false});
   await controller.open(4);
   if(returned===500){assert.equal(controller.data.state.step,'closed');assert.equal(seated.bringIn,500);}
   else{assert.equal(controller.data.state.step,'amount');assert.equal(controller.data.state.quote.canAuto,false);assert.equal(controller.data.state.quote.funding,'score');await controller.submit();}
   assert.equal(seated.clubId,0);assert.equal(seated.autoUseWallet,false);assert.equal(seated.returnOrNew,returned===undefined?0:1);controller.destroy();
  }finally{signal.abort();host.destroy();}
 }
});
test('normal alliance entry keeps server wallets; channel entry remains restricted',async t=>{
 const transport=new FakeTransport(),signal=new AbortController();
 const host=new MxRoomHost(transport,{runtime:pb,timeoutMs:200,http:{baseURL:'https://test.invalid/api',fetch:async url=>Response.json({code:0,data:String(url).endsWith('/user/info')?{user:{un_id:777}}:{return_table:true,last_bring_out:{to_wallet:500,fee:0,club_id:2},wallet:[{club_id:2,club_name:'成员俱乐部',gold:100000}]}})}});
 t.after(()=>{signal.abort();host.destroy();});
 const initial=snapshot();initial.getMyInfo().setSeatId(0);initial.setPlayersList(initial.getPlayersList().filter(p=>p.getSeatId()!==4));initial.getRoomInfo().setCurrentMinRate(10);initial.getRoomInfo().setCurrentMaxRate(100);
 transport.emit('enterTable',{token:'00000000000000000000000000000000'});
 transport.onSend=(action,payload)=>{if(action!=='wsSend')return;const packet=outbound(payload.data);
 if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms(),room=record();room.setGoldType(1);reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
 else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,initial);
 };
 const target={roomID:1001,matchID:0,roomType:0,clubID:1};await host.enter(target,signal.signal,()=>{});
 const quote=await host.prepareSeat(target,4,signal.signal);assert.deepEqual(quote.wallets.map(w=>w.club_id),[2]);assert.equal(quote.returnClubID,2);
 host.globalConfig.setConfig({channel_package_diamond_free_mode:true});
 await assert.rejects(host.prepareSeat(target,4,signal.signal),/未找到可用的支付钱包/);
});

test('diamond tables allow wallet-free buy-in, positive-chip return and zero-chip repurchase',async t=>{
 for(const [returned,balance] of [[undefined,10000],[500,0],[0,10000],[undefined,0]]){
  const transport=new FakeTransport(),signal=new AbortController();let seated;
  const host=new MxRoomHost(transport,{runtime:pb,timeoutMs:200,http:{baseURL:'https://test.invalid/api',fetch:async url=>Response.json({code:0,data:String(url).endsWith('/user/info')?{user:{un_id:777,nickname:'测试玩家'}}:String(url).endsWith('/user/user_diamonds_wallet')?{diamonds_wallet:{diamonds:balance}}:{return_table:returned!==undefined,last_bring_out:returned===undefined?null:{to_wallet:returned,fee:0,club_id:0},wallet:[]}})}});
  try{
   const initial=snapshot();initial.getMyInfo().setSeatId(0);initial.setPlayersList(initial.getPlayersList().filter(p=>p.getSeatId()!==4));initial.getRoomInfo().setCurrentMinRate(10);initial.getRoomInfo().setCurrentMaxRate(100);
   transport.emit('enterTable',{token:'00000000000000000000000000000000'});
   transport.onSend=(action,payload)=>{if(action!=='wsSend')return;const packet=outbound(payload.data);
    if(packet.code===pb.Code.MSG_R_ROOMS){const reply=new pb.ServerMessageRooms(),room=record();room.setGoldType(4);room.setClubId(0);reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());reply.setRoomsList([room]);transport.frame(packet.code,0,0,reply);}
    else if(packet.code===pb.Code.MSG_D_ENTER_ROOM)transport.frame(packet.code,1001,0,initial);
    else if(packet.code===pb.Code.MSG_D_SEATED){seated=pb.ClientMessageSeated.deserializeBinary(packet.body).toObject();const reply=new pb.ServerMessageSeated();reply.setRecvSeatId(4);reply.setChips(seated.bringIn);transport.frame(packet.code,1001,0,reply);}
   };
   const target={roomID:1001,matchID:0,roomType:0};await host.enter(target,signal.signal,()=>{});
   const controller=new BuyInController({prepare:seat=>host.prepareSeat(target,seat,signal.signal),submit:selection=>host.sitDown(target,selection,signal.signal),standup:async()=>false});
   await controller.open(4);
   if(returned===500){assert.equal(controller.data.state.step,'closed');assert.equal(seated.bringIn,500);}
   else{assert.equal(controller.data.state.step,'amount');assert.equal(controller.data.state.quote.canAuto,false);assert.equal(controller.data.state.quote.funding,'diamond');await controller.submit();}
   if(balance===0&&returned===undefined){assert.equal(seated,undefined);assert.ok(controller.data.state.error);controller.destroy();continue;}
   assert.equal(seated.clubId,0);assert.equal(seated.autoUseWallet,false);assert.equal(seated.returnOrNew,returned===undefined?0:1);controller.destroy();
  }finally{signal.abort();host.destroy();}
 }
});
