import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, FakeTransport, outbound, record, snapshot } from './helpers/protocol-fixture.mjs';
import { MxRoomHost } from '../.test-build/host/MxRoomHost.js';
import { BuyInController } from '../.test-build/logic/BuyInController.js';
import { SeatPositionMotion } from '../.test-build/table/SeatPositionMotion.js';

test('successful sit-down closes buy-in and keeps the live seat move without an immediate SyncEnter', async t => {
  const transport = new FakeTransport(), signal = new AbortController();
  const host = new MxRoomHost(transport, { runtime: pb, timeoutMs: 200, http: {
    baseURL: 'https://test.invalid/api', fetch: async url => Response.json({ code: 0, data:
      String(url).endsWith('/user/info')
        ? { user: { un_id: 777, nickname: '测试玩家', avatar: '/test-avatar.png' } }
        : { return_table: false, wallet: [{ club_id: 1, club_name: '测试俱乐部', gold: 100000 }] },
    }),
  } });
  t.after(() => { signal.abort(); host.destroy(); });
  const initial = snapshot();
  initial.getMyInfo().setSeatId(0);
  initial.setPlayersList(initial.getPlayersList().filter(p => p.getSeatId() !== 4));
  initial.getRoomInfo().setCurrentMinRate(10);
  initial.getRoomInfo().setCurrentMaxRate(100);
  let syncRequests = 0, seatedReply;
  transport.emit('enterTable', { token: '00000000000000000000000000000000' });
  transport.onSend = (action, payload) => {
    if (action !== 'wsSend') return;
    const packet = outbound(payload.data);
    if (packet.code === pb.Code.MSG_R_ROOMS) {
      const reply = new pb.ServerMessageRooms(), room = record(); room.setGoldType(1);
      reply.setRpcId(pb.ClientMessageRooms.deserializeBinary(packet.body).getRpcId());
      reply.setRoomsList([room]); transport.frame(packet.code, 0, 0, reply);
    } else if (packet.code === pb.Code.MSG_D_ENTER_ROOM) {
      transport.frame(packet.code, 1001, 0, initial);
    } else if (packet.code === pb.Code.MSG_D_SEATED) {
      const request = pb.ClientMessageSeated.deserializeBinary(packet.body);
      seatedReply = () => {
        const reply = new pb.ServerMessageSeated();
        reply.setRecvSeatId(request.getSeatId()); reply.setChips(request.getBringIn());
        transport.frame(packet.code, 1001, 0, reply);
      };
    } else if (packet.code === pb.Code.MSG_D_SYNC_ENTER) {
      syncRequests++;
      transport.frame(packet.code, 1001, 0, snapshot(true));
    }
  };
  const target = { roomID: 1001, matchID: 0, roomType: 0 };
  const modes = [];
  let previous = await host.enter(target, signal.signal, event => {
    if (event.type !== 'snapshot') return;
    modes.push(SeatPositionMotion.mode(previous, event.snapshot));
    previous = event.snapshot;
  });
  const buyIn = new BuyInController({
    prepare: seat => host.prepareSeat(target, seat, signal.signal),
    submit: selection => host.sitDown(target, selection, signal.signal),
    standup: () => host.standup(target, signal.signal),
  });
  t.after(() => buyIn.destroy());
  await buyIn.open(4); buyIn.next(); buyIn.next();
  const submit = buyIn.submit();
  assert.equal(buyIn.data.state.busy, true);
  assert.equal(previous.mySeat, 0, 'never move seats optimistically');
  seatedReply();
  await submit;
  assert.equal(buyIn.data.state.step, 'closed');
  assert.equal(buyIn.data.state.error, '');
  assert.equal(previous.mySeat, 4);
  assert.equal(syncRequests, 0, 'SyncEnter would cancel the animation before the dialog closes');
  assert.deepEqual(modes, ['seat']);
  assert.equal(host.roomData.snapshot.myInfo.totalChips, 200);
});
