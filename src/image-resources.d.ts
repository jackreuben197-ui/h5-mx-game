declare module 'virtual:mx-images' {
  export const resources: {
    mode:'raw'|'atlas';desk:string;desks:Record<string,string>;deskThumbs:string;
    preloadPaths:string[];rawImages:Record<string,string>;files:Record<string,string>;
    frames:Record<string,{page:number;x:number;y:number;width:number;height:number}>;
    pages:Array<{url:string;width:number;height:number}>;
  };
}
declare module 'virtual:mx-media' {
  export const media:Record<string,{url:string;type:'audio'|'video';playback:'buffer'|'stream';start:number;duration?:number}>;
}
