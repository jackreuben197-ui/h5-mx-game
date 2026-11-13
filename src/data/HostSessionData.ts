/** Login context is memory-only. Never include token in snapshots, logs or errors. */
export class HostSessionData {
  token = '';
  userID = 0;
  userRID = 0;
  nickname = '';
  avatar = '';
  sex = 0;
  private roomLogos = new Map<number, string>();
  private roomPrologues = new Map<number, string>();
  roomPrologue(clubID: number): string | undefined { return this.roomPrologues.get(clubID); }
  roomLogo(clubID: number): string { return this.roomLogos.get(clubID) ?? ''; }
  update(action: string, payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const p = payload as Record<string, unknown>;
    if (['enterTable', 'enterMtt', 'h5Ready', 'syncToken'].includes(action) && typeof p.token === 'string')
      this.token = p.token;
    if (action === 'syncUser') {
      this.userID = Number(p.uid) || 0;
      this.userRID = Number(p.randomId) || 0;
      this.nickname = String(p.nickname ?? '');
      this.avatar = String(p.avatar ?? '');
      this.sex = Number(p.sex) || 0;
    }
    if (action === 'syncUserClub') {
      const response = p.response as { data?: unknown } | undefined;
      if (!Array.isArray(response?.data)) return;
      this.roomLogos.clear();
      this.roomPrologues.clear();
      for (const value of response.data) {
        if (!value || typeof value !== 'object') continue;
        const club = value as Record<string, unknown>;
        const id = Number(club.club_id), logo = club.room_logo;
        if (id > 0 && typeof club.prologue === 'string') this.roomPrologues.set(id, Number(club.prologue_switch) === 2 ? '' : club.prologue);
        if (Number.isSafeInteger(id) && id > 0 && typeof logo === 'string' && logo.trim())
          this.roomLogos.set(id, logo.trim());
      }
    }
  }
  clear(): void {
    this.token = '';
    this.userID = 0;
    this.userRID = 0;
    this.nickname = '';
    this.avatar = '';
    this.sex = 0;
    this.roomLogos.clear();
    this.roomPrologues.clear();
  }
}
