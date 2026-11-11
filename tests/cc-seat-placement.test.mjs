import test from 'node:test';
import assert from 'node:assert/strict';
import { TableLayout } from '../.test-build/table/TableLayout.js';
test('9-player rotation preserves CC own and side bet coordinates independently of seat ID',()=>{
 const layout=new TableLayout();layout.resize(398,724,false);
 const state={seatCount:9,mySeat:4,players:[]};const positions=layout.positions(state);
 const bet=id=>{const p=positions.get(id);return [p.betX,p.betY,p.betIconX]};
 assert.deepEqual(bet(4),[175,-360,-25]);
 assert.deepEqual(bet(5),[190,70,-25]);assert.deepEqual(bet(7),[190,70,-25]);
 assert.deepEqual(bet(8),[-65,215,-25]);assert.deepEqual(bet(9),[-85,215,133]);
 assert.deepEqual(bet(1),[-180,70,133]);assert.deepEqual(bet(3),[-180,70,133]);
});

test('2–9-player layouts keep every seat finite and distinct before and after seating in both orientations', () => {
  for (let seatCount = 2; seatCount <= 9; seatCount++) {
    for (const landscape of [false, true]) {
      const layout = new TableLayout();
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
