import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, FakeTransport, outbound, record, snapshot } from './helpers/protocol-fixture.mjs';
import { MxRoomHost } from '../.test-build/host/MxRoomHost.js';
import { TableData } from '../.test-build/data/TableData.js';
import { SeatData } from '../.test-build/data/SeatData.js';
import { HttpClient } from '../.test-build/net/http/HttpClient.js';
import { UserInfoRequest } from '../.test-build/net/http/UserInfoRequest.js';
const tick = () => new Promise((r) => setImmediate(r));
const target = { roomID: 1001, roomType: 0, matchID: 0 };
async function setup(t, initial = snapshot(), afterSnapshot) {
  const transport = new FakeTransport();
  const host = new MxRoomHost(transport, { runtime: pb, timeoutMs: 150 });
  const abort = new AbortController();
  const data = new TableData(),
    updates = [];
  transport.emit('enterTable', { token: '00000000000000000000000000000000' });
  transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    const packet = outbound(payload.data);
    if (packet.code === pb.Code.MSG_R_ROOMS) {
      const reply = new pb.ServerMessageRooms();
      reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());
      reply.setRoomsList([record()]);
      transport.frame(packet.code, 0, 0, reply);
    } else if (packet.code === pb.Code.MSG_D_ENTER_ROOM) {
      transport.frame(packet.code, 1001, 0, initial);
      afterSnapshot?.(transport);
    } else if (packet.code === pb.Code.MSG_D_SYNC_ENTER)
      transport.frame(packet.code, 1001, 0, snapshot(true));
  };
  const base = await host.enter(target, abort.signal, (update) => {
    updates.push(update);
    if (update.type === 'snapshot') data.replace(update.snapshot);
  });
  if (!updates.length) data.replace(base);
  await tick();
  t.after(() => {
    abort.abort();
    host.destroy();
    data.destroy();
  });
  return { transport, host, abort, data, updates };
}
function frame(c, code, value, room = 1001) {
  c.transport.frame(code, room, 0, value);
  return tick();
}
function action(seat, kind, chips = 800, amount = 0) {
  const a = new pb.ServerMessageActionAll();
  a.setOperatorSeatId(seat);
  a.setAction(kind);
  a.setLeftChips(chips);
  a.setAmount(amount);
  a.setAllBet(600);
  return a;
}
function start(handNum = 26) {
  const b = new pb.ServerMessageStartInfo(),
    h = new pb.HandInfo();
  h.setHandNum(handNum);
  h.setDealOrderList([4, 1]);
  h.setBuSeatId(1);
  h.setAllBet(30);
  b.setHandInfo(h);
  b.setPlayersList(
    [4, 1].map((id) => {
      const p = new pb.PlayerStartInfo();
      p.setSeatId(id);
      p.setChip(900);
      p.setCardsList(id === 4 ? [14, 29] : []);
      return p;
    }),
  );
  return b;
}
test('binary WS callbacks update observable data without UI calls: deal, check, fold, board, winner, clear', async (t) => {
  const c = await setup(t);
  let events = 0;
  const seat = c.data.seats.get(1);
  const off = seat.on(SeatData.CHANGE, () => events++);
  t.after(off);
  await frame(c, pb.Code.MSG_S_START_INFO, start());
  assert.equal(c.data.info.snapshot.presentation, 'deal');
  assert.deepEqual(c.data.info.snapshot.dealOrder, [4, 1]);
  assert.deepEqual(c.data.publicCards.state.cards, []);
  assert.deepEqual(c.data.seats.get(1).state.player.cards, [0, 0]);
  await frame(c, pb.Code.MSG_S_ACTION_ALL, action(1, pb.Def.Action.CHECK));
  assert.equal(seat.state.player.action, '过牌');
  await frame(c, pb.Code.MSG_S_ACTION_ALL, action(1, pb.Def.Action.FOLD));
  assert.equal(seat.state.player.folded, true);
  assert.equal(c.data.pot.amount, 600);
  const board = new pb.ServerMessagePublicCards();
  board.setRnd(pb.Def.Round.FLOP);
  board.setPublicCardsArrayList([2, 18, 36]);
  await frame(c, pb.Code.MSG_S_PUBLIC_CARDS, board);
  assert.deepEqual(c.data.publicCards.state.cards, [2, 18, 36]);
  const count = c.updates.length;
  await frame(c, pb.Code.MSG_S_PUBLIC_CARDS, board);
  assert.equal(c.updates.length, count);
  const winner = new pb.ServerMessageWinner();
  winner.setHandNum(25);
  await frame(c, pb.Code.MSG_S_WINNER, winner);
  assert.equal(c.updates.length, count);
  winner.setHandNum(26);
  const result = new pb.Result();
  result.setSeatId(4);
  result.setChip(1500);
  result.setMyCardsList([14, 29]);
  winner.setResultsList([result]);
  await frame(c, pb.Code.MSG_S_WINNER, winner);
  assert.equal(c.data.seats.get(4).state.player.chips, 1500);
  await frame(c, pb.Code.MSG_S_HAND_CLEAR, new pb.ServerMessageHandClear());
  assert.equal(c.data.pot.amount, 0);
  assert.deepEqual(c.data.publicCards.state.cards, []);
  assert.deepEqual(seat.state.player.cards, []);
  assert.ok(events >= 6);
  assert.equal(c.data.seats.get(1), seat);
});
test('seat lifecycle and user identity are replaced, and another room cannot change data', async (t) => {
  const c = await setup(t);
  const seated = new pb.ServerMessageSeatedOthers();
  seated.setSeatId(3);
  seated.setUserRid(999);
  seated.setName('新玩家');
  seated.setAvatar('/avatar.png');
  seated.setChips(1200);
  await frame(c, pb.Code.MSG_S_SEATED_OTHERS, seated);
  assert.equal(c.data.seats.get(3).state.player.name, '新玩家');
  await frame(c, pb.Code.MSG_S_ACTION_ALL, action(3, pb.Def.Action.FOLD), 9999);
  assert.equal(c.data.seats.get(3).state.player.folded, false);
  const stand = new pb.ServerMessageStandup();
  stand.setSeatId(3);
  await frame(c, pb.Code.MSG_S_STANDUP, stand);
  assert.equal(c.data.seats.get(3).state.player, undefined);
  c.transport.emit('syncUser', { randomId: 123, nickname: '本人', avatar: '/me.png' });
  const me = new pb.ServerMessageSeated();
  me.setRecvSeatId(6);
  me.setChips(500);
  await frame(c, pb.Code.MSG_D_SEATED, me);
  assert.equal(c.data.info.snapshot.mySeat, 6);
  assert.equal(c.data.seats.get(6).state.player.name, '本人');
});
test('entry buffers notifications after the authoritative wire boundary; cancellation detaches the room', async (t) => {
  const c = await setup(t, snapshot(), (transport) =>
    transport.frame(pb.Code.MSG_S_ACTION_ALL, 1001, 0, action(1, pb.Def.Action.FOLD)),
  );
  assert.equal(c.data.seats.get(1).state.player.folded, true);
  c.abort.abort();
  const n = c.updates.length;
  await frame(c, pb.Code.MSG_S_ACTION_ALL, action(1, pb.Def.Action.CHECK));
  assert.equal(c.updates.length, n);
});
test('out-of-order public cards trigger full sync rather than corrupting the board', async (t) => {
  const c = await setup(t);
  const invalid = new pb.ServerMessagePublicCards();
  invalid.setRnd(pb.Def.Round.RIVER);
  invalid.setPublicCardsArrayList([40]);
  await frame(c, pb.Code.MSG_S_PUBLIC_CARDS, invalid);
  await tick();
  assert.deepEqual(c.data.publicCards.state.cards, [2, 18, 36]);
  assert.ok(
    c.transport.sent.some(
      (m) => m.action === 'wsSend' && outbound(m.payload.data).code === pb.Code.MSG_D_SYNC_ENTER,
    ),
  );
  assert.equal(c.data.info.snapshot.presentation, 'sync');
});
test('action request uses server limits, no optimistic chips, and one send per turn', async (t) => {
  const s = snapshot(),
    op = new pb.Operator(),
    limit = new pb.ActionLimit();
  op.setSeatId(4);
  op.setOpDeadline(123456);
  limit.setAction(pb.Def.Action.RAISE);
  limit.setMin(100);
  limit.setMax(300);
  op.setActionsList([limit]);
  s.setOperatorList([op]);
  const c = await setup(t, s);
  let sends = 0;
  const oldSend = c.transport.onSend;
  c.transport.onSend = (a, p) => {
    if (a === 'wsSend' && outbound(p.data).code === pb.Code.MSG_D_ACTION) {
      sends++;
      const body = pb.ClientMessageAction.deserializeBinary(outbound(p.data).body);
      assert.equal(body.getAmount(), 200);
      assert.equal(body.getAction(), pb.Def.Action.RAISE);
      c.transport.frame(pb.Code.MSG_D_ACTION, 1001, 0, new pb.ServerMessageAction());
    } else oldSend(a, p);
  };
  await assert.rejects(c.host.command(target, 'raise', c.abort.signal, 301), /失效/);
  const chips = c.data.seats.get(4).state.player.chips;
  await c.host.command(target, 'raise', c.abort.signal, 200);
  assert.equal(c.data.seats.get(4).state.player.chips, chips);
  // CC silently ignores duplicate clicks until the authoritative action arrives.
  await c.host.command(target, 'raise', c.abort.signal, 200);
  assert.equal(sends, 1);
  await frame(c, pb.Code.MSG_S_ACTION_ALL, action(4, pb.Def.Action.RAISE, 804, 200));
  assert.equal(c.data.seats.get(4).state.player.chips, 804);
});
test('HTTP follows CC headers/envelope, distinguishes failures, cancels and rejects previous account responses', async () => {
  let token = 'test';
  let calls = 0;
  const client = new HttpClient(() => token, {
    baseUrl: '/api',
    fetch: async (url, init) => {
      calls++;
      assert.equal(url, '/api/user/info');
      assert.equal(init.headers.md5at, 'test');
      assert.equal(init.method, 'POST');
      return Response.json({ code: 0, data: { user: { un_id: 1, nickname: '玩家', avatar: '' } } });
    },
  });
  assert.equal((await new UserInfoRequest(client).execute()).user.un_id, 1);
  await assert.rejects(client.request('https://invalid.example/'), /接口/);
  assert.equal(calls, 1);
  const rejected = new HttpClient(() => token, {
    fetch: async () => Response.json({ code: 1001, message: '失效' }),
  });
  await assert.rejects(rejected.request('/api/user/info'), (e) => e.code === 1001);
  const httpError = new HttpClient(() => token, {
    fetch: async () => new Response('', { status: 503 }),
  });
  await assert.rejects(httpError.request('/api/user/info'), (e) => e.status === 503);
  const switched = new HttpClient(() => token, {
    fetch: async () => {
      token = 'next';
      return Response.json({ code: 0, data: {} });
    },
  });
  await assert.rejects(switched.request('/api/user/info'), (e) => e.name === 'AbortError');
  const timeout = new HttpClient(() => token, {
    timeoutMs: 5,
    fetch: async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason)),
      ),
  });
  await assert.rejects(timeout.request('/api/user/info'), (e) => e.name === 'TimeoutError');
});
