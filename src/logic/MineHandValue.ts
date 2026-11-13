import type { TableSnapshot } from '../core/types.js';
import { getMaxHandValueByPokeType } from './poker/PokerUtil.js';
import { InnerPokerType } from './poker/PoerkCard.js';
import { handCardCount } from './HandCardCount.js';

/** CC TexasGameRoomDataPlayerMine.caculateHandValueTypeAndHighlight. */
export function mineHandValue(table: TableSnapshot) {
  const mine = table.players.find(player => player.seat === table.mySeat);
  const community = table.community;
  if (!mine || mine.folded || table.handEnded || mine.cards.length !== handCardCount(table.gameType ?? 0) ||
      community.length < 3 || community.length > 5 ||
      [...mine.cards, ...community].some(card => card <= 0)) return;
  const type = table.pokerType === 2 ? InnerPokerType.InnerPokerTypeSixPlusFix
    : table.pokerType === 1 ? InnerPokerType.InnerPokerTypeSixPlus : InnerPokerType.InnerPokerTypeStandard;
  return getMaxHandValueByPokeType([...community], [...mine.cards], type);
}
export function mineHandValueType(table: TableSnapshot): number | undefined {
  return mineHandValue(table)?.handValueType;
}
