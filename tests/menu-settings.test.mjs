import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, FakeTransport, outbound, snapshot, record } from './helpers/protocol-fixture.mjs';
import { ProtocolClient } from '../.test-build/net/ProtocolClient.js';
import { BringInRequest } from '../.test-build/net/requests/BringInRequest.js';
import { StoreChipsRequest } from '../.test-build/net/requests/StoreChipsRequest.js';
import { KeepSeatRequest } from '../.test-build/net/requests/KeepSeatRequest.js';
import { SetAutoOnTableRequest } from '../.test-build/net/requests/SetAutoOnTableRequest.js';
import { TexasMessageHandler } from '../.test-build/net/messages/texas/TexasMessageHandler.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';
import { BringOutRules } from '../.test-build/logic/BringOutRules.js';
import { ShortcutBet } from '../.test-build/logic/ShortcutBet.js';
import { TexasGamePersonalSettings } from '../.test-build/data/TexasGamePersonalSettings.js';
const target={roomID:1001,matchID:0,roomType:0};
test('CC shortcut pots keep all configured buttons and clamp low/high/all-in amounts',()=>{
  const settings=new TexasGamePersonalSettings();
  const state={mySeat:4,players:[{seat:4,chips:1000}],pot:450,actions:['call','raise','allin'],betting:{call:50,min:100,max:1000,allIn:1000,step:1}};
  assert.deepEqual(ShortcutBet.calculate(settings.shortCuts,state).map(x=>x.amount),[300,550,650]);
  settings.shortCutMode=2;assert.equal(ShortcutBet.calculate(settings.shortCuts,state).length,5);
  state.betting.min=800;state.betting.max=900;
  assert.ok(ShortcutBet.calculate(settings.shortCuts,state).every(x=>x.amount>=800&&x.amount<=900));
  state.actions=['call','allin'];
  assert.ok(ShortcutBet.calculate(settings.shortCuts,state).every(x=>x.action==='allin'&&x.amount===1000));
  state.actions=['fold'];assert.deepEqual(ShortcutBet.calculate(settings.shortCuts,state),[]);
});
test('CC bring-out retains the minimum stack, handles a partial final step, rejects overspending',()=>{
  const rules=new BringOutRules(10500,10,100);
  assert.equal(rules.min,2000);assert.equal(rules.max,8500);
  assert.equal(rules.amount(0),2000);assert.equal(rules.amount(1),8500);
  assert.equal(rules.valid(8500),true);assert.equal(rules.valid(8501),false);assert.equal(rules.valid(2100),false);
  const near=new BringOutRules(2100,10,100);assert.equal(near.min,100);assert.equal(near.max,100);
  assert.equal(new BringOutRules(1900,10,100).valid(0),false);
});
test('menu actions serialize the original CC fields through wsSend',async t=>{
  const transport=new FakeTransport(),client=new ProtocolClient(transport,()=> 'test',100);t.after(()=>client.destroy());
  const checks=[
    [pb.Code.MSG_D_BRING_IN,pb.ClientMessageBringIn,pb.ServerMessageBringIn,{room:{roomId:1001,matchId:0},bringIn:25000,useWallet:true,applyBringIn:true,depositAdvance:0}],
    [pb.Code.MSG_D_STORE_CHIPS,pb.ClientMessageStoreChips,pb.ServerMessageStoreChips,{room:{roomId:1001,matchId:0},store:2000}],
    [pb.Code.MSG_D_KEEP_SEAT_ACTIVE,pb.ClientMessageKeepSeatActive,pb.ServerMessageKeepSeatActive,{room:{roomId:1001,matchId:0},keep:true,duration:180}],
    [pb.Code.MSG_D_SET_AUTO_ON_TABLE,pb.ClientMessageSetAutoOnTable,pb.ServerMessageSetAutoOnTable,{room:{roomId:1001,matchId:0},autoOnTable:25000,autoUseWallet:true,autoOnTableNoStore:true,autoOnTableFix:25000}],
  ];
  transport.onSend=(action,payload)=>{assert.equal(action,'wsSend');const packet=outbound(payload.data);const [code,Request,Response,expected]=checks.shift();assert.equal(packet.code,code);assert.deepEqual(Request.deserializeBinary(packet.body).toObject(),expected);transport.frame(code,1001,0,new Response());};
  const signal=new AbortController().signal;
  await new BringInRequest(client,pb).execute(target,25000,true,signal);
  await new StoreChipsRequest(client,pb).execute(target,2000,signal);
  await new KeepSeatRequest(client,pb).execute(target,true,180,signal);
  await new SetAutoOnTableRequest(client,pb).execute(target,25000,signal);
  assert.equal(checks.length,0);
});
test('BringIn/StoreChips callbacks update authority, while failed responses leave data intact',()=>{
  const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();
  const router=new TexasMessageHandler(pb),context=new MessageContext(data,pb);
  const bring=new pb.ServerMessageBringIn();bring.setTotalChips(12345);
  assert.equal(router.dispatch({code:pb.Code.MSG_D_BRING_IN,body:bring.serializeBinary()},context),true);
  assert.equal(data.snapshot.myInfo.totalChips,12345);
  const store=new pb.ServerMessageStoreChips();store.setChips(700);
  router.dispatch({code:pb.Code.MSG_D_STORE_CHIPS,body:store.serializeBinary()},context);
  assert.equal(new EnterRoomMapper(pb).map(data,target,1).players.find(p=>p.seat===4).chips,700);
  store.setStatus(20058);store.setChips(0);
  assert.equal(router.dispatch({code:pb.Code.MSG_D_STORE_CHIPS,body:store.serializeBinary()},context),false);
  assert.equal(data.snapshot.playersList.find(p=>p.seatId===4).chip,700);
});
test('personal preferences preserve CC storage keys and notify synchronously',()=>{
  const values=new Map();const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
  try{
    const a=new TexasGamePersonalSettings();let changes=0;a.on(TexasGamePersonalSettings.SHOW_BB,()=>changes++);
    a.setShowBBToStorage(true);a.setDeskTypeToStorage(14);a.setPokerCardTypeToStorage(2);a.setSoundOnToStorage(false);a.shortCutMode=2;a.shortCut5ActionsIndex=[0,1,3,6,9];
    assert.equal(changes,1);assert.equal(values.get('moyu_SHOW_BB'),'true');
    const b=new TexasGamePersonalSettings();assert.equal(b.deskType,14);assert.equal(b.pokerCardType,2);assert.equal(b.soundOn,false);assert.equal(b.shortCutMode,2);assert.deepEqual(b.shortCuts.map(x=>x.name),['1/5','1/4','1/2','1.0','2']);
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
