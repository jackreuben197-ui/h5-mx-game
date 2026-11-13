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
