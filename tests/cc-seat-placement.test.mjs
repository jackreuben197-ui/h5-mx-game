import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTableUi } from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
test('9-player rotation preserves the own bet anchor and docks protruding side chips away from avatars',()=>{
 const layout=defaultTableUi.createLayout('original');layout.resize(398,724,false);
 const state={seatCount:9,mySeat:4,players:[]};const positions=layout.positions(state);
 const own=positions.get(4);
 assert.deepEqual([own.betX,own.betIconX],[207,-25]);
 assert.ok(Math.abs(own.y+own.betY*own.scale-((own.controlsY??own.y)-392*own.scale))<1e-9,'avatar lowering must not move the own bet');
 for(const id of [5,6,7]){const p=positions.get(id);assert.deepEqual([p.betAnchor,p.betY,p.betIconX],['left',70,-25]);assert.ok(p.betX>199/2,'left-row frame starts beyond the avatar');}
 for(const id of [1,2,3]){const p=positions.get(id);assert.deepEqual([p.betAnchor,p.betY,p.betIconX],['right',70,133]);assert.ok(p.betX< -199/2,'right-row frame ends before the avatar');}
 for(const [id,x,icon] of [[8,-65,-25],[9,-85,133]]){const p=positions.get(id);assert.deepEqual([p.betAnchor,p.betX,p.betIconX],['center',x,icon]);assert.ok(p.betY>=215,'top bets clear the nameplate and the larger chip');}
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
