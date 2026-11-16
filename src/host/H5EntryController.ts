import type { GuestSitdownFlow } from '../logic/GuestSitdownFlow.js';
import { i18nMgr } from '../i18n/i18nMgr.js';
import type { HostMessage, HostTransport } from './HostTransport.js';
import type { ClientState, RoomTarget } from '../core/types.js';
import type { GameClient } from '../GameClient.js';
/** H5 menu events -> application entry. No DOM creation or protocol decoding here. */
export class H5EntryController {
  private off: () => void;
  private token = '';
  private currentClubID = 0;
  private userRID = 0;
  private port = 0;
  private ready = false;
  private restoreAttempted = false;
  private restoring?: RoomTarget;
  private hadTableSession = false;
  private disposed = false;
  private returnPath = '/home';
  private readonly resumeKey = 'mx.seated-table.v1';
  stateChanged(state: ClientState): void {
    if(this.disposed||state.phase==='destroyed')return;
    this.guest?.stateChanged(state,seat=>this.game.requestSeat(seat));
    if(state.phase==='error'){
      queueMicrotask(()=>{
        if(this.disposed||this.game.getState()!==state)return;
        this.game.leave();
        this.transport.send('h5Navigate',{path:this.returnPath,replace:true,ensureVisible:true});
      });
    }
    const leaving=state.phase==='hidden'&&this.hadTableSession;
    if(state.phase!=='hidden')this.hadTableSession=true;
    else this.hadTableSession=false;
    try {
      if(state.phase==='table'&&state.table?.mySeat&&state.target&&this.userRID&&this.port)
        sessionStorage.setItem(this.resumeKey,JSON.stringify({userRID:this.userRID,port:this.port,target:state.target,returnPath:this.returnPath}));
      else if(leaving||state.phase==='error'||(state.phase==='table'&&!state.table?.mySeat))
        sessionStorage.removeItem(this.resumeKey);
    } catch { /* Storage restrictions do not prevent normal table entry. */ }
  }
  private validReturnPath(value: unknown): string {
    return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)?value:'/home';
  }
  private matchesRestoreSocket(url: unknown): boolean {
    if(typeof url!=='string')return false;
    try {
      const socket = new URL(url);
      if (typeof location !== 'undefined' && socket.host === location.host && socket.pathname === `/mx-ws:${this.port}`) return true;
      return Number(socket.port) === this.port;
    } catch { return false; }
  }
  private restore(): void {
    if(this.restoreAttempted||!this.ready||!this.token||!this.userRID||this.game.getState().phase!=='hidden')return;
    this.restoreAttempted=true;
    try {
      const saved=JSON.parse(sessionStorage.getItem(this.resumeKey)??'null');
      const t=saved?.target;
      if(saved?.userRID!==this.userRID){sessionStorage.removeItem(this.resumeKey);return;}
      if(!t||!Number.isSafeInteger(t.roomID)||t.roomID<=0||!Number.isSafeInteger(t.matchID)||t.matchID<0||!Number.isSafeInteger(t.roomType)||!Number.isInteger(saved.port)||saved.port<=0)return;
      this.returnPath=this.validReturnPath(saved.returnPath);
      this.restoring=t;this.port=saved.port;
      this.transport.send('wsConnect',{port:this.port,roomId:t.roomID,matchId:t.matchID});
    } catch { /* No valid saved room. */ }
  }
  constructor(
    private transport: HostTransport,
    private game: GameClient,
    private guest?:GuestSitdownFlow,
  ) {
    this.off = transport.subscribe((message) => this.receive(message));
  }
  private receive(message: HostMessage): void {
    const raw = message.payload,
      p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    if(message.action==='tableSitdownAuth'){
      if(this.guest?.auth(p.state)&&p.state==='switching')this.game.leave();
      return;
    }
    if(message.action==='exitTable')this.guest?.cancel();
    if(message.action==='syncUser'){this.userRID=Number(p.randomId)||0;this.restore();}
    if(message.action==='wsOpen'&&this.restoring&&this.matchesRestoreSocket(p.url)){
      const target=this.restoring;this.restoring=undefined;
      // H5 emits wsOpen immediately before REGISTER; defer entry until that send completes.
      queueMicrotask(()=>{if(this.token&&this.game.getState().phase==='hidden')void this.game.enter(target);});
    }
    if(message.action==='enterTable'||message.action==='enterMtt'){
      if(this.game.getState().phase==='hidden')
        this.returnPath=this.validReturnPath(typeof location==='undefined'?undefined:location.hash.slice(1));
      this.restoring=undefined;this.restoreAttempted=true;
      this.port=Number(p.websocketPort)||this.port;
    }
    if (message.action === 'syncCurrentClub') {
      const id = Number(p.clubId);
      this.currentClubID = Number.isSafeInteger(id) && id > 0 ? id : 0;
    }
    if (
      ['h5Ready', 'syncToken', 'enterTable', 'enterMtt'].includes(message.action) &&
      typeof p.token === 'string'
    ) {
      if (this.token && this.token !== p.token) this.game.leave();
      this.token = p.token;
      this.restore();
    }
    if (message.action === 'syncLanguage' && typeof p.locale === 'string') i18nMgr.setLanguage(p.locale);
    if (message.action === 'h5Ready') {
      this.ready=true;this.restore();
      this.transport.send('ccAck', { ok: true, message: 'MX ready' });
      const safe = p.safeArea as Record<string, unknown> | undefined;
      for (const side of ['top', 'right', 'bottom', 'left'])
        if (safe && typeof safe[side] === 'number' && Number(safe[side]) >= 0)
          this.game.element.style.setProperty(`--mx-safe-${side}`, `${safe[side]}px`);
    }
    if (message.action === 'exitTable' || (message.action === 'syncToken' && p.token === '')) {
      this.restoring=undefined;
      try{sessionStorage.removeItem(this.resumeKey);}catch{}
      this.game.leave();
      return;
    }
    if (message.action === 'enterMtt') {
      const info = p.matchInfo as Record<string, unknown> | undefined;
      const matchID = Number(p.matchId), roomID = Number(p.roomId ?? 0);
      if (!Number.isSafeInteger(matchID) || matchID <= 0 || !Number.isSafeInteger(roomID) || roomID < 0 || !this.token) {
        this.toast('赛事入桌参数不完整'); return;
      }
      const current=this.game.getState();
      if(current.target?.matchID===matchID&&['loading','entering','table'].includes(current.phase)&&(roomID===0||current.target.roomID===roomID))return;
      void this.game.enter({roomID, matchID, roomType:Number(info?.type ?? 512), observer:!!p.isLookOn, clubID:this.currentClubID || Number(info?.club_id ?? 0)});
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
      this.guest?.entering(roomID);
      void this.game.enter({ roomID, roomType, matchID: 0, clubID, observer: false });
    } catch (error) {
      this.toast(error instanceof Error ? error.message : '入桌参数错误');
    }
  }
  private toast(message: string): void {
    this.transport.send('showToast', { type: 'fail', message });
  }
  destroy(): void {
    this.guest?.cancel();
    this.disposed=true;
    this.off();
    this.token = '';
    this.currentClubID = 0;
  }
}
