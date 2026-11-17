import config from './config.json';
import { DialogSurface } from '../DialogSurface/DialogSurface.js';
import { RoundCheckbox } from '../RoundCheckbox/RoundCheckbox.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { element } from '../../dom.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
/** Shared CC UIGuideDialog for mushroom and critical-hit introductions. */
export class GameplayGuideDialog {
  readonly surface=new DialogSurface('mx-gameplay-guide',config.layout.panelWidth);
  private title=element('h2','');
  private picture=element('div','mx-gameplay-guide-image');
  private text=element('p','');
  private toggle=new RoundCheckbox(()=>i18nMgr.Get('UIGuild_NoticeNoShow'));
  private commit=element('button','mx-gameplay-guide-commit',()=>i18nMgr.Get('adaptation10012'));
  private current?:{kind:string;title:()=>string;image:string;content:()=>string;close:()=>void};
  constructor(){
    SpriteAtlas.paint(this.commit,config.paths.dialogConfirm);
    this.surface.content.append(this.title,this.picture,this.text,this.toggle.root,this.commit);
    this.commit.onclick=()=>{const current=this.current;if(!current)return;localStorage.setItem(`mx-${current.kind}-intro-hidden`,String(this.toggle.input.checked));this.current=undefined;this.surface.show(false);current.close();};
    i18nMgr.register(this);
  }
  show(kind:string,title:()=>string,image:string,content:()=>string,close:()=>void):void {
    this.current={kind,title,image,content,close};this.toggle.input.checked=true;this.refreshLanguage();this.surface.show(true);
  }
  refreshLanguage():void {
    if(!this.current)return;
    this.title.textContent=this.current.title();this.picture.style.backgroundImage=`url("${this.current.image}")`;this.picture.dataset.kind=this.current.kind;
    // Only the CC color markup is accepted; do not interpret content as HTML.
    const parts=this.current.content().split(/(<color=#[0-9a-fA-F]{6}>|<\/color>)/g);let color='';
    this.text.replaceChildren(...parts.flatMap(part=>{
      if(part.startsWith('<color=')){color=part.slice(7,-1);return [];}
      if(part==='</color>'){color='';return [];}
      const span=element('span','',part);if(color)span.style.color=color;return [span];
    }));
  }
  destroy():void {this.current=undefined;this.surface.destroy();}
}
