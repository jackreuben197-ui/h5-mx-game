import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {componentStyles} from '../src/assets/style1/build/component-styles.mjs';
import {scanConfigs} from '../src/assets/style1/build/asset-config.mjs';
import {loadConfigFromFile} from 'vite';
const style=resolve('src/assets/style1'),base=join(style,'table/components');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}

test('every UI component has a consumed config; every generated CSS reference resolves',()=>{
 const dirs=readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory());assert.equal(dirs.length,58);
 const styles=componentStyles(style);assert.equal(styles.files.length,dirs.length);
 const css=walk(join(style,'table')).filter(f=>f.endsWith('.css')).map(f=>readFileSync(f,'utf8')).join('\n');
 const tokens=new Set();
 for(const dir of dirs){
  const c=JSON.parse(readFileSync(join(base,dir.name,'config.json'))),ts=readFileSync(join(base,dir.name,dir.name+'.ts'),'utf8');
  for(const n of ['w','h'])assert.ok(c[n]==='auto'||Number.isFinite(c[n]),dir.name+'.'+n);
  for(const n of ['x','y'])assert.ok(c.anchor[n]>=0&&c.anchor[n]<=1,dir.name+'.anchor.'+n);
  assert.doesNotMatch(ts,/new URL\([^)]*resources|import\.meta\.glob/);
  assert.ok(Object.keys(c.layout.css).length||/\b(?:config|viewConfig)\.(?:layout|w|h|paths)/.test(ts),dir.name+' must consume config');
  for(const key of Object.keys(c.layout.css)){const token='--mx-'+dir.name+'-'+key;tokens.add(token);assert.ok(css.includes('var('+token+')'),token+' must be used');assert.ok(styles.css.includes(token+':'));}
 }
 for(const match of css.matchAll(/var\((--mx-[A-Z][\w-]*)\)/g))assert.ok(tokens.has(match[1]),match[1]);
 const catalog=scanConfigs(style);assert.ok(catalog.assets.has('loading/Inter.ttf'));assert.ok(catalog.images.has('raw/ui/fold.png'));
});

test('changing a component layout config changes generated CSS without image packing',t=>{
 const root=mkdtempSync(join(tmpdir(),'mx-component-style-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'table/components/Button'),{recursive:true});const file=join(root,'table/components/Button/config.json');
 writeFileSync(file,JSON.stringify({layout:{css:{width:'42px'}}}));assert.match(componentStyles(root).css,/--mx-Button-width:42px/);
 writeFileSync(file,JSON.stringify({layout:{css:{width:'63px'}}}));assert.match(componentStyles(root).css,/--mx-Button-width:63px/);
 writeFileSync(file,JSON.stringify({layout:{css:{width:'1;display:none'}}}));assert.throws(()=>componentStyles(root),/Invalid component layout token/);
});

test('dev resolves font and component styles, keeping native dialog art lazy',async()=>{
 const loaded=await loadConfigFromFile({command:'serve',mode:'development'},resolve('vite.config.ts'));
 const plugin=loaded.config.plugins.find(p=>p?.name==='mx-image-resources');plugin.configResolved({command:'serve'});const ctx={addWatchFile(){}};
 const source=plugin.load.call(ctx,'\0mx-images');assert.match(source,/loading\/Inter\.ttf\?url/);
 const paths=JSON.parse(source.match(/preloadPaths:(\[[^\]]*\])/)[1]);assert.ok(paths.includes('raw/ui/fold.png'));assert.ok(!paths.includes('raw/ui/dialog_bg1_fix.png'));
 assert.equal(plugin.load.call(ctx,'\0mx-component-config.css'),componentStyles(style).css);
 assert.doesNotMatch(source,/generated\//);
});

test('explicit box uses local anchor while auto preserves responsive rules',async()=>{
 const built=await build({entryPoints:[join(style,'table/ComponentBox.ts')],bundle:true,write:false,format:'esm'});
 const {componentBox}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const root={style:{width:'100%',height:'50vh',transformOrigin:'center'}};
 assert.equal(componentBox(root,{w:'auto',h:'auto',anchor:{x:0,y:0}}),root);assert.deepEqual(root.style,{width:'100%',height:'50vh',transformOrigin:'center'});
 componentBox(root,{w:160,h:70,anchor:{x:.5,y:.5}});assert.equal(root.style.width,'160px');assert.equal(root.style.marginLeft,'-80px');assert.equal(root.style.marginTop,'-35px');
});

test('automatic fold and call keep their own configured selected/unselected icons',async()=>{
 const built=await build({entryPoints:[join(base,'AutoOperationView/AutoOperationView.ts')],bundle:true,write:false,format:'esm',plugins:[{name:'ui-test',setup(b){
  b.onResolve({filter:/SpriteAtlas\.js$/},()=>({path:'sprites',namespace:'test'}));
  b.onResolve({filter:/\/dom\.js$/},()=>({path:'dom',namespace:'test'}));
  b.onResolve({filter:/i18nLabel\.js$/},()=>({path:'labels',namespace:'test'}));
  b.onResolve({filter:/i18nMgr\.js$/},()=>({path:'i18n',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='sprites'?'export const SpriteAtlas={paint(node,path){node.icon=path;}}':args.path==='dom'?'export function element(){return {children:[],append(...nodes){this.children.push(...nodes)},setAttribute(){},remove(){}}}':args.path==='labels'?'export const i18nLabel={bind(){}}':'export const i18nMgr={Get(key){return key}}'}));
 }}]});
 const {AutoOperationView}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const view=new AutoOperationView(async()=>{}),[fold,check,call]=view.root.children;
 view.paint();assert.equal(fold.icon,'raw/ui/autoFoldOff.png');assert.equal(call.icon,'raw/ui/autoCallOff.png');assert.equal(check.icon,'raw/ui/autoOff.png');
 fold.onclick();assert.equal(fold.icon,'raw/ui/autoFoldOn.png');call.onclick();assert.equal(call.icon,'raw/ui/autoCallOn.png');assert.equal(fold.icon,'raw/ui/autoFoldOff.png');
});
