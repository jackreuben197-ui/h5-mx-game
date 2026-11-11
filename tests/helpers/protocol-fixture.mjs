import pb from '@silenthill/agreement-web/runtime';
export { pb };
export function inbound(code, roomID, matchID, message) {
  const body = message.serializeBinary(),
    data = new Uint8Array(53 + body.length),
    v = new DataView(data.buffer);
  data.set([89, 77]);
  v.setUint16(2, code);
  v.setBigUint64(36, BigInt(roomID));
  v.setBigUint64(44, BigInt(matchID));
  data[52] = 2;
  data.set(body, 53);
  return data;
}
export function outbound(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    length: v.getUint32(0),
    code: v.getUint16(6),
    roomID: Number(v.getBigUint64(40)),
    matchID: Number(v.getBigUint64(48)),
    body: bytes.slice(57),
  };
}
export function record(id = 1001) {
  const room = new pb.RoomRecord();
  room.setRid(id);
  room.setName('协议测试桌');
  room.setSeatCount(9);
  room.setRoomType(0);
  room.setGameType(0);
  room.setPokerType(0);
  room.setStatus(1);
  return room;
}
export function snapshot(sync = false) {
  const s = sync ? new pb.ServerMessageSyncEnter() : new pb.ServerMessageEnterRoom();
  s.setStatus(0);
  s.setGameStatus(pb.Def.GameStatus.HAND_FLOP);
  const info = new pb.RoomInfo();
  info.setSmallBlind(10);
  info.setAnte(2);
  s.setRoomInfo(info);
  const hand = new pb.HandInfo();
  hand.setHandNum(25);
  hand.setBuSeatId(9);
  hand.setAllBet(450);
  hand.setPublicCardsList([2, 18, 36]);
  s.setHandInfo(hand);
  const me = new pb.MyGameInfo();
  me.setSeatId(4);
  s.setMyInfo(me);
  const players = [1, 2, 4, 5, 7, 8, 9].map((seat) => {
    const p = new pb.Player();
    p.setSeatId(seat);
    p.setUserRid(100 + seat);
    p.setName(`座位 ${seat}`);
    p.setChip(1000 + seat);
    p.setCardsList(seat === 4 ? [14, 29] : [0, 0]);
    p.setAction(seat === 2 ? pb.Def.Action.FOLD : pb.Def.Action.NONE);
    return p;
  });
  s.setPlayersList(players);
  return s;
}
export class FakeTransport {
  listeners = new Set();
  sent = [];
  onSend;
  send(action, payload, msgtype = 1) {
    this.sent.push({ action, payload, msgtype });
    this.onSend?.(action, payload, msgtype);
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(action, payload) {
    for (const fn of [...this.listeners]) fn({ action, payload, msgtype: 0, source: 'h5' });
  }
  frame(code, roomID, matchID, message) {
    this.emit('wsMessage', { dataType: 'binary', data: inbound(code, roomID, matchID, message) });
  }
}
