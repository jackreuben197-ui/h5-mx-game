import test from 'node:test';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import sharp from 'sharp';
import {loadConfigFromFile} from 'vite';
import {scanConfigs,resourcePath} from '../src/assets/style1/build/asset-config.mjs';
import {packImages} from '../src/assets/style1/build/pack-images.mjs';
import {packMedia} from '../src/assets/style1/build/pack-media.mjs';

async function fixture(t){const root=await mkdtemp(join(tmpdir(),'mx-config-assets-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'resources'),{recursive:true});return root;}
async function config(root,name,value){await mkdir(join(root,name),{recursive:true});await writeFile(join(root,name,'config.json'),JSON.stringify(value));}
function wave(frames){const h=Buffer.alloc(44),data=Buffer.alloc(frames*4);for(let i=0;i<frames;i++){data.writeInt16LE(i%3000,i*4);data.writeInt16LE(-(i%3000),i*4+2);}h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(48000,24);h.writeUInt32LE(192000,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);}

test('new config paths are discovered without a manifest; duplicate paths share one atlas frame',async t=>{
 const root=await fixture(t),resource=join(root,'resources');
 await sharp({create:{width:7,height:9,channels:4,background:'#ff1234'}}).png().toFile(join(resource,'new.png'));
 await config(root,'Button',{paths:{fold:'new.png'}});await config(root,'Seat',{paths:{status:'new.png'}});
 const c=scanConfigs(root);assert.equal(c.images.size,1);assert.equal(c.references.length,2);
 const packed=await packImages(c.images,resource,join(resource,'generated'),{width:32,maxHeight:32});
 assert.deepEqual(Object.keys(packed.frames),['new.png']);assert.equal(packed.pages.length,1);
 const f=packed.frames['new.png'];const pixel=await sharp(join(resource,'generated',packed.pages[0].file)).extract({left:f.x,top:f.y,width:1,height:1}).raw().toBuffer();assert.deepEqual([...pixel],[255,18,52,255]);
 await writeFile(join(root,'Button/config.json'),JSON.stringify({paths:{fold:'missing.png'}}));assert.throws(()=>scanConfigs(root),/Button.*paths.fold/);
 assert.throws(()=>resourcePath(resource,'../escape.png'),/relative path/);
});
test('atlas overflow splits pages and an image keeps its complete original path key',async t=>{
 const root=await fixture(t),resource=join(root,'resources');
 for(const path of ['first.png','second.png'])await sharp({create:{width:20,height:20,channels:4,background:'blue'}}).png().toFile(join(resource,path));
 const packed=await packImages(new Map([['first.png',{}],['second.png',{}]]),resource,join(resource,'generated'),{width:32,maxHeight:32});
 assert.equal(packed.pages.length,2);assert.equal(packed.frames['second.png'].page,1);
});
test('audio packing uses exact sample offsets and splits at the decoded memory budget',async t=>{
 const root=await fixture(t),resource=join(root,'resources');
 for(const p of ['first.wav','second.wav'])await writeFile(join(resource,p),wave(9600));
 const entries=new Map([['first.wav',{type:'audio',pack:'sfx'}],['second.wav',{type:'audio',pack:'sfx'}]]);
 const packed=await packMedia(entries,resource,join(resource,'generated'));
 assert.equal(packed['first.wav'].start,0);assert.equal(packed['first.wav'].duration,.2);assert.equal(packed['second.wav'].start,.3);assert.equal(packed['first.wav'].file,packed['second.wav'].file);
 const wav=await readFile(join(resource,'generated',packed['second.wav'].file));assert.equal(wav.readInt16LE(44+(.3*48000+27)*4),27);
 const split=await packMedia(entries,resource,join(resource,'small'),{maxDecodedBytes:160000});assert.notEqual(split['first.wav'].file,split['second.wav'].file);assert.equal(split['second.wav'].start,0);
});
test('video is source-relative and explicitly rejects implicit concatenation',async t=>{
 const root=await fixture(t);await writeFile(join(root,'resources/demo.mp4'),'fixture');
 await config(root,'Video',{paths:{clip:'demo.mp4'},media:{clip:{type:'video',pack:false,start:3,duration:2,preload:'metadata'}}});
 assert.equal(scanConfigs(root).media.get('demo.mp4').start,3);
 await config(root,'Video',{paths:{clip:'demo.mp4'},media:{clip:{type:'video',pack:'all'}}});assert.throws(()=>scanConfigs(root),/transcoding strategy/);
});
test('development virtual modules use source files without any generated atlas dependency',async()=>{
 const loaded=await loadConfigFromFile({command:'serve',mode:'development'},resolve('vite.config.ts'));
 const plugin=loaded.config.plugins.find(p=>p?.name==='mx-image-resources');plugin.configResolved({command:'serve'});
 const context={addWatchFile(){}};
 const images=plugin.load.call(context,'\0mx-images'),media=plugin.load.call(context,'\0mx-media');
 assert.match(images,/raw\/ui\/fold\.png\?url/);assert.doesNotMatch(images,/generated\//);assert.match(images,/frames:\{\},pages:\[\]/);
 assert.match(media,/audio\/fold\.mp3\?url/);assert.doesNotMatch(media,/generated\//);
});

test('MP3 sprites retain sample-count timeline, clip gaps and original path keys',async t=>{
 const root=await fixture(t),resource=join(root,'resources');
 for(const p of ['first.wav','second.wav'])await writeFile(join(resource,p),wave(9600));
 const entries=new Map([['first.wav',{type:'audio',pack:'sfx'}],['second.wav',{type:'audio',pack:'sfx'}]]);
 const packs=new Map([['sfx',{format:'mp3',bitrateKbps:128,sampleRate:48000,channels:2,gapSeconds:.1,maxDecodedBytes:1048576}]]);
 const packed=await packMedia(entries,resource,join(resource,'generated'),{packs});
 assert.equal(packed['first.wav'].file,'audio-sfx-0.mp3');assert.equal(packed['second.wav'].start,.3);assert.equal(packed['second.wav'].duration,.2);
 const file=join(resource,'generated',packed['first.wav'].file);
 const bytes=await readFile(file);assert.ok(bytes.length<.6*48000*4/4);
 const decoded=spawnSync('ffmpeg',['-v','error','-i',file,'-f','s16le','-ar','48000','-ac','2','pipe:1']);assert.equal(decoded.status,0);assert.equal(decoded.stdout.length,.6*48000*4);
 let peak=0;for(let frame=.23*48000;frame<.27*48000;frame++)peak=Math.max(peak,Math.abs(decoded.stdout.readInt16LE(frame*4)));assert.ok(peak<20,`middle of inter-clip gap should remain quiet: ${peak}`);
});

test('duration threshold, loops and explicit standalone rules keep long sources out of packs',async t=>{
 const root=await fixture(t),resource=join(root,'resources');
 for(const [path,frames] of [['short.wav',4800],['boundary.wav',9600],['long.wav',19200],['loop.wav',4800],['solo.wav',4800]])await writeFile(join(resource,path),wave(frames));
 const entries=new Map([['short.wav',{type:'audio',pack:'sfx'}],['boundary.wav',{type:'audio',pack:'sfx'}],['long.wav',{type:'audio',pack:'sfx'}],['loop.wav',{type:'audio',pack:'sfx',loop:true}],['solo.wav',{type:'audio',pack:false}]]);
 const packs=new Map([['sfx',{format:'wav',maxClipSeconds:.2}]]);
 const packed=await packMedia(entries,resource,join(resource,'generated'),{packs});
 for(const path of ['short.wav','boundary.wav'])assert.equal(packed[path].generated,true,path);
 for(const path of ['long.wav','loop.wav','solo.wav']){assert.equal(packed[path].generated,false,path);assert.equal(packed[path].file,path);assert.equal(packed[path].start,0);}
});
test('even short clips stay independent when their decoded footprint exceeds the group budget',async t=>{
 const root=await fixture(t),resource=join(root,'resources');await writeFile(join(resource,'clip.wav'),wave(9600));
 const packed=await packMedia(new Map([['clip.wav',{type:'audio',pack:'sfx'}]]),resource,join(resource,'generated'),{maxDecodedBytes:40000});
 assert.equal(packed['clip.wav'].generated,false);
});
