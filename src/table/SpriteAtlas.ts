import ui from '../assets/ui-atlas.json';
import sources from '../assets/image-sources.json';
import { resources } from './resources.js';
export type Sprite = keyof typeof sources.ui;
export class SpriteAtlas {
  /** CC infowarn uses a cutout glyph. Back only its center with white, keeping the outer corners transparent. */
  static paintWarning(node: HTMLElement): void {
    this.paint(node, 'infoTip');
    node.style.backgroundImage += ', radial-gradient(circle, #fff 55%, transparent 57%)';
    node.style.backgroundSize += ', 100% 100%';
    node.style.backgroundPosition += ', center';
    node.style.backgroundRepeat = 'no-repeat';
    node.style.backgroundColor = 'transparent';
  }
  static mask(node: HTMLElement, key: Sprite, color: string): void {
    this.paint(node, key);
    node.style.maskImage = node.style.backgroundImage;
    node.style.maskSize = node.style.backgroundSize;
    node.style.maskPosition = node.style.backgroundPosition;
    node.style.maskRepeat = 'no-repeat';
    node.style.backgroundImage = 'none';
    node.style.backgroundColor = color;
  }
  static paint(node: HTMLElement, key: Sprite): void {
    if (resources.mode === 'raw') {
      node.style.backgroundImage = `url("${resources.rawUI[key]}")`;
      node.style.backgroundSize = '100% 100%'; node.style.backgroundPosition = 'center';
      return;
    }
    const f = ui.frames[key as keyof typeof ui.frames];
    if (!f) throw new Error(`Missing packed sprite: ${key}`);
    node.style.backgroundImage = `url("${resources.ui}")`;
    node.style.backgroundSize = `${(ui.width / f.width) * 100}% ${(ui.height / f.height) * 100}%`;
    node.style.backgroundPosition = `${(f.x / (ui.width - f.width)) * 100}% ${(f.y / (ui.height - f.height)) * 100}%`;
  }
}
