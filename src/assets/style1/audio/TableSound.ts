import { MediaElementSegment } from '../media/MediaElementSegment.js';
import type { MediaRule } from './MediaRule.js';
import config from './TableSound/config.json';
import { AudioSpritePlayer } from './AudioSpritePlayer.js';
import type { TableSnapshot } from '../../../core/types.js';
/** Native audio only. Sound stays outside protocol/data and never blocks entry. */
export class TableSound {
  readonly root = document.createElement('div');
  enabled = false;
  private clips=new AudioSpritePlayer();
  private previous?: TableSnapshot;
  private bgm?: HTMLAudioElement;
  private bgmSegment?: MediaElementSegment;
  private effects = new Set<HTMLAudioElement>();
  private disposed = false;
  private urls?: typeof import('./assets.js');
  private generation = 0;
  private turnTimer?:ReturnType<typeof setInterval>;
  private timerKey='';
  private lastRemaining=Infinity;
  private visibility = () => { if (document.hidden) this.stop(); else if (this.enabled) void this.music(); };
  constructor() { this.root.hidden = true; document.addEventListener('visibilitychange', this.visibility); }
  async setEnabled(value: boolean): Promise<void> {
    this.enabled = value; this.generation++;
    if (!value) { this.stop(); return; }
    this.clips.unlock();
    for(const [key,rule] of Object.entries(config.media))if(key!=='bgm'&&rule.preload==='auto')this.clips.preload(config.paths[key as keyof typeof config.paths]);
    await this.music();
  }
  private async music(): Promise<void> {
    const urls = this.urls ??= await import('./assets.js');
    if (this.disposed || !this.enabled || document.hidden) return;
    if (!this.bgm) {
      this.bgm = new Audio(urls.bgm); this.bgmSegment=new MediaElementSegment(this.bgm,config.media.bgm as MediaRule); this.bgm.dataset.kind = "bgm"; this.root.append(this.bgm);
    }
    try { await this.bgm.play(); } catch { /* A later user gesture can retry. */ }
  }
  private async effect(key: 'deal' | 'fold' | 'check' | 'chips' | 'allin' | 'turn' | 'alert' | 'three'): Promise<void> {
    if (!this.enabled || document.hidden) return;
    this.clips.play(config.paths[key],config.media[key]);
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
    const timer=state.actions.length?state.countdowns?.find(v=>v.seat===state.mySeat):undefined;
    const key=timer?`${state.roomID}:${state.handNum}:${timer.deadline}`:'';
    if(key!==this.timerKey){
      if(this.turnTimer)clearInterval(this.turnTimer);
      this.turnTimer=undefined;this.timerKey=key;this.lastRemaining=Infinity;
      if(timer){
        const tick=()=>{
          const left=Math.ceil(timer.deadline-Date.now()/1000);
          if(left<=0){if(this.turnTimer)clearInterval(this.turnTimer);this.turnTimer=undefined;return;}
          if(left<=Math.floor(timer.totalTime/3)&&this.lastRemaining>Math.floor(timer.totalTime/3))void this.effect('alert');
          if(left<=3&&this.lastRemaining>3)void this.effect('three');
          this.lastRemaining=left;
        };
        tick();this.turnTimer=setInterval(tick,250);
      }
    }
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
    this.clips.stop();
    this.bgm?.pause();
    this.effects.forEach(a => { a.pause(); a.removeAttribute('src'); a.remove(); }); this.effects.clear();
  }
  destroy(): void {
    if(this.turnTimer)clearInterval(this.turnTimer);
    this.disposed = true; this.generation++; this.stop();this.clips.destroy();
    this.bgmSegment?.destroy();
    this.bgm?.removeAttribute('src'); this.root.remove(); this.previous = undefined;
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
