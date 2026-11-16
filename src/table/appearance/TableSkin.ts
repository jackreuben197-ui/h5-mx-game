import { TABLE_CARD_BACKS } from '../../data/TexasGamePersonalSettings.js';
export const classicFelt = new URL('../../assets/raw/table-personal/classic-felt.webp',import.meta.url).href;
const files=import.meta.glob('../../assets/raw/table-personal/*.svg',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const cardBacks=Object.fromEntries(TABLE_CARD_BACKS.map(color=>[color,new URL(files[`../../assets/raw/table-personal/${color}.svg`]!,import.meta.url).href]));

/** Figma 12026:53753, exported at 1x; keep the foreground rim at its original scale. */
export const purpleFelt = new URL('../../assets/raw/table-personal/purple-felt.png',import.meta.url).href;
