export interface LocalPoint { x: number; y: number; }
export interface ComponentFrame {
  readonly width: number;
  readonly height: number;
  /** Normalized anchor: (0,0) top-left; (.5,.5) center; (1,1) bottom-right. */
  readonly anchor: LocalPoint;
}
/** Placement is in the immediate parent's local space, never a sibling's coordinate system. */
export function componentTopLeft(frame: ComponentFrame, position: LocalPoint): LocalPoint {
  return {x:position.x-frame.width*frame.anchor.x,y:position.y-frame.height*frame.anchor.y};
}
/** The only permitted conversion between component spaces is an explicit adapter. */
export function viewportToLocal(point: LocalPoint, viewport: {left:number;top:number;width:number;height:number}, frame: ComponentFrame): LocalPoint {
  if(viewport.width<=0||viewport.height<=0)throw new Error('Cannot convert coordinates for a hidden component');
  return {x:(point.x-viewport.left)*frame.width/viewport.width,y:(point.y-viewport.top)*frame.height/viewport.height};
}
