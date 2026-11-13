import type { ServerMessagePublicCards } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function PublicCards(body: ServerMessagePublicCards.AsObject, context: MessageContext): boolean {
  const hand = context.state.handInfo;
  if (!hand) throw new Error('公共牌消息缺少牌局基础数据');
  const { Round, GameStatus, Action } = context.pb.Def;
  const round = body.rnd;
  const before =
    round === Round.FLOP ? 0 : round === Round.TURN ? 3 : round === Round.RIVER ? 4 : -1;
  const count = round === Round.FLOP ? 3 : 1;
  const current = hand.publicCardsList;
  // A repeated round notification must not append duplicate cards or replay its animation.
  if (
    before >= 0 &&
    current.length === before + count &&
    body.publicCardsArrayList.length === count &&
    body.publicCardsArrayList.every((v, i) => current[before + i] === v)
  )
    return context.allInWinPercent(body.allinUsersList);
  const combined = [...current, ...body.publicCardsArrayList];
  if (
    before < 0 ||
    current.length !== before ||
    body.publicCardsArrayList.length !== count ||
    combined.some((v) => v <= 0) ||
    new Set(combined).size !== combined.length
  )
    throw new Error('公共牌增量不连续，需要同步');
  context.data.secondPcs.finish();
  context.data.insurance.finish();
  hand.publicCardsList = combined;
  if (body.publicCardsArray2List.length)
    hand.secondPublicCardsList = [...body.publicCardsArray2List];
  else if (body.extPublicCardsArrayList.length)
    hand.secondPublicCardsList = [
      ...combined.slice(0, 5 - body.extPublicCardsArrayList.length),
      ...body.extPublicCardsArrayList,
    ];
  hand.roundBet = 0;
  context.state.gameStatus =
    round === Round.FLOP
      ? GameStatus.HAND_FLOP
      : round === Round.TURN
        ? GameStatus.HAND_TURN
        : GameStatus.HAND_RIVER;
  for (const player of context.state.playersList) {
    player.roundBet = 0;
    player.roundActioned = false;
    if (player.action !== Action.FOLD && player.action !== Action.ALLIN)
      player.action = Action.NONE;
  }
  context.allInWinPercent(body.allinUsersList);
  context.operators(body.nextOperator);
  return true;
}
