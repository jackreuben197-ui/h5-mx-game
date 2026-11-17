import test from 'node:test';
import assert from 'node:assert/strict';
import { SeatPositionMotion } from '../.test-build/assets/style1/table/SeatPositionMotion.js';

const observing = { roomID: 1001, matchID: 0, seatCount: 9, mySeat: 0, presentation: 'live' };
const seated = { ...observing, mySeat: 4 };

test('own live seating rotates; initial entry, sync, room replacement and other players do not', () => {
  assert.equal(SeatPositionMotion.mode(undefined, seated), 'static');
  assert.equal(SeatPositionMotion.mode(observing, seated), 'seat');
  assert.equal(SeatPositionMotion.mode(observing, { ...seated, presentation: 'sync' }), 'static');
  assert.equal(SeatPositionMotion.mode(observing, { ...seated, roomID: 1002 }), 'static');
  assert.equal(SeatPositionMotion.mode(observing, { ...seated, seatCount: 6 }), 'static');
  assert.equal(SeatPositionMotion.mode(seated, { ...seated }), 'update');
  assert.equal(SeatPositionMotion.mode(seated, observing), 'update');
  assert.equal(SeatPositionMotion.mode(observing, { ...observing, players: [{ seat: 5 }] }), 'update');
});

function surface(t, reduced = false) {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: reduced });
  t.after(() => { if (original) globalThis.matchMedia = original; else delete globalThis.matchMedia; });
  const animations = [];
  const node = {
    style: {},
    animate(frames, options) {
      let reject;
      const animation = { frames, options, canceled: false,
        finished: new Promise((_, no) => { reject = no; }),
        cancel() { this.canceled = true; reject(new Error('cancelled')); },
      };
      animations.push(animation);
      return animation;
    },
  };
  return { node, animations };
}

test('seating starts at the previous position, overshoots, fades linearly and survives unrelated updates', t => {
  const { node, animations } = surface(t);
  const motion = new SeatPositionMotion(node);
  t.after(() => motion.cancel());
  motion.place({ x: 100, y: 200, scale: .8 }, 'static');
  const target = { x: 600, y: 900, scale: 1 };
  motion.place(target, 'seat');
  assert.equal(animations.length, 1);
  const animation = animations[0];
  assert.equal(animation.options.duration, 1000);
  assert.equal(animation.frames[0].transform, 'translate(-500px, -700px) scale(0.8)');
  assert.equal(animation.frames[0].opacity, 0);
  assert.equal(animation.frames[30].opacity, .5);
  assert.equal(animation.frames.at(-1).transform, 'translate(0px, 0px) scale(1)');
  assert.equal(animation.frames.at(-1).opacity, 1);
  assert.ok(animation.frames.some(f => Number(f.transform.match(/translate\(([^p]+)/)[1]) > 0));
  motion.place(target, 'update');
  assert.equal(animations.length, 1);
  assert.equal(animation.canceled, false);
  motion.place(target, 'static');
  assert.equal(animation.canceled, true);
  assert.deepEqual(node.style, { left: '600px', top: '900px', transform: 'scale(1)' });
});

test('reduced motion applies the final seat without making it invisible', t => {
  const { node, animations } = surface(t, true);
  const motion = new SeatPositionMotion(node);
  motion.place({ x: 100, y: 200, scale: .8 }, 'static');
  motion.place({ x: 600, y: 900, scale: 1 }, 'seat');
  assert.equal(animations.length, 0);
  assert.equal(node.style.transform, 'scale(1)');
  assert.equal(node.style.opacity, undefined);
});
