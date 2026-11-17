import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { media } from 'virtual:mx-media';
import type { MediaRule } from '../../../audio/MediaRule.js';
import { MediaElementSegment } from '../../../media/MediaElementSegment.js';
/** Optional DOM video component; paths and original-file time segments come from component config. */
export class VideoClipView {
  readonly root=componentBox(document.createElement('video'),config);
  private segment:MediaElementSegment;private disposed=false;
  constructor(path:string,rule:MediaRule={}){
    const clip=media[path];if(!clip||clip.type!=='video')throw new Error(`Unregistered video: ${path}`);
    this.root.playsInline=true;this.root.style.objectFit=config.layout.objectFit;this.segment=new MediaElementSegment(this.root,rule);this.root.src=clip.url;
  }
  async play():Promise<void>{if(!this.disposed)await this.root.play();}
  stop():void{this.root.pause();}
  destroy():void{this.disposed=true;this.stop();this.segment.destroy();this.root.removeAttribute('src');this.root.load();this.root.remove();}
}
