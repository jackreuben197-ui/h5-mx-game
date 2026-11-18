import type { TableLayoutId } from '../../../../data/TexasGamePersonalSettings.js';
import { element } from '../dom.js';
import { resourceURL } from '../ResourcePath.js';
/** Original Figma thumbnails; variant names are mapped by the settings component. */
export class LayoutPreview {
  readonly root=element('img','mx-layout-preview');
  constructor(id:TableLayoutId,path:string){
    this.root.alt='';this.root.setAttribute('aria-hidden','true');this.root.dataset.layout=id;
    this.root.src=resourceURL(path);
  }
}
