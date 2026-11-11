import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoHost } from '../.test-build/demo/host.js';
import { GameController } from '../.test-build/core/controller.js';
import { Preloader } from '../.test-build/core/preloader.js';
const target = { roomID: 1, matchID: 0, roomType: 0 };
async function setup(t) {
  const host = new DemoHost(() => {}),
    session = new AbortController();
  let state;
  state = await host.enter(target, session.signal, (e) => {
    state = e.type === 'snapshot' ? e.snapshot : { ...state, ...e.changes };
  });
  t.after(() => session.abort());
  return {
    host,
    signal: session.signal,
    get state() {
      return state;
    },
  };
}
test('check acknowledges action without immediately dealing cards or changing chips/pot', async (t) => {
  const c = await setup(t),
    before = c.state;
  await c.host.command(target, 'check', c.signal);
  assert.deepEqual(c.state.community, before.community);
  assert.equal(c.state.pot, before.pot);
  assert.equal(c.state.players[0].chips, before.players[0].chips);
  assert.equal(c.state.players[0].action, '过牌');
  assert.deepEqual(c.state.actions, []);
});
test('raise deducts exact selected chips; call uses authoritative amount; fold persists across streets', async (t) => {
  const c = await setup(t);
  await c.host.command(target, 'raise', c.signal, 350);
  assert.equal(c.state.players[0].chips, 1650);
  assert.equal(c.state.pot, 500);
  assert.equal(c.state.players[0].action, '加注 350');
  c.host.deal();
  c.host.faceBet();
  assert.equal(c.state.betting.call, 100);
  assert.ok(!c.state.actions.includes('check'));
  await c.host.command(target, 'call', c.signal);
  assert.equal(c.state.players[0].chips, 1900);
  assert.equal(c.state.pot, 350);
  c.host.deal();
  await c.host.command(target, 'fold', c.signal);
  c.host.advance();
  assert.equal(c.state.players[0].folded, true);
  assert.deepEqual(c.state.actions, []);
});
test('all-in commits full stack and a delayed command cannot mutate a new hand', async (t) => {
  const c = await setup(t);
  await c.host.command(target, 'allin', c.signal, 2000);
  assert.equal(c.state.players[0].chips, 0);
  assert.equal(c.state.pot, 2150);
  c.host.deal();
  const old = c.host.command(target, 'raise', c.signal, 100);
  c.host.deal();
  await assert.rejects(old, /操作轮已更新/);
  assert.equal(c.state.players[0].chips, 2000);
  assert.equal(c.state.pot, 150);
});
test('controller rejects invalid raise bounds, step and all-in amount before transport', async () => {
  const sent = [];
  const s = {
    ...target,
    handNum: 1,
    revision: 1,
    name: 'test',
    players: [],
    community: [],
    pot: 0,
    mySeat: 1,
    seatCount: 9,
    actions: ['raise', 'allin'],
    betting: { id: '1', call: 0, min: 100, max: 500, step: 50, allIn: 1000 },
  };
  const c = new GameController(new Preloader(async () => {}), {
    enter: async () => s,
    command: async (_t, a, _s, n) => sent.push([a, n]),
  });
  await c.enter(target);
  for (const amount of [undefined, NaN, 99, 101, 501]) await c.command('raise', amount);
  await c.command('allin', 900);
  assert.deepEqual(sent, []);
  await c.command('raise', 250);
  await c.command('allin', 1000);
  assert.deepEqual(sent, [
    ['raise', 250],
    ['allin', 1000],
  ]);
  c.destroy();
});
