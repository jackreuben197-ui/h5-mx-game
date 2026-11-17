import { GameClient } from './StyleClient.js';
import { getBrand } from './table/appearance/BrandManifest.js';
import type { UiSkin } from '../../ui/UiSkin.js';
export const style1: UiSkin = {createClient:(container,options)=>new GameClient(container,options),getBrand};
export { LayoutOriginal } from './table/layouts/LayoutOriginal.js';
export { LayoutClassic } from './table/layouts/LayoutClassic.js';
export { LayoutBalanced } from './table/layouts/LayoutBalanced.js';
export { LayoutOval } from './table/layouts/LayoutOval.js';
