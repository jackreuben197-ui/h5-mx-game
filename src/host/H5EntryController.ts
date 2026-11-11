import { i18nMgr } from '../i18n/i18nMgr.js';
import type { HostMessage, HostTransport } from './HostTransport.js';
import type { GameClient } from '../GameClient.js';
/** H5 menu events -> application entry. No DOM creation or protocol decoding here. */
export class H5EntryController {
  private off: () => void;
  private token = '';
  constructor(
    private transport: HostTransport,
    private game: GameClient,
  ) {
    this.off = transport.subscribe((message) => this.receive(message));
  }
  private receive(message: HostMessage): void {
    const raw = message.payload,
      p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    if (
      ['h5Ready', 'syncToken', 'enterTable'].includes(message.action) &&
      typeof p.token === 'string'
    ) {
      if (this.token && this.token !== p.token) this.game.leave();
      this.token = p.token;
    }
    if (message.action === 'syncLanguage' && typeof p.locale === 'string') i18nMgr.setLanguage(p.locale);
    if (message.action === 'h5Ready') {
      this.transport.send('ccAck', { ok: true, message: 'MX ready' });
      const safe = p.safeArea as Record<string, unknown> | undefined;
      for (const side of ['top', 'right', 'bottom', 'left'])
        if (safe && typeof safe[side] === 'number' && Number(safe[side]) >= 0)
          this.game.element.style.setProperty(`--mx-safe-${side}`, `${safe[side]}px`);
    }
    if (message.action === 'exitTable' || (message.action === 'syncToken' && p.token === '')) {
      this.game.leave();
      return;
    }
    if (message.action === 'enterMtt') {
      this.toast('当前先接入普通德州桌');
      return;
    }
    if (message.action !== 'enterTable') return;
    try {
      const info = p.roomInfo as Record<string, unknown> | undefined;
      const roomID = Number(p.roomId ?? info?.rid),
        roomType = Number(info?.room_type),
        clubID = Number(p.clubId ?? info?.club_id ?? 0);
      if (
        !info ||
        !Number.isSafeInteger(roomID) ||
        roomID <= 0 ||
        Number(info.rid) !== roomID ||
        !Number.isSafeInteger(roomType) ||
        roomType < 0 ||
        typeof p.token !== 'string' ||
        !p.token ||
        !Number.isFinite(Number(p.websocketPort)) ||
        Number(p.websocketPort) <= 0
      )
        throw new Error('入桌参数不完整，请从 H5 房间列表进入');
      const current = this.game.getState();
      if (
        current.target?.roomID === roomID &&
        ['loading', 'entering', 'table'].includes(current.phase)
      )
        return;
      void this.game.enter({ roomID, roomType, matchID: 0, clubID, observer: false });
    } catch (error) {
      this.toast(error instanceof Error ? error.message : '入桌参数错误');
    }
  }
  private toast(message: string): void {
    this.transport.send('showToast', { type: 'fail', message });
  }
  destroy(): void {
    this.off();
    this.token = '';
  }
}
