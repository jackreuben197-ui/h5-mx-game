import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pb,
  FakeTransport,
  inbound,
  outbound,
  record,
  snapshot,
} from './helpers/protocol-fixture.mjs';
import { PacketCodec } from '../.test-build/net/PacketCodec.js';
import { ProtocolRuntime } from '../.test-build/net/ProtocolRuntime.js';
import { ProtocolClient } from '../.test-build/net/ProtocolClient.js';
import { MxRoomHost } from '../.test-build/host/MxRoomHost.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
const target = { roomID: 1001, matchID: 0, roomType: 0 };
const tick = () => new Promise((r) => setImmediate(r));
function setup(t, options = {}) {
  const transport = new FakeTransport(),
    host = new MxRoomHost(transport, { runtime: pb, timeoutMs: 100, ...options }),
    session = new AbortController();
  transport.emit('enterTable', { token: '00000000000000000000000000000000' });
  t.after(() => {
    session.abort();
    host.destroy();
  });
  return { transport, host, signal: session.signal, session };
}
function replyRooms(transport, packet, room = record()) {
  const request = pb.ClientMessageRooms.deserializeBinary(packet.body),
    response = new pb.ServerMessageRooms();
  response.setRpcId(request.getRpcId());
  response.setRoomsList([room]);
  transport.frame(pb.Code.MSG_R_ROOMS, 0, 0, response);
}
test('fallback runtime resolves the CJS package actually shipped by CC', async () => {
  const runtime = await new ProtocolRuntime().load();
  assert.equal(typeof runtime.ClientMessageEnterRoom, 'function');
});
test('CC binary header is big endian, observes byteOffset, rejects malformed and unsafe IDs', () => {
  const codec = new PacketCodec(),
    body = new Uint8Array([1, 2, 3]),
    id = 2 ** 40 + 123;
  const wire = codec.encode(1002, 'test', id, 0, body),
    packet = outbound(wire);
  assert.equal(packet.length, wire.length - 4);
  assert.equal(packet.roomID, id);
  assert.equal(wire[56], 2);
  const frame = inbound(1002, id, 0, snapshot()),
    buffer = new Uint8Array(frame.length + 20);
  buffer.set(frame, 10);
  assert.equal(codec.decode(buffer.subarray(10, 10 + frame.length)).roomID, id);
  assert.throws(() => codec.decode(new Uint8Array(52)));
  assert.throws(() => codec.encode(1, 'token', Number.MAX_SAFE_INTEGER + 1, 0, body));
  const bad = frame.slice();
  bad[52] = 1;
  assert.throws(() => codec.decode(bad));
});
test('entry sends Rooms then EnterRoom and maps authoritative seats/cards/pot with no deal animation', async (t) => {
  const c = setup(t),
    codes = [];
  c.transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    assert.equal(payload.dataType, 'binary');
    const packet = outbound(payload.data);
    codes.push(packet.code);
    if (packet.code === 202) {
      assert.deepEqual(
        pb.ClientMessageRooms.deserializeBinary(packet.body).getRoomIdList(),
        [1001],
      );
      replyRooms(c.transport, packet);
    }
    if (packet.code === 1002) {
      const request = pb.ClientMessageEnterRoom.deserializeBinary(packet.body);
      assert.equal(request.getRoom().getRoomId(), 1001);
      assert.equal(request.getWantSeat(), pb.Def.WantSeatType.WST_BOTH);
      c.transport.frame(1002, 1001, 0, snapshot());
    }
  };
  const state = await c.host.enter(target, c.signal, () => {});
  assert.deepEqual(codes, [202, 1002]);
  assert.equal(state.mySeat, 4);
  assert.equal(state.seatCount, 9);
  assert.equal(state.players.length, 7);
  assert.deepEqual(state.community, [2, 18, 36]);
  assert.equal(state.pot, 450);
  assert.equal(state.presentation, 'sync');
  assert.deepEqual(state.actions, []);
  assert.equal(state.players.find((p) => p.seat === 2).folded, true);
  assert.equal(c.host.roomData.record.rid, 1001);
  assert.ok(c.transport.sent.some((m) => m.action === 'setHeartbeatMode'));
});
test('closed room and EnterRoom business errors reject rather than show a fake table', async (t) => {
  const c = setup(t);
  c.transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    const room = record();
    room.setStatus(3);
    replyRooms(c.transport, outbound(payload.data), room);
  };
  await assert.rejects(
    c.host.enter(target, c.signal, () => {}),
    /关闭/,
  );
  assert.equal(c.transport.sent.filter((m) => m.action === 'wsSend').length, 1);
  c.transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    const p = outbound(payload.data);
    if (p.code === 202) replyRooms(c.transport, p);
    else {
      const s = snapshot();
      s.setStatus(1015);
      c.transport.frame(1002, 1001, 0, s);
    }
  };
  await assert.rejects(
    c.host.enter(target, c.signal, () => {}),
    /1015/,
  );
});
test('RPC ID, code, room and match are all correlated; timeout and abort detach active waits', async (t) => {
  const c = setup(t, { timeoutMs: 30 });
  const entering = c.host.enter(target, c.signal, () => {});
  await tick();
  const p = outbound(c.transport.sent.find((m) => m.action === 'wsSend').payload.data),
    request = pb.ClientMessageRooms.deserializeBinary(p.body),
    wrong = new pb.ServerMessageRooms();
  wrong.setRpcId(request.getRpcId() + 1);
  wrong.setRoomsList([record()]);
  c.transport.frame(202, 0, 0, wrong);
  await assert.rejects(entering, /超时/);
});
test('late aborted non-RPC reply is drained before another same-room request is allowed', async () => {
  const transport = new FakeTransport(),
    client = new ProtocolClient(transport, () => 'test', 100),
    a = new AbortController();
  const first = client.request(
    1002,
    1001,
    0,
    new pb.ClientMessageEnterRoom(),
    pb.ServerMessageEnterRoom,
    a.signal,
  );
  a.abort();
  await assert.rejects(first, { name: 'AbortError' });
  await assert.rejects(
    client.request(
      1002,
      1001,
      0,
      new pb.ClientMessageEnterRoom(),
      pb.ServerMessageEnterRoom,
      new AbortController().signal,
    ),
    /上一条/,
  );
  transport.frame(1002, 1001, 0, snapshot());
  await tick();
  const b = new AbortController();
  const second = client.request(
    1002,
    1001,
    0,
    new pb.ClientMessageEnterRoom(),
    pb.ServerMessageEnterRoom,
    b.signal,
  );
  transport.frame(1002, 1002, 0, snapshot());
  transport.frame(1002, 1001, 1, snapshot());
  await tick();
  let done = false;
  void second.then(() => {
    done = true;
  });
  await tick();
  assert.equal(done, false);
  transport.frame(1002, 1001, 0, snapshot());
  await second;
  client.destroy();
  assert.equal(transport.listeners.size, 0);
});
test('SyncEnter clears hand residue, handles delay-see-card and operator own cards without replaying', () => {
  const mapper = new EnterRoomMapper(pb),
    data = new ProtocolRoomData();
  data.record = record();
  data.snapshot = snapshot().toObject();
  data.snapshot.roomInfo.delaySeeCard = true;
  data.snapshot.gameStatus = pb.Def.GameStatus.HAND_PREFLOP;
  assert.deepEqual(mapper.map(data, target, 1).players.find((p) => p.seat === 4).cards, [0, 0]);
  const op = new pb.Operator();
  op.setSeatId(4);
  op.setCardsList([13, 28]);
  data.snapshot.operatorList = [op.toObject()];
  assert.deepEqual(mapper.map(data, target, 2).players.find((p) => p.seat === 4).cards, [13, 28]);
  data.snapshot = new pb.ServerMessageSyncEnter().toObject();
  const cleared = mapper.map(data, target, 3);
  assert.equal(cleared.handNum, 0);
  assert.equal(cleared.pot, 0);
  assert.deepEqual(cleared.community, []);
  assert.deepEqual(cleared.players, []);
});
test('reconnect triggers SyncEnter and publishes a fresh static snapshot', async (t) => {
  const c = setup(t),
    updates = [];
  c.transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    const packet = outbound(payload.data);
    if (packet.code === 202) replyRooms(c.transport, packet);
    else c.transport.frame(packet.code, 1001, 0, snapshot(packet.code === 1025));
  };
  const first = await c.host.enter(target, c.signal, (e) => updates.push(e));
  c.transport.emit('wsReconnected', {});
  await tick();
  await tick();
  assert.equal(updates.length, 2); // Freeze actions before authoritative recovery.
  assert.deepEqual(updates[0].snapshot.actions, []);
  assert.equal(updates[1].snapshot.presentation, 'sync');
  assert.ok(updates[0].snapshot.revision > first.revision);
});

for (let seatCount = 2; seatCount <= 9; seatCount++) {
  test(`${seatCount}-player room enters through Rooms and EnterRoom with server seat IDs preserved`, async (t) => {
    const c = setup(t), codes = [];
    c.transport.onSend = (action, payload) => {
      if (action !== 'wsSend') return;
      const packet = outbound(payload.data);
      codes.push(packet.code);
      if (packet.code === 202) {
        const room = record();
        room.setSeatCount(seatCount);
        replyRooms(c.transport, packet, room);
      } else if (packet.code === 1002) {
        const state = snapshot();
        state.getMyInfo().setSeatId(1);
        state.getHandInfo().setBuSeatId(seatCount);
        state.setPlayersList(state.getPlayersList().filter(p => p.getSeatId() <= seatCount));
        c.transport.frame(1002, 1001, 0, state);
      }
    };
    const state = await c.host.enter(target, c.signal, () => {});
    assert.deepEqual(codes, [202, 1002]);
    assert.equal(state.seatCount, seatCount);
    assert.equal(state.mySeat, 1);
    assert.deepEqual(state.players.map(p => p.seat), [1, 2, 4, 5, 7, 8, 9].filter(id => id <= seatCount));
  });
}
