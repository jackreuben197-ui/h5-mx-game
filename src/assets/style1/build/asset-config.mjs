import { readdirSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { resolve, relative, extname, isAbsolute, sep } from 'node:path';

export function resourcePath(root, path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || isAbsolute(path) || path.split('/').some(p=>p==='..'||p==='.'||!p))
    throw new Error(`Expected a resources-relative path, got: ${path}`);
  const file=resolve(root,path);
  if(!realpathSync(file).startsWith(realpathSync(root)+sep)||!statSync(file).isFile())throw new Error(`Invalid resource: ${path}`);
  return file;
}
/** Scan component configuration, never generated output or source-code string literals. */
export function scanConfigs(styleRoot) {
  const resourceRoot=resolve(styleRoot,'resources'), files=[], images=new Map(), media=new Map(), packs=new Map(), assets=new Set(), references=[];
  function walk(dir) {
    for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(['resources','build','node_modules'].includes(entry.name))continue;
      const file=resolve(dir,entry.name);
      if(entry.isDirectory())walk(file);else if(entry.name==='config.json')files.push(file);
    }
  }
  walk(styleRoot);
  for(const file of files){
    const config=JSON.parse(readFileSync(file,'utf8'));
    for(const [name,rule] of Object.entries(config.mediaPacks??{})){
      if(!/^[-a-z0-9]+$/.test(name)||!['wav','mp3'].includes(rule.format)||![22050,24000,44100,48000].includes(rule.sampleRate)||![1,2].includes(rule.channels)||!Number.isFinite(rule.gapSeconds)||rule.gapSeconds<0||rule.gapSeconds>2||!Number.isInteger(rule.maxDecodedBytes)||rule.maxDecodedBytes<1024)throw new Error(`Invalid media pack rule: ${name}`);
      if(rule.maxClipSeconds!==undefined&&(!Number.isFinite(rule.maxClipSeconds)||rule.maxClipSeconds<=0))throw new Error(`Invalid maximum clip duration: ${name}`);
      if(rule.bitrateKbps!==undefined&&![32,40,48,56,64,80,96,112,128,160,192,224,256,320].includes(rule.bitrateKbps))throw new Error(`Invalid MP3 bitrate: ${name}`);
      if(packs.has(name)&&JSON.stringify(packs.get(name))!==JSON.stringify(rule))throw new Error(`Conflicting media pack rules: ${name}`);
      packs.set(name,rule);
    }
    function paths(value,prefix=''){
      for(const [name,path] of Object.entries(value??{})){
        const key=prefix?`${prefix}.${name}`:name;
        if(path&&typeof path==='object'){paths(path,key);continue;}
        try{resourcePath(resourceRoot,path);}catch(error){throw new Error(`${relative(styleRoot,file)} paths.${key}: ${error.message}`);}
        const extension=extname(path).toLowerCase();
        references.push({file,key,path});
        if(/\.(png|webp|jpe?g|avif|svg)$/.test(extension)){
          const rule=config.images?.[key]??{};
          const previous=images.get(path);
          if(previous&&Object.keys(rule).length&&Object.keys(previous).length&&JSON.stringify(previous)!==JSON.stringify(rule))throw new Error(`Conflicting image rules: ${path}`);
          if(!previous||Object.keys(rule).length)images.set(path,rule);
        }else if(/\.(mp3|ogg|wav|m4a|mp4|webm)$/.test(extension)){
          const rule={type:/\.(mp4|webm)$/.test(extension)?'video':'audio',pack:false,...config.media?.[key]};
          if(!['audio','video'].includes(rule.type))throw new Error(`Unsupported media type: ${path}`);
          if(rule.pack!==false&&(typeof rule.pack!=='string'||!/^[-a-z0-9]+$/.test(rule.pack)))throw new Error(`Invalid media pack name: ${path}`);
          if(rule.type==='video'&&rule.pack!==false)throw new Error(`Video packing requires an explicit transcoding strategy; use pack:false: ${path}`);
          if(rule.start!==undefined&&(!Number.isFinite(rule.start)||rule.start<0)||rule.duration!==undefined&&(!Number.isFinite(rule.duration)||rule.duration<=0))throw new Error(`Invalid media time segment: ${path}`);
          const previous=media.get(path);
          if(previous&&(previous.pack!==rule.pack||previous.type!==rule.type))throw new Error(`Conflicting media packing rules: ${path}`);
          media.set(path,{...rule,loop:!!previous?.loop||!!rule.loop});
        }else if(/\.(ttf|otf|woff2?|atlas|skel|json)$/.test(extension))assets.add(path);
        else throw new Error(`Unsupported configured resource: ${path}`);
      }
    }
    paths(config.paths);
  }
  return {resourceRoot,files,images,media,packs,assets,references};
}
