import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTableUi} from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
import {LayoutClassic} from '../.test-build/assets/style1/table/layouts/LayoutClassic.js';
import actionButtonConfig from '../.test-build/assets/style1/table/components/ActionButton/config.json' with {type:'json'};
const state={seatCount:9,mySeat:4,players:[]};
test('all three profile layouts consume one configurable button standard and proportional size setting',()=>{
  const buttons=actionButtonConfig.layout.portrait,original={...buttons};
  try{
    for(const dimensions of [original,{...original,sideSize:46,raiseSize:52}]){
      Object.assign(buttons,dimensions);
      for(const id of ['classic','balanced','oval'])for(const [width,height]of [[440,782],[320,400]])for(const size of [.9,1,1.1]){
        const layout=defaultTableUi.createLayout(id);layout.resize(width,height,false);
        const before=layout.positions(state),controls=layout.controls(state,size);
        const unit=Math.min(width/buttons.referenceWidth,height/buttons.referenceHeight)*size;
        assert.ok(Math.abs(actionButtonConfig.w*controls.scale-buttons.sideSize*unit)<1e-9,`${id}: side size ignores shared config`);
        assert.ok(Math.abs(parseFloat(controls.styles['--mx-op-raise-size'])-buttons.raiseSize*unit)<1e-9,`${id}: raise size ignores shared config`);
        assert.deepEqual(layout.positions(state),before,'button size must not move avatars or hands');
        assert.ok(!Object.keys(controls.styles).some(key=>/oval.*(?:size|scale)/.test(key)),'oval must not override shared button dimensions');
      }
    }
  }finally{Object.assign(buttons,original);}
});
test('layout content preserves classic overlapping dual boards and finite coordinates across sizes',()=>{
  for(const id of ['original','classic','balanced','oval'])for(const [w,h] of [[320,400],[375,500],[390,844],[768,1024],[568,320],[844,390]])for(const size of [.9,1,1.1]){
    const layout=defaultTableUi.createLayout(id);layout.resize(w,h,w>h);
    const original=JSON.stringify(state);layout.positions(state);
    const content=layout.content({dual:true,boardSize:size,jackpotHeight:0});
    for(const point of [content.board,content.secondBoard,content.total,content.pool,content.info]){
      assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
      assert.ok(point.x>=0&&point.x<=layout.width&&point.y>=0&&point.y<=layout.height);
    }
    assert.ok(content.total.y<content.pool.y,`${id}: total pot must appear above the main pot`);
    const pitch=content.secondBoard.y-content.board.y;
    if(id==='classic'&&w<=h)assert.ok(Math.abs(pitch-88*content.board.scale)<1e-6,'classic second board overlaps half the first card');
    else assert.ok(pitch>=176*content.board.scale);
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
    assert.equal(controls.styles.top,`${(own.controlsY??own.y)*layout.unit+offset*u-28}px`);
    assert.equal(controls.styles['--mx-operation-row-y'],controls.styles.top);
    assert.ok(controls.styles.left.includes(`${own.x*layout.unit}px`));
  }
});

test('balanced reserves the hand/result rows while keeping the balance anchored to navigation',()=>{
  const layout=defaultTableUi.createLayout('balanced');
  layout.resize(440,956,false,899);
  const before=layout.positions(state);
  const beforeInfo=Number.parseFloat(layout.content({dual:false,boardSize:1,jackpotHeight:0}).styles['--mx-hero-info-y']);
  const beforeOwn=before.get(state.mySeat);
  const arcOverlap=beforeOwn.y*layout.unit+30-(956-169);
  assert.ok(arcOverlap>=-25&&arcOverlap<=15,'the avatar leaves room for the hand-type row and the full result below the balance top');
  layout.resize(440,956,false,879);
  const after=layout.positions(state);
  const afterInfo=Number.parseFloat(layout.content({dual:false,boardSize:1,jackpotHeight:0}).styles['--mx-hero-info-y']);
  const afterOwn=after.get(state.mySeat);
  const beforeBalance=beforeOwn.y+beforeInfo*beforeOwn.scale;
  const afterBalance=afterOwn.y+afterInfo*afterOwn.scale;
  assert.ok(Math.abs((beforeBalance-afterBalance)*layout.unit-20)<.001,'the balance follows the navigation inset');
  assert.deepEqual(after.get(1),before.get(1));
});

test('modern layouts keep public card width at the same setting for single and dual boards',()=>{
 for(const id of ['classic','balanced','oval'])for(const dual of [false,true])for(const size of [.9,1,1.1]){
  const layout=defaultTableUi.createLayout(id);layout.resize(440,782,false);
  const content=layout.content({dual,boardSize:size,jackpotHeight:0});
  assert.ok(Math.abs(content.board.scale*120*layout.unit-50.59*size)<.001);
 }
});

test('balanced uses the avatar bottom-right corner for opponents’ card backs',()=>{
  const snapshot={...state,players:[{seat:1,cards:[0,0]},{seat:2,cards:[0,0,0,0,0,0]},{seat:3,cards:[1,2]}]};
  const layout=defaultTableUi.createLayout('balanced');
  for(const [width,height] of [[440,782],[375,500]]){
    layout.resize(width,height,false);
    const placements=layout.positions(snapshot);
    for(const seat of [1,2]){
      const p=placements.get(seat);
      assert.equal(p.cardsX,99.5);
      assert.equal(p.cardsY,99.5);
      assert.equal(p.backHandSpread,56);
    }
    assert.equal(placements.get(3).cardsX,0);
    assert.equal(placements.get(3).cardsY,0);
    assert.equal(placements.get(state.mySeat).backHandSpread,undefined);
  }
  layout.resize(782,440,true);
  assert.equal(layout.positions(snapshot).get(1).backHandSpread,undefined);
});
