import { i18nLabel } from '../../../i18n/i18nLabel.js';
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  text: string | (() => string) = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = cls;
  if (typeof text === 'function') i18nLabel.bind(node, text);
  else node.textContent = text;
  return node;
}
export function place(node: HTMLElement, x: number, y: number): void {
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
}
