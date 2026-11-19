import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTableUi } from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
test('9-player rotation preserves avatar-local bet anchors and clears protruding chips',()=>{
 const layout=defaultTableUi.createLayout('original');layout.resize(398,724,false);
 const state={seatCount:9,mySeat:4,players:[]};const positions=layout.positions(state);
 const bet=id=>{const p=positions.get(id);return [p.betX,p.betY,p.betIconX]};
 const own=positions.get(4);
 assert.equal(own.betX,175);assert.equal(own.betIconX,-25);
 assert.ok(Math.abs(own.betY+(own.y-own.controlsY)/own.scale+360)<1e-8,'avatar drop must not move the original bet anchor');
 for(const id of [5,7]){assert.ok(bet(id)[0]>210);assert.deepEqual(bet(id).slice(1),[70,-25]);}
 assert.deepEqual(bet(8),[-65,215,-25]);assert.deepEqual(bet(9),[-85,215,133]);
 for(const id of [1,3]){assert.ok(bet(id)[0]<-210);assert.deepEqual(bet(id).slice(1),[70,133]);}
});

test('2–9-player layouts keep every seat finite and distinct before and after seating in both orientations', () => {
  for (let seatCount = 2; seatCount <= 9; seatCount++) {
    for (const landscape of [false, true]) {
      const layout = defaultTableUi.createLayout('original');
      layout.resize(landscape ? 1000 : 398, landscape ? 600 : 724, landscape);
      for (let mySeat = 0; mySeat <= seatCount; mySeat++) {
        const positions = layout.positions({ seatCount, mySeat, players: [] });
        assert.equal(positions.size, seatCount);
        const coordinates = new Set();
        for (const p of positions.values()) {
          for (const key of ['x', 'y', 'scale', 'cardsX', 'cardsY', 'betX', 'betY'])
            assert.ok(Number.isFinite(p[key]), `${seatCount} seats, landscape=${landscape}: ${key}`);
          assert.ok(p.scale > 0);
          coordinates.add(`${p.x},${p.y}`);
        }
        assert.equal(coordinates.size, seatCount);
      }
    }
  }
});
