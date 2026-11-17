import type { DiamondGiftBroadcastData } from '../../../data/TexasGameRoomDataEmoji.js';
import { SpriteAtlas } from '../table/SpriteAtlas.js';
import { element } from '../table/dom.js';
import type { EmojiSpineRenderer } from './spine/EmojiSpineRenderer.js';
import { EmojiSpineAssets, type SpineClipConfig } from './spine/EmojiSpineAssets.js';

/** CC ThrowPropManager.playDiamondGift: sender amount, flying icon, receiver Spine and amount. */
export class DiamondGiftEffect {
  static readonly spine: SpineClipConfig = {spine:'textures/animate/dimmond/diamond2',animation:'animation',assetGroup:'diamond'};
  private dead=false;
  private nodes=new Set<HTMLElement>();
  private animations=new Set<Animation>();
  private serial=0;
  constructor(private layer:HTMLElement,private avatar:(userRID:number)=>HTMLElement|null,
    private renderer:()=>Promise<EmojiSpineRenderer>) {}
  static preload(): Promise<unknown> { return EmojiSpineAssets.load(this.spine); }
  private center(userRID:number):{x:number;y:number}|null{
    const avatar=this.avatar(userRID);if(!avatar)return null;
    const rect=avatar.getBoundingClientRect(),layer=this.layer.getBoundingClientRect();
    return {x:rect.left+rect.width/2-layer.left,y:rect.top+rect.height/2-layer.top};
  }
  private add(node:HTMLElement,x:number,y:number):void{
    node.style.left=`${x}px`;node.style.top=`${y}px`;
    this.layer.append(node);this.nodes.add(node);
  }
  private animate(node:HTMLElement,frames:Keyframe[],options:KeyframeAnimationOptions):Promise<void>{
    const animation=node.animate(frames,options);this.animations.add(animation);
    return animation.finished.then(()=>undefined,()=>undefined).finally(()=>this.animations.delete(animation));
  }
  private remove(node:HTMLElement):void{node.remove();this.nodes.delete(node);}
  private amount(point:{x:number;y:number},text:string,positive:boolean,unit:number):void{
    const node=element('div','mx-diamond-gift-amount');
    const icon=element('span','mx-diamond-gift-amount-icon');SpriteAtlas.paint(icon,'giftFlyDiamond');
    const label=element('span','mx-diamond-gift-number',text);
    if(positive)label.classList.add('mx-diamond-gift-positive');
    node.style.setProperty('--mx-gift-icon',`${80*unit}px`);
    node.style.setProperty('--mx-gift-number',`${48*unit}px`);
    node.append(icon,label);this.add(node,point.x,point.y);
    void this.animate(node,[{transform:'translate(-50%,-50%)',opacity:1},{transform:`translate(-50%,calc(-50% - ${60*unit}px))`,opacity:1,offset:.6},{transform:`translate(-50%,calc(-50% - ${60*unit}px))`,opacity:0}],{duration:1000,easing:'linear'}).then(()=>this.remove(node));
  }
  async play(data:DiamondGiftBroadcastData):Promise<void>{
    if(this.dead||!data.amount)return;
    try{await DiamondGiftEffect.preload();}catch(error){console.warn('[MX diamond] asset load failed',error);return;}
    if(this.dead)return;
    const from=this.center(data.senderID),to=this.center(data.receiverID);
    if(!from||!to)return;
    const rect=this.layer.getBoundingClientRect(),unit=Math.min(rect.width/1242,rect.height/2688);
    const rendererTask=this.renderer().then(renderer=>({renderer}),error=>({error}));
    this.amount(from,`-${data.amount}`,false,unit);
    const icon=element('span','mx-diamond-gift-fly');SpriteAtlas.paint(icon,'giftFlyDiamond');
    icon.style.width=`${80*unit}px`;icon.style.height=`${74*unit}px`;this.add(icon,from.x,from.y);
    await this.animate(icon,[{transform:'translate(-50%,-50%)'},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px))`}],{duration:900,easing:'ease-in-out'});
    this.remove(icon);
    const prepared=await rendererTask;
    if('error' in prepared)throw prepared.error;
    const renderer=prepared.renderer;
    if(this.dead||!this.avatar(data.receiverID))return;
    this.amount(to,`+${data.amount}`,true,unit);
    const key=`diamond-gift-${++this.serial}`;
    await renderer.play(key,DiamondGiftEffect.spine,()=>{
      const point=this.center(data.receiverID),frame=this.layer.getBoundingClientRect();
      return point?{x:point.x+frame.left,y:point.y+frame.top,scale:Math.min(frame.width/1242,frame.height/2688)*.75}:null;
    });
  }
  destroy():void{this.dead=true;this.animations.forEach(animation=>animation.cancel());this.animations.clear();this.nodes.forEach(node=>node.remove());this.nodes.clear();}
}
