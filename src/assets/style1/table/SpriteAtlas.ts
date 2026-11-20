import './button-sprites.css';
import legacy from './sharedSprites/config.json';
import { resources } from './resources.js';
export type Sprite = string;
export class SpriteAtlas {
  /** Keep the original icon round even when a device changes the host's aspect ratio. */
  static paintWarning(node: HTMLElement, path: string = legacy.paths.infoTip): void {
    const source = this.sourcePath(path);
    // Use the registered sprite in both standalone and atlas builds. Requiring a raw URL
    // here can throw while a settings row is constructed, leaving the list incomplete.
    this.paint(node, source);
    // The glyph is a cutout: a white circle backs its center without filling the corners.
    node.style.backgroundImage += ', radial-gradient(circle closest-side, #fff 78%, transparent 80%)';
    node.style.backgroundSize = `${resources.rawImages[source] ? 'contain' : node.style.backgroundSize}, 100% 100%`;
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
  static paintButton(node: HTMLElement, image: string, slice='85 80', width='47.486cqh 44.693cqh'): void {
    node.classList.add('mx-sliced-button');
    node.style.setProperty('--mx-button-image',`url("${image}")`);
    node.style.setProperty('--mx-button-slice',slice);
    node.style.setProperty('--mx-button-width',width);
  }
  /** New configs supply source paths. Names remain only for old components not yet migrated. */
  static sourcePath(path: string): string {
    return (legacy.paths as Record<string,string>)[path] ?? path;
  }
  static paint(node: HTMLElement, key: Sprite): void {
    const path=SpriteAtlas.sourcePath(key);
    if(path===legacy.paths.dialogConfirm){
      node.classList.add('mx-confirm-texture');
      SpriteAtlas.paintButton(node,resources.rawImages[path]!);return;
    }
    const direct=resources.rawImages[path];
    if(direct){
      node.style.backgroundImage=`url("${direct}")`;
      node.style.backgroundSize='100% 100%';node.style.backgroundPosition='center';return;
    }
    const f=resources.frames[path];
    if(!f)throw new Error(`Unregistered component resource: ${path}`);
    const page=resources.pages[f.page]!;
    node.style.backgroundImage=`url("${page.url}")`;
    node.style.backgroundSize=`${page.width/f.width*100}% ${page.height/f.height*100}%`;
    node.style.backgroundPosition=`${page.width===f.width?0:f.x/(page.width-f.width)*100}% ${page.height===f.height?0:f.y/(page.height-f.height)*100}%`;
  }
}
