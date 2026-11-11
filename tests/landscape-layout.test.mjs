import test from 'node:test';
import assert from 'node:assert/strict';
import { landscapeLayout } from '../.test-build/core/landscape-layout.js';

test('wide 9/8/7 layouts match requested side counts with hero at bottom center', () => {
  const expected = {
    9: { left: 2, top: 2, right: 2, bottom: 3 },
    8: { left: 2, top: 3, right: 2, bottom: 1 },
    7: { left: 2, top: 2, right: 2, bottom: 1 },
  };
  for (const count of [9, 8, 7]) {
    const points = landscapeLayout(2560, 1440, count);
    const groups = points.reduce((result, p) => {
      result[p.edge] = (result[p.edge] ?? 0) + 1;
      return result;
    }, {});
    assert.deepEqual(groups, expected[count]);
    assert.equal(points[0].x, 1280);
    assert.equal(points[0].edge, 'bottom');
  }
});
test('all supported landscape tables keep player frames inside usable viewport', () => {
  for (const width of [1450, 1570, 1920, 2560, 3116, 3840])
    for (let count = 2; count <= 9; count++) {
      const seats = landscapeLayout(width, 1440, count);
      assert.equal(seats.length, count);
      assert.equal(new Set(seats.map((s) => `${s.x},${s.y}`)).size, count);
      for (const s of seats) {
        assert.ok(s.x - 100 * s.scale >= 0 && s.x + 100 * s.scale <= width);
        assert.ok(s.y - 100 * s.scale >= 0 && s.y + 177 * s.scale <= 1440);
      }
      // Side assignment stays clockwise, preventing visual seat order reversal on rotation.
      const angles = seats.map(
        (p) => (Math.atan2(width / 2 - p.x, p.y - 720) + Math.PI * 2) % (Math.PI * 2),
      );
      for (let i = 1; i < angles.length; i++) assert.ok(angles[i] > angles[i - 1]);
    }
});
