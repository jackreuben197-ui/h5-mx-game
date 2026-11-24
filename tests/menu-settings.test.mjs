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
test('original keeps fixed sizes but shares card faces and the chosen quick-bet mode',()=>{
  const settings=new TexasGamePersonalSettings('layout-test');
  settings.updateAppearance({layout:'classic',cardBack:'gold',publicCardSize:110,tableTextSize:90,betButtonSize:105});
  settings.setPokerCardTypeToStorage(2);
  settings.setSliderSubmit('release');
  settings.shortCutMode=2;
  settings.setCustomPotRatio(1,79);
  settings.updateAppearance({layout:'original'});
  assert.equal(settings.supportsLayoutCustomization,false);
  assert.equal(settings.tableCardType,2);
  assert.equal(settings.tableSliderSubmit,'confirm');
  assert.equal(settings.tableShortcuts.length,5);
  assert.equal(settings.tableShortcuts[1].name,'79%');
  assert.deepEqual([settings.tableAppearance.cardBack,settings.tableAppearance.publicCardSize,settings.tableAppearance.tableTextSize,settings.tableAppearance.betButtonSize],['original',100,100,100]);
  for(const layout of ['classic','balanced','oval']){
    settings.updateAppearance({layout});
    assert.equal(settings.supportsLayoutCustomization,true);
    assert.equal(settings.tableCardType,2);
    assert.equal(settings.tableSliderSubmit,'release');
    assert.equal(settings.tableShortcuts.length,5);
    assert.equal(settings.tableShortcuts[1].name,'79%');
    assert.deepEqual([settings.tableAppearance.cardBack,settings.tableAppearance.publicCardSize,settings.tableAppearance.tableTextSize,settings.tableAppearance.betButtonSize],['gold',110,90,105]);
  }
});
test('numbered desks work in every layout and original preserves the modern felt choice',()=>{
  const settings=new TexasGamePersonalSettings('desk-style-test');
  settings.setDeskTypeToStorage(10);
  for(const layout of ['classic','balanced','oval']){
    settings.updateAppearance({layout,style:'legacy'});
    assert.equal(settings.tableAppearance.style,'legacy');
    assert.equal(settings.deskType,10);
    settings.updateAppearance({style:'solid',feltColor:'#3296d2'});
    assert.equal(settings.tableAppearance.style,'solid');
    settings.updateAppearance({layout:'original'});
    assert.equal(settings.tableAppearance.style,'legacy');
    settings.updateAppearance({layout});
    assert.equal(settings.tableAppearance.style,'solid');
    assert.equal(settings.tableAppearance.feltColor,'#3296d2');
  }
});
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

test('quick-bet count defaults to three and restores the saved account configuration',()=>{
  const values=new Map();const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
  try{
    const settings=new TexasGamePersonalSettings('quick-count');settings.setAccount(101);
    assert.equal(settings.shortCutMode,1);assert.equal(settings.tableShortcuts.length,3);
    settings.shortCutMode=2;
    const reloaded=new TexasGamePersonalSettings('quick-count');reloaded.setAccount(101);
    assert.equal(reloaded.shortCutMode,2);assert.equal(reloaded.tableShortcuts.length,5);
    reloaded.setAccount(102);
    assert.equal(reloaded.shortCutMode,1);assert.equal(reloaded.tableShortcuts.length,3);
    reloaded.setAccount(101);
    assert.equal(reloaded.shortCutMode,2);assert.equal(reloaded.tableShortcuts.length,5);
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

test('updating inactive quick-bet presets keeps the configured button count and ratios',()=>{
  const settings=new TexasGamePersonalSettings('quick-presets');
  settings.setCustomPotRatio(0,79);
  settings.shortCut5ActionsIndex=[0,1,3,6,9];
  assert.equal(settings.tableShortcuts.length,3);
  assert.deepEqual(settings.tableShortcuts.map(cut=>cut.name),['79%','1.0','1.2']);
  settings.shortCutMode=2;
  settings.setCustomPotRatio(1,60);
  settings.shortCut3ActionsIndex=[0,1,2];
  assert.equal(settings.tableShortcuts.length,5);
  assert.deepEqual(settings.tableShortcuts.map(cut=>cut.name),['1/5','60%','1/2','1.0','2']);
  settings.shortCutMode=1;
  assert.deepEqual(settings.tableShortcuts.map(cut=>cut.name),['79%','1/4','1/3']);
});

test('quick bet reset preserves table appearance and original ratio presets',()=>{
  const preferences=new TexasGamePersonalSettings();
  preferences.setDeskTypeToStorage(4);
  preferences.setPokerCardTypeToStorage(2);
  preferences.setSliderSubmit('release');
  preferences.shortCutMode=2;
  preferences.shortCut3ActionsIndex=[0,1,2];
  preferences.resetQuickSettings();
  assert.equal(preferences.sliderSubmit,'confirm');
  assert.equal(preferences.shortCutMode,1);
  assert.deepEqual(preferences.shortCut3ActionsIndex,[3,6,7]);
  assert.deepEqual(preferences.shortCut5ActionsIndex,[2,3,4,6,7]);
  assert.equal(preferences.deskType,4);
  assert.equal(preferences.pokerCardType,2);
  assert.equal(preferences.getAllShortCuts().at(-1).percent,2);
});

test('account and brand preferences are isolated, migrated once and restored after reload',()=>{
  const values=new Map([['moyu_SHOW_BB','true'],['moyu_TEXAS_DESKTYPE','7']]);
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
  try {
    const a=new TexasGamePersonalSettings('mx');
    a.setAccount(101);assert.equal(a.showBB,true);assert.equal(a.deskType,7);
    a.updateAppearance({layout:'classic',cardBack:'blue',publicCardSize:110});a.setSliderSubmit('release');
    a.setAccount(102);assert.equal(a.showBB,false);assert.equal(a.appearance.layout,'balanced');assert.equal(a.sliderSubmit,'confirm');
    a.updateAppearance({layout:'oval',tableTextSize:90});
    a.setAccount(101);assert.equal(a.appearance.layout,'classic');assert.equal(a.appearance.publicCardSize,110);assert.equal(a.sliderSubmit,'release');
    const reloaded=new TexasGamePersonalSettings('mx');reloaded.setAccount(102);assert.equal(reloaded.appearance.layout,'oval');
    const brand=new TexasGamePersonalSettings('midnight','#34383f');brand.setAccount(101);
    assert.equal(brand.appearance.layout,'balanced');assert.equal(brand.appearance.feltColor,'#34383f');assert.equal(brand.showBB,false);
    a.setAccount(0);assert.equal(a.appearance.layout,'balanced');assert.equal(a.sliderSubmit,'confirm');
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});

test('appearance rejects corrupt choices and duplicate changes do not notify',()=>{
  const settings=new TexasGamePersonalSettings('mx');let changes=0;
  settings.on(TexasGamePersonalSettings.APPEARANCE_CHANGE,()=>changes++);
  settings.updateAppearance({layout:'classic',publicCardSize:110,tableTextSize:90,betButtonSize:105});
  settings.updateAppearance({layout:'classic',publicCardSize:110});assert.equal(changes,1);
  settings.updateAppearance({layout:'broken',publicCardSize:NaN,tableTextSize:200,betButtonSize:0,feltColor:'url(secret)',cardBack:'missing'});
  assert.deepEqual(settings.appearance,{layout:'balanced',style:'solid',feltColor:'#079d80',cardBack:'original',publicCardSize:100,tableTextSize:100,betButtonSize:100});
});


test('custom percentage pots retain CC amount rules and isolate modes/accounts across reload',()=>{
  const values=new Map();const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
  try {
    const a=new TexasGamePersonalSettings('mx');a.setAccount(101);
    a.setCustomPotRatio(0,79);assert.deepEqual(a.shortCuts[0],{name:'79%',percent:0.79});
    const state={mySeat:4,players:[{seat:4,chips:1000}],pot:450,actions:['call','raise','allin'],betting:{call:50,min:100,max:1000,allIn:1000,step:1}};
    assert.equal(ShortcutBet.calculate(a.shortCuts,state)[0].amount,445);
    a.setCustomPotRatio(0,9);a.setCustomPotRatio(0,101);a.setCustomPotRatio(0,NaN);assert.equal(a.shortCuts[0].percent,0.79);
    a.shortCutMode=2;assert.equal(a.shortCuts[0].percent,0.333);a.setCustomPotRatio(0,10);
    a.shortCutMode=1;assert.equal(a.shortCuts[0].percent,0.79);
    a.setAccount(102);assert.equal(a.shortCuts[0].percent,0.5);
    const b=new TexasGamePersonalSettings('mx');b.setAccount(101);assert.equal(b.shortCuts[0].percent,0.79);
    b.shortCutMode=2;assert.equal(b.shortCuts[0].percent,0.1);
    b.resetQuickSettings();assert.equal(b.shortCuts[0].percent,0.5);b.shortCutMode=2;assert.equal(b.shortCuts[0].percent,0.333);
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
