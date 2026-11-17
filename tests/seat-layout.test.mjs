import test from 'node:test';
import assert from 'node:assert/strict';
import { SeatPositionCaculator } from '../.test-build/assets/style1/table/layouts/seat-layout.js';
import { applyUpdate } from '../.test-build/core/store.js';
test('2–9 seats stay finite, distinct and inside portrait layouts', () => {
  for (const height of [2200, 2688, 3200])
    for (let count = 2; count <= 9; count++) {
      const layout = new SeatPositionCaculator();
      layout.initWithContainer(1440, height - 300, -100);
      layout.arrageSeatPositions(count);
      const points = layout.getPositions(count).map((position) => layout.getPosition(position));
      assert.equal(points.length, count);
      assert.equal(new Set(points.map((p) => `${p.position.x},${p.position.y}`)).size, count);
      for (const p of points) {
        assert.ok(
          Number.isFinite(p.position.x) &&
            Number.isFinite(p.position.y) &&
            Number.isFinite(p.scale),
        );
        assert.ok(Math.abs(p.position.x) + 99.5 * p.scale <= 720);
        assert.ok(-p.position.y - 99.5 * p.scale >= 0);
        assert.ok(-p.position.y + 180 * p.scale <= height);
      }
    }
});
test('authoritative sync replaces a prior deal hint; patches do not replay it', () => {
  const state = {
    roomID: 1,
    matchID: 0,
    handNum: 2,
    revision: 3,
    presentation: 'deal',
    dealOrder: [2, 1],
    pot: 0,
  };
  const sync = applyUpdate(state, {
    type: 'snapshot',
    snapshot: { roomID: 1, matchID: 0, handNum: 2, revision: 4, pot: 10 },
  });
  assert.equal(sync.presentation, 'sync');
  assert.equal(sync.dealOrder, undefined);
  const live = applyUpdate(state, {
    type: 'patch',
    roomID: 1,
    matchID: 0,
    handNum: 2,
    revision: 4,
    changes: { pot: 20 },
  });
  assert.equal(live.presentation, 'live');
});
