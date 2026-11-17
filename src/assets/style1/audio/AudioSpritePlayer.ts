import { MediaElementSegment } from '../media/MediaElementSegment.js';
import { media } from 'virtual:mx-media';
import { mediaRange, type MediaRule } from './MediaRule.js';
/** One decoded buffer per pack, multiple independently stoppable voices. No game-engine dependency. */
export class AudioSpritePlayer {
  private context?:AudioContext;
  private buffers=new Map<string,Promise<AudioBuffer>>();
  private requests=new Set<AbortController>();
  private voices=new Set<()=>void>();
  private disposed=false;
  unlock():void {
    if(this.disposed)return;
    this.context??=new AudioContext();
    if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }
  private buffer(url:string):Promise<AudioBuffer>{
    let task=this.buffers.get(url);if(task)return task;
    const controller=new AbortController();this.requests.add(controller);
    const timeout=setTimeout(()=>controller.abort(),15000);
    task=fetch(url,{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error(`Audio HTTP ${response.status}`);return response.arrayBuffer();})
      .then(data=>{if(this.disposed)throw new Error('Audio player disposed');return this.context!.decodeAudioData(data);})
      .catch(error=>{this.buffers.delete(url);throw error;})
      .finally(()=>{clearTimeout(timeout);this.requests.delete(controller);});
    this.buffers.set(url,task);return task;
  }
  preload(path:string):void {
    if(this.disposed)return;this.unlock();const clip=media[path];
    if(clip?.type==='audio'&&clip.playback!=='stream')void this.buffer(clip.url).catch(()=>{});
  }
  play(path:string,rule:MediaRule={}):()=>void {
    if(this.disposed)return ()=>{};
    const clip=media[path];if(!clip||clip.type!=='audio')return ()=>{};
    if(clip.playback==='stream')return this.stream(clip.url,rule);
    this.unlock();let cancelled=false,source:AudioBufferSourceNode|undefined,gain:GainNode|undefined;
    const stop=()=>{cancelled=true;source?.stop();source?.disconnect();gain?.disconnect();source=undefined;gain=undefined;this.voices.delete(stop);};
    this.voices.add(stop);
    void this.buffer(clip.url).then(buffer=>{
      if(cancelled||this.disposed)return;
      const segment=mediaRange(clip.duration??buffer.duration,rule.start,rule.duration);
      source=this.context!.createBufferSource();source.buffer=buffer;
      gain=this.context!.createGain();gain.gain.value=Math.max(0,Math.min(1,rule.volume??1));source.connect(gain);gain.connect(this.context!.destination);
      source.onended=()=>{source?.disconnect();gain?.disconnect();source=undefined;gain=undefined;this.voices.delete(stop);};
      const offset=clip.start+segment.start;
      if(rule.loop){source.loop=true;source.loopStart=offset;source.loopEnd=offset+segment.duration!;source.start(0,offset);}
      else source.start(0,offset,segment.duration);
    }).catch(()=>stop());
    return stop;
  }
  /** Independent files use the browser media pipeline, never our whole-file decode cache. */
  private stream(url:string,rule:MediaRule):()=>void {
    const audio=new Audio();
    const segment=new MediaElementSegment(audio,rule);let cancelled=false;
    const stop=()=>{
      if(cancelled)return;cancelled=true;segment.destroy();
      audio.onended=audio.onerror=audio.onpause=null;audio.pause();audio.removeAttribute('src');audio.load();this.voices.delete(stop);
    };
    audio.onerror=stop;
    if(!rule.loop){audio.onended=stop;audio.onpause=stop;}
    this.voices.add(stop);audio.src=url;void audio.play().catch(stop);return stop;
  }
  stop():void {for(const stop of [...this.voices])stop();}
  destroy():void {
    this.disposed=true;this.stop();for(const request of this.requests)request.abort();this.requests.clear();this.buffers.clear();
    if(this.context)void this.context.close().catch(()=>{});this.context=undefined;
  }
}
