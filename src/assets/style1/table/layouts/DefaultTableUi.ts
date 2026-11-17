import type { TableUiConfig } from '../../../../ui/TableUiConfig.js';
import { LayoutOriginal } from './LayoutOriginal.js';
import { LayoutClassic } from './LayoutClassic.js';
import { LayoutBalanced } from './LayoutBalanced.js';
import { LayoutOval } from './LayoutOval.js';
const implementations = {original:LayoutOriginal,classic:LayoutClassic,balanced:LayoutBalanced,oval:LayoutOval};
/** Current MX preferences select among defaults; another product binds its own implementation set. */
export const defaultTableUi: TableUiConfig = {
  createLayout: id => new implementations[id](),
};
