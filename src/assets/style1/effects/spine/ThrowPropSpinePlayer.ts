import type { EmojiSpineRenderer, EmojiAnchor } from './EmojiSpineRenderer.js';
import { EmojiSpineAssets } from './EmojiSpineAssets.js';
import type { TableSound } from '../../audio/TableSound.js';
import type { ThrowPropBroadcastData } from '../../../../data/TexasGameRoomDataEmoji.js';
import type { MagicEmojiDefinition } from '../../../../logic/MagicEmojiConfig.js';

import { THROW_PROP_EFFECTS } from './ThrowPropConfig.js';
type Place = 'sender' | 'receiver' | 'screen';

/** Plays CC's exported skeletons on the table's existing transparent WebGL layer. */
export class ThrowPropSpinePlayer {
  private serial = 0;
  private keys = new Set<string>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private sounds = new Set<() => void>();
  private dead = false;
  constructor(private renderer: EmojiSpineRenderer, private sound: TableSound,
    private anchor: (userRID: number) => EmojiAnchor | null, private screen: () => EmojiAnchor | null,
    private ownRID: number, private fail: (error: unknown) => void) {}

  play(data: ThrowPropBroadcastData): void { void this.preloadAndPlay(data); }
  private async preloadAndPlay(data: ThrowPropBroadcastData): Promise<void> {
    const c = THROW_PROP_EFFECTS[data.type]; if (!c || this.dead) return;
    try {
      await Promise.all([...new Set(Object.values(c).map(item => item.spine))].map(spine =>
        EmojiSpineAssets.load({propCode:'throw',type:data.type,spine:`dynamic/prop/anim/${spine}`,animation:'',sound:'',assetGroup:'prop'})));
    } catch (error) { if (!this.dead) this.fail(error); return; }
    if (this.dead || !this.anchor(data.userID) || !this.anchor(data.targetUserID)) return;
    const id = ++this.serial, role = data.userID === this.ownRID ? 'sender' : data.targetUserID === this.ownRID ? 'receiver' : 'bystander';
    const place = (where: Place) => where === 'screen' ? this.screen() : this.anchor(where === 'sender' ? data.userID : data.targetUserID);
    const run = (name: string, where: Place, delay = 0, duration?: number, moveTo?: Place, moveMs = 0, after?: () => void) => {
      const item = c[name]; if (!item) return;
      this.later(async () => {
        if (this.dead || !place(where)) return;
        const key = `prop-${id}-${name}-${where}`; this.keys.add(key);
        let started = 0;
        const config: MagicEmojiDefinition = {propCode:'throw',type:data.type,spine:`dynamic/prop/anim/${item.spine}`,animation:item.animation,sound:'',assetGroup:'prop'};
        try {
          const played = await this.renderer.play(key,config,() => {
            const a = place(where), b = moveTo ? place(moveTo) : null;
            if (!a || (moveTo && !b)) return null;
            if (!started) started = performance.now();
            const progress = b && moveMs > 0 ? Math.min(1,(performance.now()-started)/moveMs) : 0;
            const eased = progress * progress * (3 - 2 * progress);
            return {x:a.x+(b ? (b.x-a.x)*eased : 0),y:a.y+(b ? (b.y-a.y)*eased : 0),scale:a.scale};
          },!!item.loop,false,finished => { this.keys.delete(key); if (finished && !this.dead) after?.(); });
          if (played && item.sound && !this.dead) {
            const stop = this.sound.playExternalEffect(EmojiSpineAssets.url(`audio/prop/${item.sound}.ogg`));
            this.sounds.add(stop);
          }
          if (played && (item.loop || duration)) this.later(() => this.renderer.stop(key),duration ?? 3000);
        } catch (error) { this.keys.delete(key); if (!this.dead) this.fail(error); }
      },delay);
    };
    if (data.type >= 600 && data.type <= 603 || data.type === 605) { run('hit','receiver',500,data.type === 605 ? 3000 : undefined); return; }
    if (data.type === 606) {run('sender','sender');run('receiver','receiver');return;}
    if (data.type === 607) {run('hand','sender',0,undefined,'receiver',500);run('receiver','receiver',450);return;}
    if (data.type === 609) {run('receiver','receiver');return;}
    if (data.type === 604) {
      if (role === 'bystander') {run('seat','sender');run('seat','receiver');}
      else {run('screen','screen');run('seatScreen','sender');run('seatScreen','receiver');}
      return;
    }
    if (data.type === 608) {
      if (role === 'sender') run('senderScreen','screen',0,undefined,undefined,0,() => run('senderHit','receiver'));
      else if (role === 'receiver') run('receiverPunch','sender',0,undefined,undefined,0,() => run('receiverScreen','screen'));
      else run('receiverPunch','sender',0,undefined,undefined,0,() => run('senderHit','receiver'));
      return;
    }
    if (data.type === 610) {
      if (role === 'sender') {run('senderScreen','screen');run('waveSender','screen');}
      else if (role === 'receiver') {run('receiverScreen','screen');run('waveReceiver','screen');}
      else {run('fishSwim','sender',0,2000,'receiver',2000);run('fishExit','receiver',2000);run('splash','receiver',2200);run('waveOther','screen');}
      return;
    }
    if (data.type === 611) {
      const prefix = role === 'bystander' ? 'other' : role;
      run(`${prefix}Start`,'sender');run(`${prefix}Fly`,'sender',950,350,'receiver',333);run(`${prefix}Hit`,'receiver',1300);
      if (role === 'bystander') run('otherExit','receiver',2300);
    }
  }
  private later(action: () => void, ms: number): void {
    const timer = setTimeout(() => {this.timers.delete(timer);if (!this.dead) action();},ms);
    this.timers.add(timer);
  }
  destroy(): void {
    this.dead = true; this.timers.forEach(clearTimeout); this.timers.clear();
    this.keys.forEach(key => this.renderer.stop(key)); this.keys.clear();
    this.sounds.forEach(stop => stop()); this.sounds.clear();
  }
}
