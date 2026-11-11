import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import type { ReplayHandData } from './ReplayHandData.js';
export class TexasGameRoomDataReplay extends EventSource {
  static readonly CHANGE = 'REPLAY_DATA_CHANGE';
  @observable(TexasGameRoomDataReplay.CHANGE) current: ReplayHandData | null = null;
  pendingHandNum = -1;
  private cache = new Map<number, ReplayHandData>();
  getCached(hand: number): ReplayHandData | undefined { return this.cache.get(hand); }
  applyReplay(data: ReplayHandData): void {
    if (!data?.s || !Number.isInteger(data.s.hand) || data.s.hand < 1) throw new Error('Invalid replay hand');
    this.cache.set(data.s.hand, data);
    if (data.s.hand === this.pendingHandNum) { this.pendingHandNum = -1; this.current = {...data}; }
  }
  setCollected(hand:number,collected:boolean):void {
    const cached=this.cache.get(hand);
    if(cached)this.cache.set(hand,{...cached,collected});
  }
  applyEmpty(): void { this.pendingHandNum = -1; this.current = null; }
  clearData(): void { this.cache.clear(); this.pendingHandNum = -1; this.current = null; }
    public mergeWatchedHands(handNum: number, hands: { user_rid: number; data: string }[]) {
        const cached = structuredClone(this.cache.get(handNum));
        if (!cached || !hands || hands.length === 0) return;
        if (!cached.be_watched_user_hands) {
            cached.be_watched_user_hands = [];
        }
        for (const hand of hands) {
            const existing = cached.be_watched_user_hands.find(h => h.user_rid === hand.user_rid);
            if (existing) {
                existing.data = hand.data;
            } else {
                cached.be_watched_user_hands.push({ user_rid: hand.user_rid, data: hand.data });
            }
        }
        this.cache.set(handNum,cached);
        if(this.current?.s.hand===handNum)this.current=cached;
    }

    /** 合并发发看回包的公共牌到缓存,双写并重发数据事件 */
    public mergeViewedPublicCards(handNum: number, viewData: { pub_cards?: string; pub_cards2?: string }) {
        const cached = structuredClone(this.cache.get(handNum));
        if (!cached || !viewData) return;
        if (viewData.pub_cards) cached.pub_cards = this._mergeViewedCardString(cached.pub_cards, viewData.pub_cards);
        if (viewData.pub_cards2) cached.pub_cards2 = this._mergeViewedCardString(cached.pub_cards2, viewData.pub_cards2);
        this.cache.set(handNum,cached);
        if(this.current?.s.hand===handNum)this.current=cached;
    }

    private _mergeViewedCardString(cachedCards: string | undefined, viewedCards: string): string {
        const cards = cachedCards ? cachedCards.split(',') : [];
        while (cards.length < 5) cards.push('0');
        const viewed = viewedCards.split(',').filter(card => Number(card) > 0);
        let viewedIndex = 0;
        for (let i = 0; i < 5 && viewedIndex < viewed.length; i++) {
            if (Number(cards[i]) !== 0) continue;
            cards[i] = viewed[viewedIndex++]!;
        }
        return cards.slice(0, 5).join(',');
    }

}
