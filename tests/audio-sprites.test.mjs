import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['src/assets/style1/audio/AudioSpritePlayer.ts'],bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'fixture-media',setup(b){b.onResolve({filter:/^virtual:mx-media$/},()=>({path:'media',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const media={"audio/a.wav":{type:"audio",url:"/pack.wav",start:1,duration:2},"audio/b.wav":{type:"audio",url:"/pack.wav",start:3.1,duration:1},"audio/long.mp3":{type:"audio",url:"/long.mp3",playback:"stream",start:0}};'}));}}]});
const {AudioSpritePlayer}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function environment(t){
 const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch;let requests=0;const sources=[];let complete;
 const decoded=new Promise(r=>complete=r);
 globalThis.fetch=async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
 globalThis.AudioContext=class {state='running';destination={};createBufferSource(){const source={connect(){},disconnect(){},start(...args){this.started=args;},stop(){this.stopped=true;}};sources.push(source);return source;}createGain(){return {gain:{value:1},connect(){},disconnect(){}};}decodeAudioData(){return decoded;}close(){return Promise.resolve();}};
 t.after(()=>{globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch;});return {sources,finish(){complete({duration:5});},requests:()=>requests};
}
test('two configured clips share one decoded request and use source-relative offsets',async t=>{
 const env=environment(t),p=new AudioSpritePlayer();p.play('audio/a.wav',{start:.25,duration:.5});p.play('audio/b.wav');env.finish();await tick();
 assert.equal(env.requests(),1);assert.deepEqual(env.sources[0].started,[0,1.25,.5]);assert.deepEqual(env.sources[1].started,[0,3.1,1]);p.destroy();assert.ok(env.sources.every(s=>s.stopped));
});
test('mute or destruction before decode prevents late playback',async t=>{
 const env=environment(t),p=new AudioSpritePlayer();p.play('audio/a.wav');p.stop();env.finish();await tick();assert.equal(env.sources.length,0);p.destroy();
});
test('loop points stay inside the chosen clip, not the whole audio pack',async t=>{
 const env=environment(t),p=new AudioSpritePlayer();p.play('audio/a.wav',{loop:true,start:.5,duration:.75});env.finish();await tick();const source=env.sources[0];assert.equal(source.loopStart,1.5);assert.equal(source.loopEnd,2.25);p.destroy();
});

test('independent long audio bypasses full-buffer fetch/decode and is released on stop',async t=>{
 const env=environment(t),previousAudio=globalThis.Audio,previousCancel=globalThis.cancelAnimationFrame,instances=[];
 globalThis.cancelAnimationFrame=()=>{};
 globalThis.Audio=class extends EventTarget {
  constructor(){super();instances.push(this);}play(){this.played=true;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(key){if(key==='src')this.src='';}load(){this.unloaded=true;}
 };
 t.after(()=>{globalThis.Audio=previousAudio;globalThis.cancelAnimationFrame=previousCancel;});
 const p=new AudioSpritePlayer();p.play('audio/long.mp3',{volume:.5});await tick();
 assert.equal(instances.length,1);assert.equal(instances[0].src,'/long.mp3');assert.equal(instances[0].played,true);assert.equal(instances[0].volume,.5);
 assert.equal(env.requests(),0);assert.equal(env.sources.length,0);
 p.stop();assert.equal(instances[0].paused,true);assert.equal(instances[0].src,'');assert.equal(instances[0].unloaded,true);p.destroy();
});
