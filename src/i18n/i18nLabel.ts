import { i18nMgr } from './i18nMgr.js';
/** A live DOM label. Only its text node changes; inputs, images and game state stay intact. */
export class i18nLabel {
  private static bindings = new WeakMap<HTMLElement, Map<string, i18nLabel>>();
  private text?: Text;
  private constructor(private node: HTMLElement, private read: () => string, private attribute: string) {
    i18nMgr.register(this);
  }
  static bind(node: HTMLElement, read: () => string, attribute = ''): void {
    let map = this.bindings.get(node);
    if (!map) { map = new Map(); this.bindings.set(node, map); }
    let binding = map.get(attribute);
    if (!binding) { binding = new i18nLabel(node, read, attribute); map.set(attribute, binding); }
    binding.read = read;
    if (!attribute && (!binding.text || binding.text.parentNode !== node)) {
      const text = node.ownerDocument.createTextNode('');
      node.replaceChildren(text);
      binding.text = text;
    }
    binding.refreshLanguage();
  }
  refreshLanguage(): void {
    const value = this.read();
    if (this.attribute) this.node.setAttribute(this.attribute, value);
    else if (this.text?.parentNode === this.node) this.text.nodeValue = value;
  }
}
