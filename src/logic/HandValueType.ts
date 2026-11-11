import { i18nMgr } from '../i18n/i18nMgr.js';
// From CC core/poker/PoerkCard.ts; no client hand evaluation.
export enum HandValueType {
    HVHighPokerCard = 1, // 高牌
    HVOnePair, // 一对
    HVTwoPair, // 两对
    HVThreeOfAKind, // 三条
    HVStraight, // 顺子
    HVFlush, // 同花
    HVFullHouse, // 葫芦
    HVFourOfAKind, // 四条
    HVStraightFlush, // 同花顺
    HVRoyalFlush // 皇家同花顺
}

export const HandValueTypeStringMap: Record<HandValueType, string> = {
    [HandValueType.HVHighPokerCard]: '高牌',
    [HandValueType.HVOnePair]: '一对',
    [HandValueType.HVTwoPair]: '两对',
    [HandValueType.HVThreeOfAKind]: '三条',
    [HandValueType.HVStraight]: '顺子',
    [HandValueType.HVFlush]: '同花',
    [HandValueType.HVFullHouse]: '葫芦',
    [HandValueType.HVFourOfAKind]: '四条',
    [HandValueType.HVStraightFlush]: '同花顺',
    [HandValueType.HVRoyalFlush]: '皇家同花顺'
};

export function handValueTypeToString(type: HandValueType): string {
    const key = 'adaptation' + (10063 - type);
    return i18nMgr.Get(key, [], HandValueTypeStringMap[type]);
}

