declare module 'virtual:mx-images' {
  export const resources: {
    mode: 'raw' | 'atlas'; desk: string; cards: string; ui: string;
    deskThumbs: string; cards1: string; rawCards1: Record<string,string>; desks: Record<string,string>; rawCards: Record<string,string>; rawUI: Record<string,string>; preload: string[];
  };
}
