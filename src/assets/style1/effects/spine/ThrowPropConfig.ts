export interface Clip { spine: string; animation: string; sound?: string; loop?: boolean; }
const clip = (spine: string, animation: string, sound?: string): Clip => ({spine, animation, sound});
/** Original CC ThrowPropManager clip paths and animation names. */
export const THROW_PROP_EFFECTS: Record<number, Record<string, Clip>> = {
  600: {hit:clip('expressionTomato/skeleton','1','sfx_tomato_mus')},
  601: {hit:clip('expressionFlower/skeleton','animation','sfx_rose_mus')},
  602: {hit:clip('expressionKiss/kiss','1','sfx_kiss_mus')},
  603: {hit:clip('expressionGood/skeleton','animation','sfx_like_mus')},
  604: {screen:clip('expressionBeerScreen/cheers_1','1','sfx_beer_screen'),seatScreen:clip('expressionBeer/cheers_2','3'),seat:clip('expressionBeer/cheers_2','2','sfx_cheers_mus')},
  605: {hit:{...clip('expressionTouch/touch','animation','sfx_touch_mus'),loop:true}},
  606: {sender:clip('expressionShark/shark','shark_set','sfx_shark_mus'),receiver:clip('expressionShark/shark','shark_receive')},
  607: {hand:clip('expressionChicken/chicken_spine','chicken_set','sfx_zhuaji_mus'),receiver:clip('expressionChicken/chicken_spine','chicken_receive')},
  608: {senderScreen:clip('expressionBoxScreen/box_full','box_full_1','sfx_boxing_sender1'),senderHit:clip('expressionBox/box_local','box_local_1','sfx_boxing_sender2'),receiverPunch:clip('expressionBox/box_local','box_local_2','sfx_boxing_beaten1'),receiverScreen:clip('expressionBoxScreen/box_full','box_full_2','sfx_boxing_beaten2')},
  609: {receiver:clip('expressionMoney/attachments','attachments_1_receive','sfx_money')},
  610: {senderScreen:clip('expressionFishScreenSender/sy2','sy2','sfx_fish2'),receiverScreen:clip('expressionFishScreenReceiver/sy','sy','sfx_fish'),fishSwim:{...clip('expressionFish/sy3','sy3_1','sfx_fish'),loop:true},fishExit:clip('expressionFish/sy3','sy3_2',undefined),splash:clip('expressionFish/sy3','bl'),waveSender:clip('expressionFishWave/hl','hl1',undefined),waveReceiver:clip('expressionFishWave/hl','hl2',undefined),waveOther:clip('expressionFishWave/hl','hl3',undefined)},
  611: {senderStart:clip('expressionBaseballSender/skeleton','1','sfx_baseball'),senderFly:clip('expressionBaseballSender/skeleton','2',undefined),senderHit:clip('expressionBaseballSender/skeleton','3',undefined),receiverStart:clip('expressionBaseballReceiver/ballfolder1','1','sfx_baseball'),receiverFly:clip('expressionBaseballReceiver/ballfolder1','2',undefined),receiverHit:clip('expressionBaseballReceiver/ballfolder1','3',undefined),otherStart:clip('expressionBaseballOther/skeleton','1','sfx_baseball'),otherFly:clip('expressionBaseballOther/skeleton','2',undefined),otherHit:clip('expressionBaseballOther/skeleton','3',undefined),otherExit:clip('expressionBaseballOther/skeleton','4',undefined)},
};
