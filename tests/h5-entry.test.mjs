import test from 'node:test';
import assert from 'node:assert/strict';
import { H5EntryController } from '../.test-build/host/H5EntryController.js';
import { FakeTransport } from './helpers/protocol-fixture.mjs';
test('H5 duplicate entry is deduplicated; changing identity clears old table before entering same room', () => {
  const transport = new FakeTransport();
  let state = { phase: 'hidden', target: null },
    entered = 0,
    left = 0;
  const game = {
    getState: () => state,
    enter(target) {
      entered++;
      state = { phase: 'entering', target };
      return Promise.resolve();
    },
    leave() {
      left++;
      state = { phase: 'hidden', target: null };
    },
    element: { style: { setProperty() {} } },
  };
  const entry = new H5EntryController(transport, game),
    payload = {
      token: 'identity-a',
      websocketPort: 1234,
      roomId: '1001',
      roomInfo: { rid: 1001, room_type: 0 },
    };
  transport.emit('enterTable', payload);
  transport.emit('enterTable', payload);
  assert.equal(entered, 1);
  transport.emit('syncToken', { token: 'identity-b' });
  assert.equal(left, 1);
  assert.equal(state.phase, 'hidden');
  transport.emit('enterTable', { ...payload, token: 'identity-b' });
  assert.equal(entered, 2);
  transport.emit('exitTable', {});
  assert.equal(state.phase, 'hidden');
  entry.destroy();
  assert.equal(transport.listeners.size, 0);
});

test('MTT uses the H5 current club as CC does, falling back to the match club',()=>{
 const transport=new FakeTransport(),targets=[];
 const game={getState:()=>({phase:'hidden'}),enter:t=>{targets.push(t);return Promise.resolve();},leave(){},element:{style:{setProperty(){}}}};
 const entry=new H5EntryController(transport,game);
 transport.emit('syncCurrentClub',{clubId:48});
 transport.emit('enterMtt',{token:'test',matchId:55,matchInfo:{type:512,club_id:0}});
 assert.equal(targets[0].clubID,48);
 transport.emit('syncCurrentClub',{clubId:0});
 transport.emit('enterMtt',{token:'test',matchId:56,matchInfo:{type:512,club_id:12}});
 assert.equal(targets[1].clubID,12);entry.destroy();
});

test('refresh restores only the same seated account after H5 opens its socket',async()=>{
 const map=new Map(),previous=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 try{
  const transport=new FakeTransport(),targets=[];let state={phase:'hidden'};
  const game={getState:()=>state,enter:t=>{targets.push(t);state={phase:'entering',target:t};return Promise.resolve();},leave(){state={phase:'hidden'};},element:{style:{setProperty(){}}}};
  let entry=new H5EntryController(transport,game);
  transport.emit('syncUser',{randomId:8});transport.emit('enterTable',{token:'test',websocketPort:1234,roomId:1001,roomInfo:{rid:1001,room_type:0}});
  entry.stateChanged({phase:'table',target:{roomID:1001,matchID:0,roomType:0},table:{mySeat:1}});
  entry.destroy();entry.stateChanged({phase:'hidden'});assert.equal(map.size,1);state={phase:'hidden'};targets.length=0;
  entry=new H5EntryController(transport,game);
  entry.stateChanged({phase:'hidden'});assert.equal(map.size,1);
  transport.emit('syncUser',{randomId:8});transport.emit('h5Ready',{token:'test'});
  assert.equal(targets.length,0);transport.emit('wsOpen',{url:'wss://example.test:1233'});await Promise.resolve();assert.equal(targets.length,0);transport.emit('wsOpen',{url:'wss://example.test:1234'});await Promise.resolve();
  assert.equal(targets[0].roomID,1001);
  entry.stateChanged({phase:'table',table:{mySeat:1}});entry.stateChanged({phase:'hidden'});assert.equal(map.size,0);entry.destroy();
 }finally{globalThis.sessionStorage=previous;}
});


test('entry failure returns to its H5 source or home; obsolete failure cannot close a new session',async()=>{
 const previous=globalThis.location;
 try {
  for(const hash of ['#/club/index?club=48','#/gameList','', '#//evil.test']){
   globalThis.location={hash};
   const transport=new FakeTransport();let state={phase:'hidden'},left=0;
   const game={getState:()=>state,enter:t=>{state={phase:'entering',target:t};return Promise.resolve();},leave(){left++;state={phase:'hidden'};},element:{style:{setProperty(){}}}};
   const entry=new H5EntryController(transport,game);
   transport.emit('enterTable',{token:'test',websocketPort:1234,roomId:1001,roomInfo:{rid:1001,room_type:0}});
   state={phase:'error',error:'timeout'};entry.stateChanged(state);await Promise.resolve();
   assert.equal(left,1);
   assert.deepEqual(transport.sent.find(v=>v.action==='h5Navigate').payload,{path:hash.startsWith('#/')&&!hash.startsWith('#//')?hash.slice(1):'/home',replace:true,ensureVisible:true});
   state={phase:'error'};entry.stateChanged(state);state={phase:'entering'};await Promise.resolve();assert.equal(left,1);
   entry.destroy();
  }
 }finally{if(previous===undefined)delete globalThis.location;else globalThis.location=previous;}
});
