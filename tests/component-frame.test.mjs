import test from 'node:test';
import assert from 'node:assert/strict';
import {componentTopLeft,viewportToLocal} from '../.test-build/ui/ComponentFrame.js';
import {localFrame,viewportAnchor} from '../.test-build/assets/style1/table/LocalFrame.js';

test('explicit boxes preserve the former seat anchor under nested scale and translation',()=>{
  for(const scale of [.15,.55,1,1.1]){
    const node={style:{},dataset:{}};
    const frame=localFrame(node,800,900,.5,2/3);
    const position={x:180,y:230};
    const top=componentTopLeft(frame,position);
    node.getBoundingClientRect=()=>({left:position.x-frame.width*frame.anchor.x*scale,top:position.y-frame.height*frame.anchor.y*scale,width:frame.width*scale,height:frame.height*scale});
    assert.deepEqual(viewportAnchor(node),position);
    assert.equal(top.x,-220);assert.equal(top.y,-370);
    assert.equal(node.style.transformOrigin,'400px 600px');
  }
});
test('cross-component conversion stays explicit and rejects invisible frames',()=>{
  const frame={width:800,height:900,anchor:{x:0,y:0}};
  assert.deepEqual(viewportToLocal({x:210,y:320},{left:10,top:20,width:400,height:450},frame),{x:400,y:600});
  assert.throws(()=>viewportToLocal({x:0,y:0},{left:0,top:0,width:0,height:0},frame));
});
