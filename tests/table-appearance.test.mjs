import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTableUi } from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
import { SliderBetGesture } from '../.test-build/assets/style1/table/SliderBetGesture.js';

test('classic avatars use the full 58px design diameter and keep the hero above the menu',()=>{
  const layout=defaultTableUi.createLayout('classic');
  layout.resize(440,782,false,725);
  const positions=layout.positions({seatCount:8,mySeat:1,players:[]});
  for(const seat of positions.values()) assert.equal(Math.round(199*seat.scale*layout.unit*100)/100,58);
  const hero=positions.get(1);
  assert.ok((hero.y+(26*199/58+54)*hero.scale)*layout.unit<=725+1e-9);
});

test('modern dealer markers clear the chip row and the bottom marker stays above the footer',()=>{
  for(const profile of ['classic','balanced','oval']){
    const layout=defaultTableUi.createLayout(profile);
    layout.resize(375,500,false,443);
    const positions=layout.positions({seatCount:8,mySeat:1,players:[]});
    for(const [id,seat] of positions){
      if(id===1){
        assert.ok((seat.y+(seat.dealerY+38.5)*seat.scale)*layout.unit<=443+1e-9);
        assert.ok(seat.dealerX+37.5< -99.5);
      }else{
        // QA profiles place ring-layout dealers beside the chip row; classic below it.
        const dealer={l:seat.dealerX-37.5,r:seat.dealerX+37.5,t:seat.dealerY-38.5,b:seat.dealerY+38.5};
        const chips={l:-99.5,r:99.5,t:102,b:175};
        assert.ok(dealer.r<=chips.l||dealer.l>=chips.r||dealer.b<=chips.t||dealer.t>=chips.b);
      }
    }
  }
});

test('all new layouts retain seat IDs and distinct in-bounds avatars for 2–9 seats',()=>{
  for(const profile of ['classic','balanced','oval'])for(const [width,height] of [[320,400],[320,480],[360,640],[375,500],[390,844],[430,932],[768,1024]])for(let count=2;count<=9;count++)for(let mine=1;mine<=count;mine++){
    const layout=defaultTableUi.createLayout(profile);layout.resize(width,height,false);
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
    const layout=defaultTableUi.createLayout(profile);layout.resize(width,height,false);
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
    const layout=defaultTableUi.createLayout(profile);layout.resize(width,height,false);
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
  const layout=defaultTableUi.createLayout(profile);layout.resize(width,height,false);
  const p=layout.positions({seatCount:9,mySeat:mine,players:[]}).get(mine);
  const avatar=profile==='balanced'?60:profile==='oval'?54:58;
  const ratio=p.scale*layout.unit*199/avatar;
  const cardsY=p.cardsY*p.scale*layout.unit/ratio;
  if(profile==='classic')assert.ok(Math.abs(cardsY+73)<.001);
  else {
   assert.ok(cardsY>=(profile==='oval'?62:65)-.001);
   const styles=layout.content({dual:false,boardSize:1,jackpotHeight:0}).styles;
   const typeY=parseFloat(styles['--mx-ring-hand-type-y']);
   const infoY=parseFloat(styles['--mx-hero-info-y']);
   const scale=p.scale*layout.unit;
   assert.ok(Math.abs((typeY-30-p.cardsY)*scale-28*ratio-2.8*ratio)<.001);
   assert.ok(Math.abs((infoY-typeY-30)*scale-1.5*ratio)<.001);
   assert.ok(Math.abs(height-57-(p.y+infoY*p.scale)*layout.unit-(14*199/avatar+2)*scale-3.6*ratio)<.001);
   assert.ok(p.betX>0&&p.betY<0,'hero bet stays above and to the right of raise');
  }
  assert.ok(Math.abs(p.dealerX*p.scale*layout.unit/ratio-(profile==='classic'?-44:-54))<.001);
  if(profile!=='classic')assert.ok(p.cardsY*p.scale*layout.unit-avatar/2*ratio-28*ratio>=7*ratio-.001,'hand must clear avatar');
 }
});
