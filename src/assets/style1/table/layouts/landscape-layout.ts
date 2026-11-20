import desktop from './desktop.json' with {type:'json'};
/** Figma PC anchors stretched within the full frame; server seat IDs are unchanged. */
export type Edge = 'bottom' | 'left' | 'top' | 'right';
export interface LandscapeSeat {
  x: number;
  y: number;
  scale: number;
  edge: Edge;
}
const arrangements: Record<number, readonly [number, number, number]> = {
  // Same clockwise occupancy as CC SeatPositionCaculator: left, top, right.
  2: [0, 1, 0], 3: [1, 0, 1], 4: [1, 1, 1], 5: [2, 0, 2],
  6: [2, 1, 2], 7: [2, 2, 2], 8: [3, 1, 3], 9: [3, 2, 3],
};
export const desktopScale=(width:number,height:number):number=>Math.min(1,width/desktop.designWidth,height/desktop.designHeight);
export function landscapeLayout(width: number, height: number, count: number): LandscapeSeat[] {
  const arrangement = arrangements[count];
  if (!arrangement || width <= 0 || height <= 0) throw new Error('Unsupported table layout');
  const [left, top, right] = arrangement;
  const scale=desktopScale(width,height),sx=width/desktop.designWidth,sy=height/desktop.designHeight;
  const result: LandscapeSeat[] = [];
  const add = (edge: Edge, x: number, y: number) => result.push({ edge, x, y, scale });
  add('bottom', desktop.hero[0]!*sx, desktop.hero[1]!*sy);
  for (let i = 0; i < left; i++)
    add('left', desktop.leftX*sx, desktop.leftRows[left===1?1:left===2?i*2:i]!*sy);
  for (let i = 0; i < top; i++)
    add('top', desktop.top[0]!*sx+(i-(top-1)/2)*desktop.topPairGap*sx, desktop.top[1]!*sy);
  for (let i = 0; i < right; i++)
    add('right', desktop.rightX*sx, desktop.rightRows[right===1?1:right===2?i*2:i]!*sy);
  return result;
}
