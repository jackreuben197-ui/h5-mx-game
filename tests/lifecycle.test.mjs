import test from 'node:test';
import assert from 'node:assert/strict';
import { GameController } from '../.test-build/core/controller.js';
import { Preloader } from '../.test-build/core/preloader.js';
import { applyUpdate } from '../.test-build/core/store.js';
const target = { roomID: 1, matchID: 0, roomType: 0 };
const snapshot = (roomID = 1) => ({
  roomID,
  matchID: 0,
  handNum: 1,
  revision: 1,
  name: 'test',
  players: [],
  community: [],
  pot: 0,
  mySeat: 0,
  seatCount: 6,
  actions: ['check'],
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
test('hidden preload starts at construction; entry does not request until ready; task reused', async () => {
  const gate = deferred();
  let loads = 0,
    requests = 0;
  const c = new GameController(
    new Preloader(async (report) => {
      loads++;
      await gate.promise;
      report(1);
    }),
    {
      enter: async () => {
        requests++;
        return snapshot();
      },
      command: async () => {},
    },
  );
  await tick();
  assert.equal(loads, 1);
  assert.equal(c.current.phase, 'hidden');
  const entering = c.enter(target);
  await tick();
  assert.equal(requests, 0);
  assert.equal(c.current.phase, 'loading');
  gate.resolve();
  await entering;
  assert.equal(c.current.phase, 'table');
  assert.equal(requests, 1);
  assert.equal(loads, 1);
  c.leave();
  await c.enter(target);
  assert.equal(loads, 1);
  c.destroy();
});
test('leave during preload prevents room request', async () => {
  const gate = deferred();
  let requests = 0;
  const c = new GameController(new Preloader(() => gate.promise), {
    enter: async () => {
      requests++;
      return snapshot();
    },
    command: async () => {},
  });
  const p = c.enter(target);
  c.leave();
  gate.resolve();
  await p;
  assert.equal(requests, 0);
  assert.equal(c.current.phase, 'hidden');
  c.destroy();
});
test('old response cannot overwrite newer room, even if host ignores abort', async () => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const c = new GameController(new Preloader(async () => {}), {
    enter: () => (++calls === 1 ? first.promise : second.promise),
    command: async () => {},
  });
  const a = c.enter(target);
  await tick();
  const b = c.enter({ ...target, roomID: 2 });
  await tick();
  second.resolve(snapshot(2));
  await b;
  first.resolve(snapshot());
  await a;
  assert.equal(c.current.table.roomID, 2);
  c.destroy();
});
test('failed background resource load can retry in foreground', async () => {
  let loads = 0;
  const c = new GameController(
    new Preloader(async () => {
      if (++loads === 1) throw Error('offline');
    }),
    { enter: async () => snapshot(), command: async () => {} },
  );
  await tick();
  assert.equal(c.current.phase, 'hidden');
  await c.enter(target);
  assert.equal(loads, 2);
  assert.equal(c.current.phase, 'table');
  c.destroy();
});
test('initial snapshot plus queued deltas render together; stale updates rejected', async () => {
  let receive;
  const c = new GameController(new Preloader(async () => {}), {
    enter: async (_t, _s, r) => {
      receive = r;
      r({ type: 'patch', roomID: 1, matchID: 0, handNum: 1, revision: 2, changes: { pot: 100 } });
      return snapshot();
    },
    command: async () => {},
  });
  await c.enter(target);
  assert.equal(c.current.table.pot, 100);
  receive({ type: 'patch', roomID: 1, matchID: 0, handNum: 1, revision: 1, changes: { pot: 1 } });
  assert.equal(c.current.table.pot, 100);
  c.leave();
  receive({ type: 'snapshot', snapshot: snapshot() });
  assert.equal(c.current.table, null);
  c.destroy();
});
test('failed entry is visible and retryable', async () => {
  let calls = 0;
  const c = new GameController(new Preloader(async () => {}), {
    enter: async () => {
      if (++calls === 1) throw Error('offline');
      return snapshot();
    },
    command: async () => {},
  });
  await c.enter(target);
  assert.equal(c.current.phase, 'error');
  await c.enter(target);
  assert.equal(c.current.phase, 'table');
  c.destroy();
});
test('patch cannot cross hand boundary; next hand requires full snapshot', () => {
  const base = snapshot();
  assert.equal(
    applyUpdate(base, {
      type: 'patch',
      roomID: 1,
      matchID: 0,
      handNum: 2,
      revision: 2,
      changes: { pot: 9 },
    }),
    base,
  );
  assert.equal(
    applyUpdate(base, { type: 'snapshot', snapshot: { ...base, handNum: 2, revision: 2 } }).handNum,
    2,
  );
});
test('rapid duplicate commands send once; no optimistic chip mutation', async () => {
  let sent = 0;
  const gate = deferred();
  const c = new GameController(new Preloader(async () => {}), {
    enter: async () => snapshot(),
    command: async () => {
      sent++;
      await gate.promise;
    },
  });
  await c.enter(target);
  const a = c.command('check');
  const b = c.command('check');
  assert.equal(sent, 1);
  assert.equal(c.current.table.pot, 0);
  gate.resolve();
  await Promise.all([a, b]);
  c.destroy();
});

test('foreground preview delay also applies to cached resources and does not enter early', async () => {
  let requests = 0;
  const c = new GameController(new Preloader(async report => report(1)), {
    enter: async () => { requests++; return snapshot(); }, command: async () => {},
  }, 80);
  await tick();
  for (let i = 0; i < 2; i++) {
    const start = Date.now();
    const entering = c.enter(target);
    await tick();
    assert.equal(c.current.phase, 'loading');
    assert.equal(requests, i);
    assert.equal(c.current.progress, 1); // Cached assets are ready; preview time never falsifies progress.
    await entering;
    assert.ok(Date.now() - start >= 80);
    assert.equal(c.current.phase, 'table');
    c.leave();
  }
  c.destroy();
});
test('leaving during the preview delay cancels entry without a delayed request', async () => {
  let requests = 0;
  const c = new GameController(new Preloader(async () => {}), {
    enter: async () => { requests++; return snapshot(); }, command: async () => {},
  }, 10000);
  const entering = c.enter(target);
  await tick();
  c.leave();
  await entering;
  assert.equal(requests, 0);
  assert.equal(c.current.phase, 'hidden');
  c.destroy();
});

test('preview progress follows resource completion and 10-second preview time cannot complete resources', async () => {
  const gate = deferred();
  let report, requests = 0;
  const c = new GameController(new Preloader(async update => {
    report = update;
    await gate.promise;
  }), { enter: async () => { requests++; return snapshot(); }, command: async () => {} }, 20);
  await tick();
  const entering = c.enter(target);
  report(0.25);
  assert.equal(c.current.progress, 0.25);
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(c.current.phase, 'loading');
  assert.equal(c.current.progress, 0.25);
  assert.equal(requests, 0);
  report(0.75);
  assert.equal(c.current.progress, 0.75);
  gate.resolve();
  await entering;
  assert.equal(c.current.progress, 1);
  assert.equal(requests, 1);
  c.destroy();
});
