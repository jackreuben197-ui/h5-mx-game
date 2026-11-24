import { componentBox } from '../../ComponentBox.js';
import { resourceURL } from '../../ResourcePath.js';
import config from './config.json';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { TableMedia, type VideoTrack } from '../../../../../media/TableMedia.js';
import { element } from '../../dom.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
export const mediaImage=(name:string)=>resourceURL((config.paths as Record<string,string>)[name]!);
/** SDK renders directly into a clipped DOM avatar; no frame copies or video canvas. */
export class TableMediaView {
  readonly root=componentBox(element('div','mx-media-controls'),config);
  private audio=element('button','mx-media-remote');
  private video=element('button','mx-media-remote');
  private bindings=new BindingScope(this);
  private seats=new Map<number,{uid:number;root:HTMLElement;video:HTMLElement;mask:HTMLElement;mic:HTMLElement;track?:VideoTrack}>();
  constructor(private media:TableMedia,private table:HTMLElement,private report:(error:unknown)=>void){
    for(const [button,kind] of [[this.audio,'audio'],[this.video,'video']] as const){
      button.type='button';button.style.backgroundImage=`url("${mediaImage('muteBtnBg')}")`;
      button.onclick=()=>void media.toggleRemote(kind).catch(report);this.root.append(button);
    }
    this.bindings.bind({media});this.render();
  }
  @bindEvent(TableMedia.CHANGE,'media')
  render():void {
    const media=this.media;
    this.root.hidden=true;this.video.hidden=!media.setting.enableCamera;
    for(const [button,kind,on] of [[this.audio,'sound',media.remoteMicrophone],[this.video,'video',media.remoteCamera]] as const){
      const icon=element('img','');icon.src=mediaImage(kind);icon.alt='';
      const label=element('span','',()=>i18nMgr.Get(on?'UITexas_Open':'UITexas_Close',[],on?'开启':'关闭'));
      button.replaceChildren(...(on?[icon,label]:[label,icon]));button.setAttribute('aria-label',`${on?'关闭':'开启'}其他玩家${kind==='sound'?'声音':'视频'}`);
    }
    // Stop the old slot before attaching a reused UID/track to a new slot.
    for(const [id,entry] of this.seats){
      const player=media.data.snapshot?.playersList.find(p=>p.seatId===id);
      const host=this.table.querySelector(`.mx-seat[data-seat="${id}"] .mx-seat-identity`);
      if(player?.userRid!==entry.uid||entry.root!==host)this.remove(id);
    }
    const ids=new Set<number>();
    for(const player of media.data.snapshot?.playersList??[]){
      const host=this.table.querySelector<HTMLElement>(`.mx-seat[data-seat="${player.seatId}"] .mx-seat-identity`);
      if(!host)continue;ids.add(player.seatId);
      let entry=this.seats.get(player.seatId);
      if(entry&&(entry.uid!==player.userRid||entry.root!==host)){this.remove(player.seatId);entry=undefined;}
      if(!entry){
        const video=element('div','mx-avatar-video'),mask=element('div','mx-avatar-video-mask'),mic=element('span','mx-avatar-mic');
        mic.style.setProperty('--mx-mic-glass',`url("${mediaImage('seatGlass')}")`);
        mic.append(element('img',''));
        const border=host.querySelector('.mx-avatar-border');host.insertBefore(video,border);host.insertBefore(mask,border);host.append(mic);
        entry={uid:player.userRid,root:host,video,mask,mic};this.seats.set(player.seatId,entry);
      }
      const track=media.videoTrack(player.userRid);
      if(track!==entry.track){entry.track?.stop();entry.video.replaceChildren();entry.track=track;if(track)track.play(entry.video,{fit:'cover',mirror:player.userRid===media.uid});}
      entry.video.hidden=!track;
      const mask=media.visibleMask(player.userRid);entry.mask.hidden=!mask;if(mask)entry.mask.style.backgroundImage=`url("${mediaImage(`vm${mask}`)}")`;
      const enabled=media.audioEnabled(player.userRid),speaking=media.speaking.has(player.userRid);
      entry.mic.hidden=!media.joined||(enabled&&!speaking);
      const glyph=entry.mic.firstElementChild as HTMLImageElement;
      glyph.alt='';
      glyph.src=mediaImage(enabled?'seatSpeaking':'table_icon_audio_disabled');
    }
    for(const id of this.seats.keys())if(!ids.has(id))this.remove(id);
    for(const [action,icon,on,allowed] of [
      ['camera','camera',media.camera,media.canOpCamera],
      ['voice','audio',media.microphoneActive,media.canOpMicrophone],
      ['effect','effect',media.maskId>0,media.canSwitchMask],
    ] as const){
      const button=this.table.querySelector<HTMLButtonElement>(`.mx-nav-button[data-action="${action}"]`);if(!button)continue;
      button.disabled=!media.joined||media.busy||!allowed;button.setAttribute('aria-pressed',String(on));
      const node=button.querySelector<HTMLElement>('.mx-nav-icon');if(node){node.style.backgroundImage=`url("${mediaImage(`table_icon_${icon}${on&&allowed?'':'_disabled'}`)}")`;node.style.backgroundSize='contain';node.style.backgroundPosition='center';node.style.backgroundRepeat='no-repeat';}
    }
  }
  private remove(id:number){const entry=this.seats.get(id);if(!entry)return;entry.track?.stop();entry.video.remove();entry.mask.remove();entry.mic.remove();this.seats.delete(id);}
  destroy(){this.bindings.destroy();for(const id of this.seats.keys())this.remove(id);this.root.remove();}
}
