import type { RoomRecord, RoomInfo, HandInfo } from '@silenthill/agreement-web';
/** CC TexasGameplayEntrance + EnterRoom: same basicInfo names and flag semantics. */
export class GameplayTableSettingBasic {
  static from(record: RoomRecord.AsObject, info: RoomInfo.AsObject, hand?: HandInfo.AsObject) {
    const sub = record.subConfigsList ?? [];
    const critical = sub.find(v => v.criticalHit > 0);
    let randomAnte: number[] = [];
    try { const value: unknown = JSON.parse(info.randomAnte || record.randomAnte || '[]');
      if (Array.isArray(value) && value.every(v => typeof v === 'number' && Number.isFinite(v))) randomAnte = value;
    } catch { /* Old protocol may omit randomAnte. */ }
    return {
      roomName:record.name, gameType:record.gameType, pokerType:record.pokerType,
      sbante:{sb:info.smallBlind,ante:info.ante}, curMinRate:info.currentMinRate, curMaxRate:info.currentMaxRate,
      hasBombPot:record.bombpot > 0 || sub.some(v => v.bombpot > 0),
      jackpot:record.jackpot === 1, jackpotConfig:record.jackpotConfig,
      bringinEqualLeaderPercent:record.bringinEqualLeader, minPlayerChipRate:record.minPlayerChipRate,
      maxBringinTotalRate:record.maxBringinTotalRate,
      hasCriticalHit:!!critical || record.criticalHit > 0,
      criticalHitRounds:critical?.rounds ?? record.rounds,
      criticalHitAnte:critical?.ante ?? record.ante,
      randomAnte, autoChangeTableLimitHand:info.autoChangeRoomLimitHand,
      isAutoChangeTable:info.autoChangeRoomLimitHand > 0, encryptCards:record.encryptCards > 0,
      squidStatusEnabled:!!hand?.inSquid, squidPlayerCountLimit:sub.find(v=>v.squidBase>0)?.playingPlayerCountLimit??record.squidPlayerCount,
      squidStatusRounds:hand?.conRounds ?? 0, squidBase:sub.find(v=>v.squidBase>0)?.squidBase??record.squidBase, squidMax:record.squidMax,
      squidMostGet:record.squidMostGet > 0, squidBetGet:record.squidBetGet > 0,
      squidHead:record.squidHead > 0, squidTail:record.squidTail > 0,
      hasMushroom:record.mushroomBase > 0, mushroomBase:record.mushroomBase, mushroomMode:record.mushroomMode,
      limitIP:info.limitIp, limitGPS:info.limitGps, antiCheatType:info.antiCheatType,
      seatedMessage:info.seatedMessaging, forceShowCard:record.forceShowCard === 1,
      randomSeated:record.randomSeat === 1, delaySeeCard:info.delaySeeCard, onlyIOS:record.onlyIos === 1,
      hcPoolRate:record.hcPoolRate, hasCallTime:record.calltime === 1,
      callTimeWinline:record.calltimeWinLine, callTimeLimit:record.calltimeLimit,
      insuranceMode:info.insuranceMode, hasInsurance:record.insuranceOn > 0,
      secondPcsOn:record.secondPcsOn > 0, viewPlayerCards:record.viewPlayerCards,
      chatType:record.chatType, straddle:info.straddle, straddleMax:record.straddleMax,
    };
  }
}
export type TableSettingBasic = ReturnType<typeof GameplayTableSettingBasic.from>;
