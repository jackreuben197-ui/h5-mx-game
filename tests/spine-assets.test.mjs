import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import spine from '../src/effects/spine/vendor/spine38.js';

for (const [kind, extension, version] of [['win','json','3.8.75'], ['allin-self','skel','3.8.64'], ['allin-other','skel','3.8.64']]) {
  test(`CC ${kind}: parse original asset and render every animation frame with valid mesh UVs`, () => {
    const base = new URL(`../src/assets/style1/resources/spine/${kind}/skeleton.`, import.meta.url);
    const png = readFileSync(new URL(`${base}png`));
    const texture = { getImage: () => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) }), setFilters(){}, setWraps(){} };
    const atlas = new spine.TextureAtlas(readFileSync(new URL(`${base}atlas`), 'utf8'), () => texture);
    const loader = new spine.AtlasAttachmentLoader(atlas);
    const data = extension === 'json' ? new spine.SkeletonJson(loader).readSkeletonData(readFileSync(new URL(`${base}json`),'utf8'))
      : new spine.SkeletonBinary(loader).readSkeletonData(new Uint8Array(readFileSync(new URL(`${base}skel`))));
    assert.equal(data.version, version);
    const skeleton = new spine.Skeleton(data);
    const state = new spine.AnimationState(new spine.AnimationStateData(data));
    const track = state.setAnimation(0, 'animation', false);
    const renderer = new spine.webgl.SkeletonRenderer(null, false);
    let triangles = 0;
    const batch = { setBlendMode(){}, draw(actual, vertices, indices){
      assert.equal(actual, texture);
      for (const index of indices) {
        const vertex = vertices.slice(index * 8, index * 8 + 8);
        assert.equal(vertex.length, 8);
        assert.ok(Array.from(vertex).every(Number.isFinite));
        assert.ok(vertex[6] >= 0 && vertex[6] <= 1 && vertex[7] >= 0 && vertex[7] <= 1, 'UV stays in original atlas');
      }
      triangles += indices.length / 3;
    } };
    for (let i = 0; i <= Math.ceil(track.animation.duration * 60) + 2; i++) {
      state.update(1/60); state.apply(skeleton); skeleton.updateWorldTransform(); renderer.draw(batch, skeleton);
    }
    assert.ok(triangles > 0);
  });
}
