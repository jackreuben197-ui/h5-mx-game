import test from 'node:test';
import assert from 'node:assert/strict';
import { landscapeLayout } from '../.test-build/assets/style1/table/layouts/landscape-layout.js';

test('wide 9/8/7 layouts match requested side counts with hero at bottom center', () => {
  const expected = {
    9: { left: 3, top: 2, right: 3, bottom: 1 },
    8: { left: 3, top: 1, right: 3, bottom: 1 },
    7: { left: 2, top: 2, right: 2, bottom: 1 },
  };
  for (const count of [9, 8, 7]) {
    const points = landscapeLayout(2560, 1440, count);
    const groups = points.reduce((result, p) => {
      result[p.edge] = (result[p.edge] ?? 0) + 1;
      return result;
    }, {});
    assert.deepEqual(groups, expected[count]);
    assert.ok(Math.abs(points[0].x-738.0317/1440*2560)<1e-8);
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
        assert.ok(s.x - 93.2945/2 * s.scale >= 0 && s.x + 93.2945/2 * s.scale <= width);
        assert.ok(s.y - 93.2945/2 * s.scale >= 0 && s.y + 150 * s.scale <= 1440);
      }
      // Side assignment stays clockwise, preventing visual seat order reversal on rotation.
      const angles = seats.map(
        (p) => (Math.atan2(seats[0].x - p.x, p.y - 720) + Math.PI * 2) % (Math.PI * 2),
      );
      for (let i = 1; i < angles.length; i++) assert.ok(angles[i] > angles[i - 1]);
    }
});
test('top pairs stretch with screen width even when a short frame shrinks artwork',()=>{
 for(const count of [7,9])for(const height of [390,768,1024]){
  let previous=0;
  for(const width of [1025,1440,1920,2560,3840]){
   const top=landscapeLayout(width,height,count).filter(seat=>seat.edge==='top');
   const distance=top[1].x-top[0].x;
   assert.ok(Math.abs(distance-219.64*width/1440)<1e-7,'seat 5/6 spacing follows horizontal stretching, not avatar scale');
   assert.ok(distance>previous);previous=distance;
   assert.ok(distance>(93.2945+2*12.56+39.45+16)*top[0].scale,'reserve the complete player frame, cards and a visible gap');
  }
 }
});
