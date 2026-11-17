import { mountMxGame, LayoutOriginal, LayoutClassic, LayoutBalanced, LayoutOval, type TableUiConfig } from '../src/host-entry.js';

// Bind this product's UI classes here. MX still owns the layout setting and persistence.
// A new product replaces these classes with its own TableLayout implementations.
const implementations = {original:LayoutOriginal,classic:LayoutClassic,balanced:LayoutBalanced,oval:LayoutOval};
const ui: TableUiConfig = {
  createLayout: preference => new implementations[preference](),
};
export function mountProduct(container: HTMLElement) {
  return mountMxGame(container, {ui, layout:'auto'});
}
