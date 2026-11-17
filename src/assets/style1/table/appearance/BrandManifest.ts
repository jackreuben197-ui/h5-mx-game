import type { TableLayoutId } from '../../../../data/TexasGamePersonalSettings.js';
export interface BrandManifest {
  id: string;
  layouts: readonly TableLayoutId[];
  accent: string;
  defaultFelt: string;
}
/** Brand packages contain presentation defaults, never room permissions or betting rules. */
export const brands: Readonly<Record<string, BrandManifest>> = {
  mx: {id:'mx',layouts:['original','classic','balanced','oval'],accent:'#00b98b',defaultFelt:'#079d80'},
  midnight: {id:'midnight',layouts:['original','classic','balanced','oval'],accent:'#8b72b5',defaultFelt:'#34383f'},
};
export function getBrand(id='mx'): BrandManifest {
  const brand=brands[id];
  if(!brand)throw new Error(`Unknown table brand: ${id}`);
  return brand;
}
