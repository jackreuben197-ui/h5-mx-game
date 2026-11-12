import type { TableSnapshot } from '../core/types.js';
import { getMaxHandValueByPokeType } from './poker/PokerUtil.js';
import { InnerPokerType } from './poker/PoerkCard.js';

/** CC TexasGameRoomDataPlayerMine.caculateHandValueTypeAndHighlight. */
export function mineHandValueType(table: TableSnapshot): number | undefined {
  const mine = table.players.find(player => player.seat === table.mySeat);
  const community = table.community;
  if (!mine || mine.folded || table.handEnded || mine.cards.length !== 2 ||
      community.length < 3 || community.length > 5 ||
      [...mine.cards, ...community].some(card => card <= 0)) return;
  return getMaxHandValueByPokeType([...community], [...mine.cards], InnerPokerType.InnerPokerTypeStandard).handValueType;
}
