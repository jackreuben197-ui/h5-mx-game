import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import spine from '../src/effects/spine/vendor/spine38.js';

const desks = [[9,'33background'],[10,'44paizuo'],[11,'skeleton'],[12,'77Background'],[13,'nature_japan88'],[14,'backgroud99']];
for (const [type, name] of desks) {
  test(`Table ${type}: original animation renders two loops, including meshes / clipping / additive slots`, () => {
    const base = new URL(`../src/assets/spine/desks/${type}/${name}.`, import.meta.url);
    const png = readFileSync(new URL(`${base}png`));
    const texture = { getImage: () => ({width:png.readUInt32BE(16),height:png.readUInt32BE(20)}),setFilters(){},setWraps(){} };
    const atlas = new spine.TextureAtlas(readFileSync(new URL(`${base}atlas`),'utf8'), () => texture);
    const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(new Uint8Array(readFileSync(new URL(`${base}skel`))));
    assert.equal(data.version,'3.8.64');
    const skeleton = new spine.Skeleton(data), state = new spine.AnimationState(new spine.AnimationStateData(data));
    const track = state.setAnimation(0,'animation',true);
    const renderer = new spine.webgl.SkeletonRenderer(null,false);
    renderer.premultipliedAlpha = true;
    let triangles=0, loopEvents=0;
    state.addListener({ complete:()=>loopEvents++ });
    const blends = new Set();
    const batch = {setBlendMode(src,dst){blends.add(`${src}:${dst}`);},draw(actual,vertices,indices){
      assert.equal(actual,texture);
      assert.equal(indices.length%3,0);
      for(const index of indices) {
        const vertex=vertices.slice(index*8,index*8+8);
        assert.equal(vertex.length,8);
        assert.ok(Array.from(vertex).every(Number.isFinite));
        assert.ok(vertex[6]>=-0.0001 && vertex[6]<=1.0001 && vertex[7]>=-0.0001 && vertex[7]<=1.0001);
      }
      triangles+=indices.length/3;
    }};
    for(let frame=0;frame<Math.ceil(track.animation.duration*30)*2+2;frame++){
      state.update(1/30);state.apply(skeleton);skeleton.updateWorldTransform();renderer.draw(batch,skeleton);
    }
    assert.ok(triangles>0);assert.ok(loopEvents>=2);
    assert.ok(blends.has('1:771'), 'normal slots use premultiplied alpha');
    if(type===10 || type===12) assert.ok(blends.has('1:1'), 'glowing slots retain additive blending');
    if(type===11) assert.ok(data.skins.some(skin=>skin.getAttachments().some(item=>item.attachment instanceof spine.ClippingAttachment)));
  });
}
