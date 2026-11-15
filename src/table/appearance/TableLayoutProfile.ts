import type { TableLayoutId } from '../../data/TexasGamePersonalSettings.js';
type Point=readonly [number,number];
export interface TableLayoutProfile {
  id: TableLayoutId; width: number; height: number; avatar: number;
  anchors: Readonly<Record<number,readonly Point[]>>;
  boardY: number; infoY: number; potY: number; heroCardsY: number;
  avatarRadius: string;
}
// CC 0eb440c TableLayoutProfile: classic 440 × 782, ordered from the local bottom seat.
const hero:Point=[220,683],top:Point=[220,98],tl:Point=[169,98],tr:Point=[271,98];
const lh:Point=[30,163],rh:Point=[410,163],lu:Point=[30,238],ru:Point=[410,238];
const lm:Point=[30,340],rm:Point=[410,340],ll:Point=[30,517],rl:Point=[410,517];
const classic: TableLayoutProfile={id:'classic',width:440,height:782,avatar:58,boardY:267.3,infoY:365,potY:414,heroCardsY:-75,avatarRadius:'50%',anchors:{
  2:[hero,top],3:[hero,lu,ru],4:[hero,lm,top,rm],5:[hero,lm,tl,tr,rm],
  6:[hero,ll,lu,top,ru,rl],7:[hero,ll,lu,tl,tr,ru,rl],8:[hero,ll,lm,lh,top,rh,rm,rl],9:[hero,ll,lm,lh,tl,tr,rh,rm,rl],
}};
// Figma Table page: balanced 12026:55632 and competitive oval exported 440 × 782 viewports.
const ringY:Record<number,number>={683:596,98:154,163:214,238:214,340:324,517:432};
const ringAnchors=Object.fromEntries(Object.entries(classic.anchors).map(([count,points])=>[count,points.map(([x,y])=>[x,ringY[y]!] as Point)]));
export const tableLayouts: Record<Exclude<TableLayoutId,'original'>,TableLayoutProfile>={
 classic,
 balanced:{...classic,id:'balanced',avatar:60,boardY:367,infoY:464,potY:240,heroCardsY:63,avatarRadius:'28%',anchors:ringAnchors},
 oval:{...classic,id:'oval',avatar:50,boardY:367,infoY:464,potY:240,heroCardsY:63,avatarRadius:'50%',anchors:ringAnchors},
};
