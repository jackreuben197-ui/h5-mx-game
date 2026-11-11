# Locked Spine 3.8 runtime

Core and declarations: Cocos Creator 2.4.15, engine/extensions/spine/lib/spine.js and spine.d.ts. No Cocos engine is included. Its 3.8.75 JSON and missing-atlas-region behavior is intentionally preserved, matching the existing WIN and ALLIN assets.

WebGL: https://github.com/EsotericSoftware/spine-runtimes/tree/3.8/spine-ts (build/spine-webgl.js, WebGL namespace only). No duplicate core, player UI, or game engine.

Local adaptations:
- CommonJS export becomes ESM; remove obsolete source map link.
- Polygon/shape batch blendFunc becomes blendFuncSeparate(src, dst, ONE, dst): retain straight-alpha texture colors but accumulate correct drawing-buffer alpha for transparent DOM compositing. These three effects use normal blending.
- WebGL clipping passes stride `2` to the Cocos core `clipTriangles` API. The upstream WebGL call omits this Cocos-specific argument, producing empty geometry for clipped emoji assets (octopus/whistle). Covered by original-asset rendering tests.
- Declaration namespace becomes module-local; only used WebGL APIs are declared.

Keep upstream licenses alongside this file. Do not upgrade to a different Spine major/minor without auditing the existing exported assets. Assets retain their original atlas packing and are not repacked with UI sprites.
