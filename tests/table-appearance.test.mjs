import test from 'node:test';
import assert from 'node:assert/strict';
import { TableLayout } from '../.test-build/table/TableLayout.js';
import { SliderBetGesture } from '../.test-build/table/SliderBetGesture.js';

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

test('top pair bets remain separate from each other and their stack captions',()=>{
  for(const profile of ['classic','balanced','oval'])for(const [width,height] of [[320,400],[375,500],[440,782]])for(const count of [5,7,9]){
    const layout=new TableLayout();layout.profile=profile;layout.resize(width,height,false);
    const positions=[...layout.positions({seatCount:count,mySeat:1,players:[]}).values()];
    const topY=Math.min(...positions.map(p=>p.y)),top=positions.filter(p=>p.y===topY);
    assert.equal(top.length,2);
    const bets=top.map(p=>({left:p.x+(p.betX-80)*p.scale,right:p.x+(p.betX+80)*p.scale,top:p.y+(p.betY-35)*p.scale,stackBottom:p.y+154*p.scale})).sort((a,b)=>a.left-b.left);
    assert.ok(bets[0].right<bets[1].left,`${profile} ${width}×${height}: top bets overlap`);
    assert.ok(bets.every(b=>b.top>b.stackBottom),`${profile}: bet touches stack at 110% text`);
  }
});

test('hero card and dealer offsets stay avatar-relative across viewport and seat changes',()=>{
 for(const profile of ['balanced','oval','classic'])for(const [width,height] of [[320,400],[375,500],[390,844],[440,782],[768,1024]])for(const mine of [1,5,9]){
  const layout=new TableLayout();layout.profile=profile;layout.resize(width,height,false);
  const p=layout.positions({seatCount:9,mySeat:mine,players:[]}).get(mine);
  const avatar=profile==='balanced'?60:profile==='oval'?50:58;
  const ratio=p.scale*layout.unit*199/avatar;
  assert.ok(Math.abs(p.cardsY*p.scale*layout.unit/ratio-(profile==='classic'?-75:65))<.001);
  assert.ok(Math.abs(p.dealerX*p.scale*layout.unit/ratio-(profile==='classic'?-107:-54))<.001);
  if(profile!=='classic')assert.ok(p.cardsY*p.scale*layout.unit-(profile==='balanced'?30:25)*ratio-28*ratio>=7*ratio-.001,'hand must clear avatar');
 }
});
