export interface CardEmphasis {
  highlight?: readonly number[];
  /** undefined: leave normal; []: gray every card, matching CC popupCards([]). */
  popup?: readonly number[];
}
export interface SeatSettlement {
  cards: CardEmphasis;
  win?: { handValueType: number; collectedChips: number };
}
export interface Settlement {
  handNum: number;
  seats: Record<number, SeatSettlement>;
  community: CardEmphasis;
}
