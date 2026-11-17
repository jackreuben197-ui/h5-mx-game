/** Renderer-independent API. All coordinates are CSS viewport pixels. */
export type SeatEffect = 'win' | 'allin-self' | 'allin-other';
export interface EffectAnchor {
  x: number; y: number; scale: number; opacity: number;
  /** Override the distance above the anchor in viewport pixels. */
  lift?: number;
}
export interface SeatEffects {
  play(key: string, effect: SeatEffect, anchor: () => EffectAnchor): Promise<boolean>;
  stop(key: string): void;
}
