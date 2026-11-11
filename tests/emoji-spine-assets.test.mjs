import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import spine from '../src/effects/spine/vendor/spine38.js';
import MagicEmojiConfig from '../.test-build/logic/MagicEmojiConfig.js';
for(const config of MagicEmojiConfig.DEFINITIONS) {
 test(`CC emoji ${config.propCode}: original atlas, animation and preview bounds are valid`,()=>{
  const base=new URL('../src/assets/emoji/spine/'+config.spine.split('/').slice(-2).join('/'),import.meta.url);
  const atlas=new spine.TextureAtlas(readFileSync(new URL(base.href+'.atlas'),'utf8'),name=>{
   const png=readFileSync(new URL(name,base));return {getImage:()=>({width:png.readUInt32BE(16),height:png.readUInt32BE(20)}),setFilters(){},setWraps(){}};
  });
  const data=new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(readFileSync(new URL(base.href+'.skel'))));
  assert.match(data.version,/^3\.8\./);const animation=data.findAnimation(config.animation);assert.ok(animation);assert.ok(animation.duration>0);
  const skeleton=new spine.Skeleton(data),state=new spine.AnimationState(new spine.AnimationStateData(data)),offset=new spine.Vector2(),size=new spine.Vector2();state.setAnimation(0,config.animation,false);
  const renderer=new spine.webgl.SkeletonRenderer(null,false);let triangles=0;
  const batch={setBlendMode(){},draw(texture,vertices,indices){assert.ok(Array.from(vertices).every(Number.isFinite));triangles+=indices.length/3}};
  for(let i=0;i<=60;i++){state.update(animation.duration/60);state.apply(skeleton);skeleton.updateWorldTransform();renderer.draw(batch,skeleton);}
  assert.ok(triangles>0);
  for(let i=0;i<=12;i++){skeleton.setToSetupPose();animation.apply(skeleton,0,animation.duration*i/12,false,[],1,spine.MixBlend.replace,spine.MixDirection.mixIn);skeleton.updateWorldTransform();skeleton.getBounds(offset,size,[]);assert.ok([offset.x,offset.y,size.x,size.y].every(Number.isFinite));}
 });
}
