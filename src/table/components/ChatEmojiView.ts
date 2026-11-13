import MagicEmojiConfig from '../../logic/MagicEmojiConfig.js';
import type { EmojiSpineRenderer } from '../../effects/spine/EmojiSpineRenderer.js';
import { element } from '../dom.js';
/** Share the existing Spine runtime/context across visible chat rows, clipped to the list. */
export class ChatEmojiView {
  readonly root=element('div','mx-chat-emoji-layer');
  private engine?:EmojiSpineRenderer;
  private loading?:Promise<EmojiSpineRenderer>;
  private active=new Set<HTMLElement>();
  private epoch=0;
  private dead=false;
  constructor(private list:HTMLElement){}
  sync():void{
    const slots=[...this.list.querySelectorAll<HTMLElement>('[data-chat-emoji]')];
    for(const node of this.active)if(!slots.includes(node)){this.engine?.stop(node.dataset.emojiKey!);this.active.delete(node);}
    if(!slots.length)return;
    const epoch=this.epoch;
    this.loading??=import('../../effects/spine/EmojiSpineRenderer.js').then(({EmojiSpineRenderer})=>{
      if(this.dead)throw new DOMException('Disposed','AbortError');
      return this.engine=new EmojiSpineRenderer(this.root,()=>{});
    });
    void this.loading.then(engine=>{
      if(this.dead||epoch!==this.epoch)return;
      for(const node of slots){
        const config=MagicEmojiConfig.getByType(Number(node.dataset.chatEmoji));
        if(!config||this.active.has(node))continue;
        this.active.add(node);const key=node.dataset.emojiKey??=crypto.randomUUID();
        void engine.play(key,config,()=>{
          if(!node.isConnected||!node.getClientRects().length)return null;
          const r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,scale:1,maxSize:r.width,clip:this.list.getBoundingClientRect()};
        },true,true).catch(()=>{this.active.delete(node);});
      }
    }).catch(()=>{this.loading=undefined;});
  }
  clear():void{this.epoch++;this.engine?.clear();this.active.clear();}
  destroy():void{this.dead=true;this.clear();this.engine?.destroy();this.root.remove();}
}
