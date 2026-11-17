import type { TableLayout } from './TableLayout.js';
import type { TableLayoutId } from '../data/TexasGamePersonalSettings.js';
/** Product UI implementations consume the shared MX layout preference. */
export interface TableUiConfig {
  createLayout(preference: TableLayoutId): TableLayout;
}
