/** Login context is memory-only. Never include token in snapshots, logs or errors. */
export class HostSessionData {
  token = '';
  userID = 0;
  userRID = 0;
  nickname = '';
  avatar = '';
  sex = 0;
  update(action: string, payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const p = payload as Record<string, unknown>;
    if (['enterTable', 'h5Ready', 'syncToken'].includes(action) && typeof p.token === 'string')
      this.token = p.token;
    if (action === 'syncUser') {
      this.userID = Number(p.uid) || 0;
      this.userRID = Number(p.randomId) || 0;
      this.nickname = String(p.nickname ?? '');
      this.avatar = String(p.avatar ?? '');
      this.sex = Number(p.sex) || 0;
    }
  }
  clear(): void {
    this.token = '';
    this.userID = 0;
    this.userRID = 0;
    this.nickname = '';
    this.avatar = '';
    this.sex = 0;
  }
}
