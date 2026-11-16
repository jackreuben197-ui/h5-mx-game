import test from 'node:test';
import assert from 'node:assert/strict';
import { TableLayout } from '../.test-build/table/TableLayout.js';
import { SliderBetGesture } from '../.test-build/table/SliderBetGesture.js';

test('classic avatars use the full 58px design diameter and keep the hero above the menu',()=>{
  const layout=new TableLayout();
  layout.profile='classic';
  layout.resize(440,782,false,725);
  const positions=layout.positions({seatCount:8,mySeat:1,players:[]});
  for(const seat of positions.values()) assert.equal(Math.round(199*seat.scale*layout.unit*100)/100,58);
  const hero=positions.get(1);
  assert.ok(hero.y*layout.unit+52<=725+1e-9);
});

test('modern dealer markers clear the chip row and the bottom marker stays above the footer',()=>{
  for(const profile of ['classic','balanced','oval']){
    const layout=new TableLayout();
    layout.profile=profile;
    layout.resize(375,500,false,443);
    const positions=layout.positions({seatCount:8,mySeat:1,players:[]});
    for(const [id,seat] of positions){
      if(id===1){
        assert.ok((seat.y+(seat.dealerY+38.5)*seat.scale)*layout.unit<=443+1e-9);
        assert.ok(seat.dealerX+37.5< -99.5);
      }else{
        assert.ok(seat.dealerY-38.5>148);
      }
    }
  }
});

test('all new layouts retain seat IDs and distinct in-bounds avatars for 2–9 seats',()=>{
  for(const profile of ['classic','balanced','oval'])for(const [width,height] of [[320,400],[320,480],[360,640],[375,500],[390,844],[430,932],[768,1024]])for(let count=2;count<=9;count++)for(let mine=1;mine<=count;mine++){
    const layout=new TableLayout();layout.profile=profile;layout.resize(width,height,false);
    const state={seatCount:count,mySeat:mine,players:[]};const seats=layout.positions(state);
    assert.deepEqual([...seats.keys()],Array.from({length:count},(_,i)=>i+1));
    const rects=[...seats].map(([id,p])=>({id,x:p.x*layout.unit,y:p.y*layout.unit,r:199*p.scale*layout.unit/2}));
    for(const p of rects){assert.ok(p.x-p.r>=0&&p.x+p.r<=width,`${profile} ${count}: horizontal bounds`);assert.ok(p.y-p.r>=0&&p.y+p.r<=height,`${profile} ${count}: vertical bounds`);}
    for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++)assert.ok(Math.hypot(rects[a].x-rects[b].x,rects[a].y-rects[b].y)>rects[a].r+rects[b].r,`${profile} ${count}: avatar overlap`);
    assert.equal(seats.get(mine).edge,'bottom');
  }
});

test('portrait layouts keep the hero chip label above the bottom navigation on short screens',()=>{
  for(const profile of ['original','classic','balanced','oval'])for(const [width,height] of [[320,400],[320,480],[375,500],[390,844]])for(let count=2;count<=9;count++){
    const layout=new TableLayout();layout.profile=profile;layout.resize(width,height,false);
    const own=layout.positions({seatCount:count,mySeat:count,players:[]}).get(count);
    // The rendered label ends 148 local units below the avatar at the largest font setting.
    assert.ok((own.y+148*own.scale)*layout.unit<=height-44,`${width}×${height}, ${count} seats: chip label behind navigation`);
  }
});

test('release gesture rejects taps, unchanged amounts, wrong pointers, cancellation and stale turns',()=>{
  const g=new SliderBetGesture();
  g.begin(1,'turn1','0');assert.equal(g.finish(1,'turn1','1'),false);
  g.begin(1,'turn1','0');g.move(1);assert.equal(g.finish(1,'turn1','0'),false);
  g.begin(1,'turn1','0');g.move(1);assert.equal(g.finish(1,'turn2','3'),false);
  g.begin(1,'turn1','0');g.move(1);g.cancel();assert.equal(g.finish(1,'turn1','3'),false);
  assert.equal(g.begin(1,'turn1','0'),true);assert.equal(g.begin(2,'turn1','0'),false);g.move(2);assert.equal(g.finish(2,'turn1','3'),false);assert.equal(g.finish(1,'turn1','3'),false);
  g.begin(1,'turn1','0');g.move(1);assert.equal(g.finish(1,'turn1','3'),true);assert.equal(g.finish(1,'turn1','3'),false);
});
