import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import spine from '../src/effects/spine/vendor/spine38.js';
import {THROW_PROP_EFFECTS} from '../.test-build/assets/style1/effects/spine/ThrowPropConfig.js';

for (const [type, clips] of Object.entries(THROW_PROP_EFFECTS)) {
  test(`CC throw prop ${type} retains every original Spine clip`, () => {
    for (const config of Object.values(clips)) {
      const base = new URL(`../src/assets/style1/resources/spine/prop/${config.spine}`,import.meta.url);
      const atlas = new spine.TextureAtlas(readFileSync(new URL(base.href+'.atlas'),'utf8'), name => {
        const png = readFileSync(new URL(name,base));
        return {getImage:()=>({width:png.readUInt32BE(16),height:png.readUInt32BE(20)}),setFilters(){},setWraps(){}};
      });
      const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(readFileSync(new URL(base.href+'.skel'))));
      assert.match(data.version,/^3\.8\./);
      const animation = data.findAnimation(config.animation);
      assert.ok(animation,`${config.spine}: ${config.animation}`);
      assert.ok(animation.duration > 0);
      const skeleton = new spine.Skeleton(data), state = new spine.AnimationState(new spine.AnimationStateData(data));
      const renderer = new spine.webgl.SkeletonRenderer(null,false);
      let triangles = 0;
      const batch = {setBlendMode(){},draw(_texture,vertices,indices){assert.ok(Array.from(vertices).every(Number.isFinite));triangles+=indices.length/3;}};
      state.setAnimation(0,config.animation,false);
      for(let i=0;i<10;i++){state.update(animation.duration/10);state.apply(skeleton);skeleton.updateWorldTransform();renderer.draw(batch,skeleton);}
      assert.ok(triangles>0,`${config.spine}: ${config.animation} rendered no triangles`);
    }
  });
}
