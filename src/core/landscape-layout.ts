/** Clockwise display slots from the hero at bottom-center; never changes server seat IDs. */
export type Edge = 'bottom' | 'left' | 'top' | 'right';
export interface LandscapeSeat {
  x: number;
  y: number;
  scale: number;
  edge: Edge;
}
const arrangements: Record<number, readonly [number, number, number, number]> = {
  // left, top, right, bottom
  2: [0, 1, 0, 1],
  3: [0, 2, 0, 1],
  4: [1, 1, 1, 1],
  5: [1, 2, 1, 1],
  6: [2, 1, 2, 1],
  7: [2, 2, 2, 1],
  8: [2, 3, 2, 1],
  9: [2, 2, 2, 3],
};
export function landscapeLayout(width: number, height: number, count: number): LandscapeSeat[] {
  const arrangement = arrangements[count];
  if (!arrangement || width <= 0 || height <= 0) throw new Error('Unsupported table layout');
  const [left, top, right, bottom] = arrangement;
  const scale = Math.min(1, width / 1900, height / 1440);
  const center = width / 2,
    sideX = 120 * scale + 24;
  const topY = 145 * scale + 40,
    bottomY = height - 190 * scale - 24;
  const lowerOffset = Math.max(450 * scale, width * 0.27);
  const result: LandscapeSeat[] = [];
  const add = (edge: Edge, x: number, y: number) => result.push({ edge, x, y, scale });
  add('bottom', center, bottomY);
  if (bottom === 3) add('bottom', center - lowerOffset, bottomY);
  for (let i = 0; i < left; i++)
    add('left', sideX, height * (left === 1 ? 0.53 : i === 0 ? 0.63 : 0.39));
  for (let i = 0; i < top; i++)
    add('top', center + (i - (top - 1) / 2) * width * (top === 3 ? 0.22 : 0.34), topY);
  for (let i = 0; i < right; i++)
    add('right', width - sideX, height * (right === 1 ? 0.53 : i === 0 ? 0.39 : 0.63));
  if (bottom === 3) add('bottom', center + lowerOffset, bottomY);
  return result;
}
