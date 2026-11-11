import type { TableSnapshot } from '../core/types.js';
/** Native audio only. Sound stays outside protocol/data and never blocks entry. */
export class TableSound {
  readonly root = document.createElement('div');
  enabled = false;
  private previous?: TableSnapshot;
  private bgm?: HTMLAudioElement;
  private effects = new Set<HTMLAudioElement>();
  private disposed = false;
  private urls?: typeof import('./assets.js');
  private generation = 0;
  private visibility = () => { if (document.hidden) this.stop(); else if (this.enabled) void this.music(); };
  constructor() { this.root.hidden = true; document.addEventListener('visibilitychange', this.visibility); }
  async setEnabled(value: boolean): Promise<void> {
    this.enabled = value; this.generation++;
    if (!value) { this.stop(); return; }
    await this.music();
  }
  private async music(): Promise<void> {
    const urls = this.urls ??= await import('./assets.js');
    if (this.disposed || !this.enabled || document.hidden) return;
    if (!this.bgm) {
      this.bgm = new Audio(urls.bgm); this.bgm.loop = true; this.bgm.volume = 0.3; this.bgm.dataset.kind = "bgm"; this.root.append(this.bgm);
    }
    try { await this.bgm.play(); } catch { /* A later user gesture can retry. */ }
  }
  private async effect(key: 'deal' | 'fold' | 'check' | 'chips' | 'allin' | 'turn'): Promise<void> {
    if (!this.enabled || document.hidden) return;
    const generation = this.generation;
    const urls = this.urls ??= await import('./assets.js');
    if (this.disposed || !this.enabled || generation !== this.generation || document.hidden) return;
    const audio = new Audio(urls[key]);
    this.effects.add(audio); this.root.append(audio); audio.dataset.kind = key;
    const clean = () => { this.effects.delete(audio); audio.removeAttribute('src'); audio.remove(); };
    audio.onended = clean; audio.onerror = clean;
    try { await audio.play(); } catch { clean(); }
  }
  /** Room effects use the same mute/visibility lifecycle as table sound. */
  playExternalEffect(url: string): () => void {
    if (this.disposed || !this.enabled || document.hidden) return () => {};
    const audio = new Audio(url);
    const stop = () => { audio.pause(); audio.removeAttribute('src'); audio.remove(); this.effects.delete(audio); };
    audio.onended = stop; audio.onerror = stop;
    this.effects.add(audio); this.root.append(audio);
    void audio.play().catch(stop);
    return stop;
  }
  present(state: TableSnapshot): void {
    const old = this.previous; this.previous = state;
    if (!old || state.presentation === 'sync') return;
    if (state.presentation === 'deal' && old.handNum !== state.handNum) void this.effect('deal');
    if (state.community.length > old.community.length) void this.effect('deal');
    for (const p of state.players) {
      const before = old.players.find(v => v.seat === p.seat);
      if (!before || before.action === p.action) continue;
      if (p.action === '弃牌') void this.effect('fold');
      else if (p.action === '过牌') void this.effect('check');
      else if (p.action === '全下') void this.effect('allin');
      else if (['下注','跟注','加注'].includes(p.action)) void this.effect('chips');
    }
    if (state.betting && state.betting.id !== old.betting?.id) void this.effect('turn');
  }
  private stop(): void {
    this.bgm?.pause();
    this.effects.forEach(a => { a.pause(); a.removeAttribute('src'); a.remove(); }); this.effects.clear();
  }
  destroy(): void {
    this.disposed = true; this.generation++; this.stop();
    this.bgm?.removeAttribute('src'); this.root.remove(); this.previous = undefined;
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
