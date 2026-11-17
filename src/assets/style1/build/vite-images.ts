import { componentStyles } from './component-styles.mjs';
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanConfigs } from './asset-config.mjs';
const styleRoot=fileURLToPath(new URL('../',import.meta.url));
const root=fileURLToPath(new URL('../resources/',import.meta.url));
/** Dev has no dependency on generated files or packing. Build resolves the same source-path keys. */
export function imageResources():Plugin {
  let dev=false;
  return {
    name:'mx-image-resources',
    configResolved(config){dev=config.command==='serve';},
    async buildStart(){if(!dev){const {packAssets}=await import('./pack-assets.mjs');await packAssets();}},
    resolveId(id){if(id==='virtual:mx-component-config.css')return '\0mx-component-config.css';if(id==='virtual:mx-images'||id==='virtual:mx-media')return '\0'+id.slice(8);},
    configureServer(server){
      // Adding or deleting a config must invalidate the virtual modules too.
      server.watcher.add(styleRoot);
      for(const event of ['add','unlink'] as const)server.watcher.on(event,(file)=>{
        if(file.startsWith(styleRoot)&&file.endsWith('/config.json')){
          for(const id of ['\0mx-images','\0mx-media','\0mx-component-config.css']){const mod=server.moduleGraph.getModuleById(id);if(mod)server.moduleGraph.invalidateModule(mod);}
          server.ws.send({type:'full-reload'});
        }
      });
    },
    handleHotUpdate(ctx){
      if(ctx.file.startsWith(styleRoot)&&(ctx.file.endsWith('/config.json')||ctx.file===root+'image-sources.json')){
        for(const id of ['\0mx-images','\0mx-media','\0mx-component-config.css']){const mod=ctx.server.moduleGraph.getModuleById(id);if(mod)ctx.server.moduleGraph.invalidateModule(mod);}
        ctx.server.ws.send({type:'full-reload'});return [];
      }
    },
    load(id){
      if(id==='\0mx-component-config.css'){const styles=componentStyles(styleRoot);for(const file of styles.files)this.addWatchFile(file);return styles.css;}
      if(id!=='\0mx-images'&&id!=='\0mx-media')return;
      const catalog=scanConfigs(styleRoot);for(const file of catalog.files)this.addWatchFile(file);
      const imports:string[]=[],seen=new Map<string,string>();
      const asset=(path:string)=>{
        if(seen.has(path))return seen.get(path)!;
        const name=`asset${imports.length}`;imports.push(`import ${name} from ${JSON.stringify(root+path+'?url')};`);
        const value=dev?`new URL(${name},import.meta.url).href`:name;seen.set(path,value);return value;
      };
      if(id==='\0mx-media'){
        const packed=dev?{}:JSON.parse(readFileSync(root+'generated/media.json','utf8'));
        const entries=[...catalog.media].map(([path,rule])=>{
          const p=dev?{file:path,generated:false,start:0,type:rule.type}:packed[path];
          if(!p)throw new Error(`Missing packed media: ${path}`);
          return `${JSON.stringify(path)}:{url:${asset((p.generated?'generated/':'')+p.file)},playback:${JSON.stringify(p.generated?'buffer':'stream')},start:${p.start},duration:${p.duration??'undefined'},type:${JSON.stringify(p.type)}}`;
        });
        return imports.join('\n')+`\nexport const media={${entries.join(',')}};`;
      }
      this.addWatchFile(root+'image-sources.json');
      const manifest=JSON.parse(readFileSync(root+'image-sources.json','utf8'));
      const files='{'+[...catalog.assets].map(path=>`${JSON.stringify(path)}:${asset(path)}`).join(',')+'}';
      const desk=asset(dev?'raw/'+manifest.desk:'generated/desk.webp');
      const desks='{'+Object.entries(manifest.desks).map(([id,path])=>`${JSON.stringify(id)}:${asset(dev?'raw/'+path:`generated/desk-style-${id}.webp`)}`).join(',')+'}';
      const thumbs=dev?"''":asset('generated/desk-thumbs.webp');
      let raw='{}',frames='{}',pages='[]';
      if(dev)raw='{'+[...catalog.images.keys()].map(path=>`${JSON.stringify(path)}:${asset(path)}`).join(',')+'}';
      else{
        const atlas=JSON.parse(readFileSync(root+'generated/images.json','utf8'));
        raw='{'+[...catalog.images].filter(([,rule])=>rule.pack===false).map(([path])=>`${JSON.stringify(path)}:${asset(path)}`).join(',')+'}';
        frames=JSON.stringify(atlas.frames);
        pages='['+atlas.pages.map((p:{file:string;width:number;height:number})=>`{url:${asset('generated/'+p.file)},width:${p.width},height:${p.height}}`).join(',')+']';
      }
      return imports.join('\n')+`\nexport const resources={mode:${JSON.stringify(dev?'raw':'atlas')},desk:${desk},desks:${desks},deskThumbs:${thumbs},preloadPaths:${JSON.stringify([...catalog.images].filter(([,rule])=>rule.preload??rule.pack!==false).map(([path])=>path))},files:${files},rawImages:${raw},frames:${frames},pages:${pages}};`;
    }
  };
}
