import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resourcePath } from './asset-config.mjs';
const bytesPerSample=2;
function wav(pcm,sampleRate,channels){
  const h=Buffer.alloc(44);h.write('RIFF',0);h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(channels,22);h.writeUInt32LE(sampleRate,24);h.writeUInt32LE(sampleRate*channels*bytesPerSample,28);h.writeUInt16LE(channels*bytesPerSample,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);
}
/** Offsets come from decoded sample frames; MP3 includes gapless delay/padding metadata. */
export async function packMedia(entries,root,out,{maxDecodedBytes=32*1024*1024,packs=new Map()}={}){
  await mkdir(out,{recursive:true});const result={},groups=new Map();
  for(const [path,rule] of entries){
    if(!rule.pack||rule.loop){result[path]={file:path,generated:false,type:rule.type,start:0};continue;}
    const list=groups.get(rule.pack)??[];list.push(path);groups.set(rule.pack,list);
  }
  for(const [group,paths] of groups){
    const rules=packs.get(group)??{},sampleRate=rules.sampleRate??48000,channels=rules.channels??2,budget=rules.maxDecodedBytes??maxDecodedBytes;
    const maxClipSeconds=rules.maxClipSeconds??5;
    const independent=path=>{result[path]={file:path,generated:false,type:'audio',start:0};};
    const format=rules.format??'wav';
    if(!['wav','mp3'].includes(format))throw new Error(`Unsupported audio pack format: ${format}`);
    const gapFrames=Math.round((rules.gapSeconds??.1)*sampleRate);
    let parts=[],samples=0,page=0;
    const file=()=>`audio-${group}-${page}.${format}`;
    async function flush(){
      if(!parts.length)return;
      const pcm=Buffer.concat(parts),target=join(out,file());
      if(format==='wav')await writeFile(target,wav(pcm,sampleRate,channels));
      else {
        // Write to a seekable file so FFmpeg can finish the Xing/LAME delay and padding header.
        const encoded=spawnSync('ffmpeg',['-v','error','-y','-f','s16le','-ar',String(sampleRate),'-ac',String(channels),'-i','pipe:0','-c:a','libmp3lame','-b:a',`${rules.bitrateKbps??128}k`,'-write_xing','1',target],{input:pcm,maxBuffer:1024*1024});
        if(encoded.error||encoded.status!==0)throw new Error(`Cannot encode ${file()}: ${encoded.error?.message??encoded.stderr.toString()}`);
        // Verify the written file decodes to the timeline used by the generated clip offsets.
        const decoded=spawnSync('ffmpeg',['-v','error','-i',target,'-ar',String(sampleRate),'-ac',String(channels),'-f','s16le','pipe:1'],{maxBuffer:budget});
        if(decoded.error||decoded.status!==0||decoded.stdout.length!==pcm.length)throw new Error(`MP3 gapless timeline verification failed: ${file()}`);
      }
      parts=[];samples=0;page++;
    }
    for(const path of paths.sort()){
      const source=resourcePath(root,path);
      // Probe first: never decode a whole long track into the build process just to classify it.
      const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',source],{encoding:'utf8'});
      if(probe.error?.code==='ENOENT')throw new Error('Audio build requires ffmpeg and ffprobe on PATH; dev does not require them.');
      if(probe.error||probe.status!==0)throw new Error(`Cannot inspect ${path}: ${probe.error?.message??probe.stderr}`);
      const seconds=Number(JSON.parse(probe.stdout).format?.duration);
      if(!Number.isFinite(seconds)||seconds<=0||seconds>maxClipSeconds+.1||seconds*sampleRate*channels*4>budget){independent(path);continue;}
      const output=spawnSync('ffmpeg',['-v','error','-i',resourcePath(root,path),'-vn','-ar',String(sampleRate),'-ac',String(channels),'-f','s16le','pipe:1'],{maxBuffer:budget});
      if(output.error?.code==='ENOENT')throw new Error('Audio sprite build requires ffmpeg on PATH; dev does not require it.');
      if(output.error||output.status!==0)throw new Error(`Cannot decode ${path}: ${output.error?.message??output.stderr.toString()}`);
      const pcm=output.stdout,frames=pcm.length/(channels*bytesPerSample);
      if(!frames||frames%1)throw new Error(`Invalid PCM audio: ${path}`);
      if(frames/sampleRate>maxClipSeconds||(frames+gapFrames)*channels*4>budget){independent(path);continue;}
      if((samples+frames+gapFrames)*channels*4>budget)await flush();
      result[path]={file:file(),generated:true,type:'audio',start:samples/sampleRate,duration:frames/sampleRate};
      parts.push(pcm,Buffer.alloc(gapFrames*channels*bytesPerSample));samples+=frames+gapFrames;
    }
    await flush();
  }
  await writeFile(join(out,'media.json'),JSON.stringify(result,null,2)+'\n');return result;
}
