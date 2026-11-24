import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTableUi} from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
import {LayoutClassic} from '../.test-build/assets/style1/table/layouts/LayoutClassic.js';
import {desktopScale,landscapeLayout} from '../.test-build/assets/style1/table/layouts/landscape-layout.js';
import desktop from '../src/assets/style1/table/layouts/desktop.json' with {type:'json'};
import actionButtonConfig from '../.test-build/assets/style1/table/components/ActionButton/config.json' with {type:'json'};
const state={seatCount:9,mySeat:4,players:[]};
test('PC retains the Figma pool, total and board order without moving either board for feature badges',()=>{
 for(const id of ['original','classic','balanced','oval'])for(const [width,height]of [[1440,694],[1920,874],[1024,394]])for(const dual of [false,true])for(const textSize of [.9,1,1.1])for(const jackpotHeight of [0,70,77,147]){
  const layout=defaultTableUi.createLayout(id);layout.resize(width,height,true);
  const content=layout.content({dual,boardSize:1,jackpotHeight,textSize});
  assert.equal(content.pool.x,content.board.x);
  assert.ok(content.pool.y<content.total.y,'Figma places the main pool above the total label');
  const font=Math.min(38*textSize,parseFloat(content.styles['--mx-room-info-max-font']));
  const infoTop=content.info.y-font*1.15*3/2,infoBottom=content.info.y+font*1.15*3/2;
  const boardTop=content.board.y-90*content.board.scale;
  if(!dual){assert.ok(infoTop>content.total.y,'room text uses the space between the total and cards');assert.ok(infoBottom<=boardTop+1e-8);}
  else assert.ok(content.info.x>content.board.x+content.board.scale*334.4/2/(desktop.publicCardWidth/120),'dual-board text stays beside the cards');
  const features=[];
  if(jackpotHeight===77||jackpotHeight===147){const y=parseFloat(content.styles['--mx-jackpot-y']);features.push([y-38.5*layout.suggest,y+38.5*layout.suggest]);}
  if(jackpotHeight===70||jackpotHeight===147){const y=parseFloat(content.styles['--mx-calltime-y']);features.push([y-35*layout.suggest,y+35*layout.suggest]);}
  if(features.length){
   assert.ok(Math.max(...features.map(([,bottom])=>bottom))<content.pool.y-74/2,'feature badges must clear the main pool');
  }
 }
});
test('PC stretches full-frame Figma anchors and keeps all modes on the same geometry',()=>{
  for(const [width,height] of [[1440,1024],[1920,1080],[2560,1440],[844,390],[1024,900],[1025,1024]])for(let count=2;count<=9;count++)for(const mySeat of [0,2]){
    const snapshot={...state,seatCount:count,mySeat};
    const density=desktopScale(width,height),original=landscapeLayout(width,height,count);
    const layouts=['original','classic','balanced','oval'].map(id=>defaultTableUi.createLayout(id));
    const anchorSets=[];
    for(const layout of layouts){
      layout.resize(width,height,true);
      assert.equal(layout.unit,desktop.avatarSize/desktop.avatarDesignSize*density);
      assert.equal(layout.menuScale,1,'all PC menu sizes must match');
      assert.equal(layout.suggest,1,'the uniform PC stage handles artwork scaling');
      const positions=layout.positions(snapshot);
      anchorSets.push([...positions].map(([id,p])=>[id,p.x,p.y]));
      for(const [id,p] of positions){
        const slot=(id-(mySeat||1)+count)%count,old=original[slot];
        assert.ok(Math.abs(p.x*layout.unit-old.x)<1e-7,'the full-frame horizontal anchor must survive coordinate conversion');
        assert.ok(Math.abs(p.y*layout.unit-old.y)<1e-7,'the full-frame vertical anchor must survive coordinate conversion');
        assert.equal(p.scale,1,'only the common stage scales PC artwork');
        assert.equal(p.microphoneSide,old.x<width/2?'left':'right');
      }
      for(const dual of [false,true])for(const size of [.9,1,1.1]){
        const content=layout.content({dual,boardSize:size,jackpotHeight:0});
        const cardWidth=content.board.scale*120*layout.unit;
        if(dual){assert.ok(cardWidth>0&&cardWidth<=desktop.publicCardWidth*size*density*.85+1e-7);assert.ok(content.board.y-90*content.board.scale>content.total.y+45);}
        else assert.ok(Math.abs(cardWidth-desktop.publicCardWidth*size*density)<1e-7);
      }
    }
    for(const anchors of anchorSets)assert.deepEqual(anchors,anchorSets[0],'PC skin selection must not change seat distribution');
  }
});
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
    assert.ok(w>h?content.pool.y<content.total.y:content.total.y<content.pool.y,`${id}: pool order must follow the current orientation`);
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

test('balanced portrait uses the Figma card-back size and avatar corner while PC shares the CC strip',()=>{
  const snapshot={...state,players:[{seat:1,cards:[0,0]},{seat:2,cards:[0,0,0,0,0,0]},{seat:3,cards:[1,2]}]};
  const layout=defaultTableUi.createLayout('balanced');
  for(const [width,height] of [[440,782],[375,500]]){
    layout.resize(width,height,false);
    const placements=layout.positions(snapshot);
    const unit=layout.unit*parseFloat(layout.content({dual:false,boardSize:1,jackpotHeight:0}).styles['--mx-layout-unit']);
    for(const seat of [1,2]){
      const p=placements.get(seat);
      const cardScale=p.cardScale*p.scale*layout.unit;
      assert.equal(p.cardsX,99.5);
      assert.equal(p.cardsY,99.5);
      assert.ok(Math.abs(65*cardScale-16.2*unit)<.001);
      assert.ok(Math.abs(p.backHandSpread/2*cardScale-6.7*unit)<.001);
    }
    assert.equal(placements.get(3).cardsX,0);
    assert.equal(placements.get(3).cardsY,0);
    assert.equal(placements.get(state.mySeat).backHandSpread,undefined);
  }
  layout.resize(782,440,true);
  assert.equal(layout.positions(snapshot).get(1).backHandSpread,56);
});
