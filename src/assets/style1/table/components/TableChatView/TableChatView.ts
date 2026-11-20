import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import { ChatEmojiView } from '../ChatEmojiView/ChatEmojiView.js';
import MagicEmojiConfig from '../../../../../logic/MagicEmojiConfig.js';
import type { RoomRecords } from '../../../../../core/RoomRecords.js';
import Chat, { type TexasChatMessage } from '../../../../../data/TexasGameRoomDataChat.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { i18nLabel } from '../../../../../i18n/i18nLabel.js';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { RecordDialogView } from '../RecordDialogView/RecordDialogView.js';
import { DanmuView } from '../DanmuView/DanmuView.js';
import '../../chat.css';
/** CC UIChatDlg: cached history, incremental rows, top paging, fixed composer. */
export class TableChatView {
  readonly button=element('button','mx-chat-button');
  readonly support=element('button','mx-support-button mx-table-tool-button');
  readonly dialog:RecordDialogView;
  readonly danmu=new DanmuView();
  private emoji:ChatEmojiView;
  private list=element('div','mx-chat-list');
  private welcome=element('p','mx-chat-welcome');
  private input=element('input','mx-chat-input');
  private send=element('button','mx-chat-send');
  private quick=element('div','mx-chat-quick');
  private bullet=element('input','');
  private bindings=new BindingScope(this);
  private rows=new Map<TexasChatMessage,HTMLElement>();
  private dead=false;private quickData:unknown=[];
  constructor(private records:RoomRecords,private error:(e:unknown)=>void){
    const data=records.data;
    window.visualViewport?.addEventListener('resize',this.fitKeyboard);
    window.visualViewport?.addEventListener('scroll',this.fitKeyboard);
    const assets = {send:resourceURL(config.paths.send),quick:resourceURL(config.paths.quick),panel:resourceURL(config.paths.panel)};
    this.dialog=new RecordDialogView(()=>`${data.record?.name??''}\n#${records.target.roomID}`,()=>this.close(),'left',config.layout.dockTop);
    this.dialog.root.classList.add('mx-chat-dialog');
    this.emoji=new ChatEmojiView(this.dialog.body);this.dialog.panel.append(this.emoji.root);
    for(const [key,url] of Object.entries(assets))this.dialog.root.style.setProperty(`--chat-${key}`,`url("${url}")`);
    SpriteAtlas.paint(this.button,config.paths.chat);this.button.append(element('span','',()=>i18nMgr.Get('MX_Chat')));
    this.button.hidden=!!data.mtt;this.button.onclick=()=>this.open();
    this.support.type='button';
    this.support.style.setProperty('--mx-tool-background',`url("${resourceURL(config.paths.toolBackground)}")`);
    const supportBackground=element('span','mx-table-tool-background');supportBackground.setAttribute('aria-hidden','true');
    const supportIcon=element('img','mx-table-tool-icon mx-support-icon');supportIcon.alt='';supportIcon.draggable=false;
    supportIcon.src=resourceURL(config.paths.support);
    this.support.append(supportBackground,element('span','mx-support-label',()=>i18nMgr.Get('MX_Support')),supportIcon);
    this.support.onclick=()=>void records.supportChat?.().catch(error);
    this.input.maxLength=80;
    i18nLabel.bind(this.input,()=>i18nMgr.Get('UIWallet_Text10'),'placeholder');
    i18nLabel.bind(this.input,()=>i18nMgr.Get('MX_Chat'),'aria-label');
    this.send.setAttribute('aria-label',i18nMgr.Get('MX_ChatSend'));
    this.send.onclick=()=>void this.submit();this.input.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();void this.submit();}};
    const quickButton=element('button','mx-chat-quick-button');quickButton.setAttribute('aria-label',i18nMgr.Get('MX_ChatQuick'));
    this.quick.hidden=true;quickButton.onclick=()=>{if(!this.quick.hidden){this.hideQuick();return;}this.renderQuick();this.quick.hidden=false;};
    const modes=element('div','mx-chat-modes');
    for(const [value,key] of [[false,'MX_Chat'],[true,'MX_ChatAndDanmu']] as const){const label=element('label',''),radio=element('input','');radio.type='radio';radio.name=`chat-mode-${records.target.roomID}`;radio.checked=!value;radio.onchange=()=>{this.bullet.checked=value;};label.append(radio,element('span','',()=>i18nMgr.Get(key)));modes.append(label);}
    const inputField=element('div','mx-chat-input-field');inputField.append(this.input);
    const composer=element('div','mx-chat-composer');composer.append(inputField,quickButton,this.send);
    this.dialog.body.append(this.welcome,this.list);this.dialog.footer.append(this.quick,modes,composer);
    this.dialog.body.onscroll=()=>{if(this.dialog.body.scrollTop<20&&data.chat.hasMoreHistory)void records.chatHistory?.(true).catch(error);};
    this.bindings.bind({chat:data.chat});
  }
  open():void{
    if(this.records.data.mtt)return;
    this.bullet.checked=false;this.dialog.footer.querySelectorAll<HTMLInputElement>('.mx-chat-modes input').forEach((radio,index)=>radio.checked=index===0);
    this.records.data.chat.setChatDialogOpen(true);this.input.value='';this.dialog.show(true);this.fitKeyboard();this.render();
    this.scrollBottom();void this.records.chatHistory?.(false,this.records.data.chat.needsLatestHistorySync).catch(this.error);
    void this.records.chatQuickMessages?.().then(raw=>{if(!this.dead){this.quickData=raw;this.renderQuick();}}).catch(this.error);
  }
  close():void{this.records.data.chat.setChatDialogOpen(false);this.dialog.show(false);this.hideQuick();this.emoji.clear();}
  private async submit(text=this.input.value,clearInput=true):Promise<void>{
    if(this.dead||this.send.disabled||!text.trim())return;this.send.disabled=true;
    try{await this.records.sendChat?.(text,this.bullet.checked);if(!this.dead&&clearInput&&this.input.value===text)this.input.value='';}
    catch(e){this.error(e);}finally{if(!this.dead)this.send.disabled=false;}
  }
  @bindEvent(Chat.NEW_MESSAGE_ALERT_CHANGED,'chat')
  private alert():void{this.button.classList.toggle('mx-chat-unread',this.records.data.chat.hasNewMessageAlert);}
  @bindEvent(Chat.MESSAGE_ADDED,'chat')
  private render():void{
    const body=this.dialog.body,oldHeight=body.scrollHeight,oldTop=body.scrollTop,near=oldHeight-oldTop-body.clientHeight<=80;
    const first=this.list.firstElementChild,oldFirstTop=first?.getBoundingClientRect().top;
    const chat=this.records.data.chat;this.welcome.textContent=chat.prologue??'';this.welcome.hidden=!chat.prologue;
    for(const [message,node] of this.rows)if(!chat.messages.includes(message)){node.remove();this.rows.delete(message);}
    for(const message of chat.messages){let node=this.rows.get(message);if(!node){node=this.message(message);this.rows.set(message,node);}this.list.append(node);}
    if(!this.dialog.root.hidden)this.emoji.sync();
    requestAnimationFrame(()=>{if(this.dead)return;if(near)this.scrollBottom();else if(first?.isConnected&&oldFirstTop!==undefined)body.scrollTop=oldTop+first.getBoundingClientRect().top-oldFirstTop;});
  }
  @bindEvent(Chat.HISTORY_PAGE_MERGED,'chat')
  private historyChanged():void{this.render();}
  @bindEvent(Chat.HISTORY_RESET,'chat')
  private historyReset():void{this.render();}
  private message(m:TexasChatMessage):HTMLElement{
    const row=element('article','mx-chat-message'),avatar=element('img','mx-chat-avatar');avatar.alt='';avatar.src=m.headUrl;avatar.onerror=()=>{avatar.hidden=true;};
    const content=element('div','mx-chat-content'),meta=element('div','mx-chat-meta');meta.append(element('span','',m.name),element('time','',m.time));
    const bubble=element('div','mx-chat-bubble',m.emojiType===undefined?m.content:i18nMgr.Get('UITexas_mainmenu_emoji'));
    if(m.emojiType!==undefined&&MagicEmojiConfig.getByType(m.emojiType)){bubble.className='mx-chat-emoji-slot';bubble.textContent='';bubble.dataset.chatEmoji=String(m.emojiType);}
    content.append(meta,bubble);row.append(avatar,content);return row;
  }
  private scrollBottom():void{this.dialog.body.scrollTop=this.dialog.body.scrollHeight;}
  @bindEvent(Chat.DANMU_ADDED,{dataSource:'chat',initIgnore:true})
  private onDanmu(message:{name:string;content:string}):void{if(!this.records.data.mtt)this.danmu.play(`${message.name}: ${message.content}`);}
  private hideQuick():void{this.quick.hidden=true;}
  private sendQuick(text:string):void{
    if(this.dead||this.send.disabled||this.quick.hidden||!text.trim())return;
    this.hideQuick();
    void this.submit(text,false);
  }
  private renderQuick():void{
    const parse=(raw:unknown):string[]=>{if(typeof raw==='string'){try{return parse(JSON.parse(raw));}catch{return raw.trim()?[raw]:[];}}if(Array.isArray(raw))return raw.flatMap(v=>typeof v==='string'?[v]:parse(v));if(raw&&typeof raw==='object'){const v=raw as Record<string,any>;if(v.data||v.list)return parse(v.data??v.list);const item=v.multi_language??v;const locale=i18nMgr.language;return [String(item[locale==='en'?'us_name':locale==='pt'?'br_name':'cn_name']??item.us_name??'')].filter(Boolean);}return [];};
    this.quick.replaceChildren(...parse(this.quickData).map(text=>{
      const b=element('button','',text);b.type='button';
      b.onpointerdown=e=>{if(e.isPrimary&&e.button===0&&!this.send.disabled)b.classList.add('mx-chat-quick-pressed');};
      const release=()=>b.classList.remove('mx-chat-quick-pressed');
      b.onpointerup=release;b.onpointercancel=release;b.onpointerleave=release;
      b.onclick=()=>this.sendQuick(text);return b;
    }));
  }
  private fitKeyboard=():void=>{
    const viewport=window.visualViewport;if(!viewport||this.dialog.root.hidden)return;
    const top=this.dialog.panel.getBoundingClientRect().top;
    this.dialog.panel.style.maxHeight=`${Math.max(0,viewport.offsetTop+viewport.height-top)}px`;
  };
  resize(width:number,height:number):void{this.dialog.onFrameResize(width,height);const unit=Math.min(width/config.layout.screenWidth,width>height?config.layout.desktopWidth/config.layout.panelWidth:Infinity);this.dialog.root.style.setProperty('--record-unit',`${unit}px`);this.dialog.root.style.setProperty('--chat-width',`${config.layout.panelWidth*unit}px`);this.fitKeyboard();}
  destroy():void{window.visualViewport?.removeEventListener('resize',this.fitKeyboard);window.visualViewport?.removeEventListener('scroll',this.fitKeyboard);this.dead=true;this.close();this.bindings.destroy();this.dialog.destroy();this.danmu.destroy();this.emoji.destroy();this.button.remove();this.support.remove();}
}
