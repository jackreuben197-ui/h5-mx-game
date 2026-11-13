/** CC TexasGameRoomDataBasic.roomType: Holdem / Omaha 4, 5, 6. */
export function handCardCount(gameType: number): number {
  switch (gameType) {
    case 1: return 4;
    case 2: return 5;
    case 3: return 6;
    default: return 2;
  }
}
