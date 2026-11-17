import config from './config.json';
import { resourceURL } from '../ResourcePath.js';
import { TABLE_CARD_BACKS } from '../../../../data/TexasGamePersonalSettings.js';
export const classicFelt=resourceURL(config.paths.classicFelt);
/** Figma 12026:53753, original exported cloth and foreground rim. */
export const purpleFelt=resourceURL(config.paths.purpleFelt);
export const cardBacks=Object.fromEntries(TABLE_CARD_BACKS.map(color=>[color,resourceURL(config.paths[color])]));
