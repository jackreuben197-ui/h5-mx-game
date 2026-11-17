import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTableUi} from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
import {LayoutClassic} from '../.test-build/assets/style1/table/layouts/LayoutClassic.js';
const state={seatCount:9,mySeat:4,players:[]};
test('layout content keeps dual boards separate and all coordinates finite across viewports and size settings',()=>{
  for(const id of ['original','classic','balanced','oval'])for(const [w,h] of [[320,400],[375,500],[390,844],[768,1024],[568,320],[844,390]])for(const size of [.9,1,1.1]){
    const layout=defaultTableUi.createLayout(id);layout.resize(w,h,w>h);
    const original=JSON.stringify(state);layout.positions(state);
    const content=layout.content({dual:true,boardSize:size,jackpotHeight:0});
    for(const point of [content.board,content.secondBoard,content.total,content.pool,content.info]){
      assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
      assert.ok(point.x>=0&&point.x<=layout.width&&point.y>=0&&point.y<=layout.height);
    }
    assert.ok(content.secondBoard.y-content.board.y>=176*content.board.scale);
    const controls=layout.controls(state,size);
    assert.ok(controls.scale>0);
    assert.ok(Object.values(controls.styles).every(value=>!value.includes('NaN')&&!value.includes('Infinity')));
    assert.equal(JSON.stringify(state),original,'layout must not mutate room data');
  }
});
test('configured layout instances do not leak viewport changes between tables',()=>{
  const ui={createLayout:()=>new LayoutClassic()};
  const first=ui.createLayout('original'),second=ui.createLayout('oval');
  first.resize(390,844,false);second.resize(320,400,false);
  const before=first.positions(state);
  second.resize(844,390,true);
  assert.deepEqual(first.positions(state),before);
  assert.equal(first.id,'classic');assert.equal(first.landscape,false);
});
test('QA action rows follow the adjusted hero rather than an absolute screen height',()=>{
  for(const [id,offset] of [['classic',-73],['balanced',60],['oval',60]])for(const [w,h]of [[440,782],[375,500]]){
    const layout=defaultTableUi.createLayout(id);layout.resize(w,h,false);
    const own=layout.positions(state).get(state.mySeat),u=Math.min(layout.width/440,layout.height/782)*layout.unit;
    const controls=layout.controls(state,1);
    assert.equal(controls.styles.top,`${own.y*layout.unit+offset*u-28}px`);
    assert.equal(controls.styles['--mx-operation-row-y'],controls.styles.top);
    assert.ok(controls.styles.left.includes(`${own.x*layout.unit}px`));
  }
});

test('modern layouts keep public card width at the same setting for single and dual boards',()=>{
 for(const id of ['classic','balanced','oval'])for(const dual of [false,true])for(const size of [.9,1,1.1]){
  const layout=defaultTableUi.createLayout(id);layout.resize(440,782,false);
  const content=layout.content({dual,boardSize:size,jackpotHeight:0});
  assert.ok(Math.abs(content.board.scale*120*layout.unit-50.59*size)<.001);
 }
});
