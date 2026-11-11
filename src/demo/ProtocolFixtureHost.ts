import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
type FixtureWindow = Window & {
  H5Bridge?: { onMessgeRecv: (action: string, payload?: unknown, msgtype?: number) => void };
  CocosBridge?: {
    sendMessage?: (
      action: string,
      payload?: unknown,
      msgtype?: number,
      requestId?: string,
      timestamp?: number,
      source?: string,
    ) => void;
  };
};
/** Offline verification only: real protobuf bodies and CC packet headers, synthetic data. */
export class ProtocolFixtureHost {
  readonly requests: number[] = [];
  fail: 'none' | 'closed' | 'entry' | 'timeout' = 'none';
  private syncCount = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  constructor(
    private pb: HoldemRuntime,
    private log: (message: string) => void,
    private win: FixtureWindow = window,
  ) {
    win.H5Bridge = { onMessgeRecv: (action, payload) => this.receive(action, payload) };
  }
  private send(action: string, payload?: unknown) {
    this.win.CocosBridge?.sendMessage?.(action, payload, 0, undefined, Date.now(), 'h5');
  }
  enter(roomID = 1001): void {
    this.send('enterTable', {
      token: '00000000000000000000000000000000',
      websocketPort: 9999,
      roomId: String(roomID),
      roomInfo: { rid: roomID, room_type: 0, game_type: 0, poker_type: 0, seat_count: 9 },
      clubId: 1,
    });
  }
  private receive(action: string, payload: unknown): void {
    if (action === 'ccReady') {
      this.send('h5Ready', { token: '00000000000000000000000000000000' });
      this.send('syncUser', { uid: 1, randomId: 104, nickname: '入桌测试' });
      return;
    }
    if (action === 'showToast') {
      this.log(String((payload as { message?: string })?.message ?? ''));
      return;
    }
    if (action !== 'wsSend') return;
    const data = (payload as { data: Uint8Array }).data,
      view = new DataView(data.buffer, data.byteOffset, data.byteLength),
      code = view.getUint16(6),
      roomID = Number(view.getBigUint64(40));
    this.requests.push(code);
    this.log(`协议请求 ${code}`);
    if (this.fail === 'timeout') return;
    let response: { serializeBinary(): Uint8Array };
    if (code === this.pb.Code.MSG_R_ROOMS) {
      const request = this.pb.ClientMessageRooms.deserializeBinary(data.slice(57)),
        room = new this.pb.RoomRecord();
      room.setRid(request.getRoomIdList()[0]!);
      room.setName('9 人桌 · 协议回放');
      room.setSeatCount(9);
      room.setStatus(this.fail === 'closed' ? 3 : 1);
      const message = new this.pb.ServerMessageRooms();
      message.setRpcId(request.getRpcId());
      message.setRoomsList([room]);
      response = message;
    } else if (code === this.pb.Code.MSG_D_ENTER_ROOM || code === this.pb.Code.MSG_D_SYNC_ENTER) {
      const sync = code === this.pb.Code.MSG_D_SYNC_ENTER;
      if (sync) this.syncCount++;
      const message = sync
        ? new this.pb.ServerMessageSyncEnter()
        : new this.pb.ServerMessageEnterRoom();
      message.setStatus(this.fail === 'entry' ? 1015 : 0);
      message.setGameStatus(this.pb.Def.GameStatus.HAND_FLOP);
      const room = new this.pb.RoomInfo();
      room.setSmallBlind(10);
      room.setAnte(2);
      message.setRoomInfo(room);
      const hand = new this.pb.HandInfo();
      hand.setHandNum(25 + this.syncCount);
      hand.setAllBet(sync ? 0 : 450);
      hand.setBuSeatId(9);
      hand.setPublicCardsList(sync ? [] : [2, 18, 36]);
      message.setHandInfo(hand);
      const mine = new this.pb.MyGameInfo();
      mine.setSeatId(4);
      message.setMyInfo(mine);
      message.setPlayersList(
        (sync ? [1, 4, 7] : [1, 2, 4, 5, 7, 8, 9]).map((seat) => {
          const p = new this.pb.Player();
          p.setSeatId(seat);
          p.setUserRid(100 + seat);
          p.setName(
            ['', 'Amber', 'River', '', '我', '北辰', '', '清风', 'Lindsey', '初夏'][seat] ?? '',
          );
          p.setChip(2000 + seat * 100);
          p.setCardsList(sync ? [] : seat === 4 ? [14, 29] : [0, 0]);
          p.setAction(seat === 2 ? this.pb.Def.Action.FOLD : this.pb.Def.Action.NONE);
          return p;
        }),
      );
      response = message;
    } else throw new Error(`Fixture 未注册协议 ${code}`);
    const body = response.serializeBinary(),
      bytes = new Uint8Array(53 + body.length),
      header = new DataView(bytes.buffer);
    bytes.set([89, 77]);
    header.setUint16(2, code);
    header.setBigUint64(36, BigInt(roomID));
    header.setBigUint64(44, 0n);
    bytes[52] = 2;
    bytes.set(body, 53);
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.send('wsMessage', { dataType: 'binary', data: bytes });
    }, 80);
    this.timers.add(timer);
  }
  reconnect(): void {
    this.send('wsReconnecting', { attempt: 1 });
    this.send('wsReconnected', { attempt: 1 });
  }
  destroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    delete this.win.H5Bridge;
  }
}
