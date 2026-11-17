export interface MediaRule {
  type?:string;
  pack?:string|boolean;
  /** Offset and duration within the original source, in seconds. */
  start?:number;duration?:number;
  preload?:string;loop?:boolean;volume?:number;
}
export function mediaRange(sourceDuration:number|undefined,start=0,duration?:number):{start:number;duration:number|undefined}{
  if(!Number.isFinite(start)||start<0||duration!==undefined&&(!Number.isFinite(duration)||duration<=0))throw new Error('Invalid media segment');
  if(sourceDuration!==undefined&&start>=sourceDuration)throw new Error('Media segment starts beyond source');
  const available=sourceDuration===undefined?undefined:sourceDuration-start;
  return {start,duration:duration===undefined?available:available===undefined?duration:Math.min(duration,available)};
}
