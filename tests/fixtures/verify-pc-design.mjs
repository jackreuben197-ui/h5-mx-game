import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.MX_AUDIT_BASE||'http://127.0.0.1:4180';
const output='docs/qa/pc-design-2026-11-20';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[],failures=[],errors=[],missing=[];
const check=(condition,label,detail)=>{if(!condition)failures.push({label,detail});};
const near=(a,b,label,tolerance=.35)=>check(Number.isFinite(a)&&Math.abs(a-b)<=tolerance,label,{actual:a,expected:b});
try{
 const page=await browser.newPage({viewport:{width:4000,height:1400}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))missing.push(response.url());});
 const load=async(layout,scene,width,height,seats=8,preferences={})=>{
  await page.goto(base+'/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width,height,seats,orientation:'auto',scale:100,...preferences}));
  await page.locator('#audit-stage[data-ready=true]').waitFor();
  assert.equal(await page.locator('#audit-stage').getAttribute('data-phase'),'table');
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 };
 const read=()=>page.evaluate(()=>{
  const frame=document.querySelector('#audit-stage').getBoundingClientRect();
  const rect=node=>{if(!node?.checkVisibility())return null;const r=node.getBoundingClientRect();return{x:r.x-frame.x,y:r.y-frame.y,width:r.width,height:r.height,right:r.right-frame.x,bottom:r.bottom-frame.y,cx:r.x+r.width/2-frame.x,cy:r.y+r.height/2-frame.y};};
  const one=selector=>rect(document.querySelector(selector)),all=selector=>[...document.querySelectorAll(selector)].map(rect).filter(Boolean);
  return{frame:rect(document.querySelector('.mx-viewport')),nav:one('.mx-navigation'),fold:one('.mx-operation-fold'),call:one('.mx-operation-call'),raise:one('.mx-operation-raise'),confirm:one('.mx-raise-confirm'),track:one('.mx-raise-track'),amount:one('.mx-raise-amount'),quick:all('.mx-quick-bet'),auto:all('.mx-auto-operation button'),add:one('.mx-add-time'),cards:all('.mx-seat-mine .mx-card-slot'),boards:all('.mx-board .mx-card'),info:one('.mx-room-info'),total:one('.mx-pot'),pools:all('.mx-pool-item'),jackpot:one('.mx-jackpot-pool'),calltime:one('.mx-calltime'),watch:all('.mx-settlement-watch-button'),support:one('.mx-support-button'),chips:all('.mx-table-add-chips'),chat:one('.mx-chat-button'),wins:all('.mx-seat-mine .mx-seat-win'),seats:[...document.querySelectorAll('.mx-seat')].map(node=>({id:Number(node.dataset.seat),edge:node.dataset.edge,avatar:rect(node.querySelector('.mx-avatar-fallback')),name:rect(node.querySelector('.mx-player-name')),info:rect(node.querySelector('.mx-player-info')),cards:[...node.querySelectorAll('.mx-card-slot')].map(rect).filter(Boolean),border:getComputedStyle(node.querySelector('.mx-avatar-border')).display}))};
 });
 const inside=(r,width,height,label)=>check(r&&r.x>=-.5&&r.y>=-.5&&r.right<=width+.5&&r.bottom<=height+.5,label,r);
 const disjoint=(a,b,label)=>{if(a&&b)check(a.right<=b.x+.5||b.right<=a.x+.5||a.bottom<=b.y+.5||b.bottom<=a.y+.5,label,{a,b});};
 // Independent measurements read from the original Figma 11222:30137 frame.
 const expectedSeats=[[738.0317,840.6394],[208.4585,661.2254],[208.4585,454.2254],[208.4585,246.2254],[737.4585,69.2254],[1229.4585,255.2254],[1229.4585,464.2254],[1229.4585,664.2254]];
 const expectedQuick=[[581.1986,612.4147],[659.3928,547.6803],[740.9678,542.3678],[822.5428,547.6803],[897.3553,611.9303]];
 for(const layout of ['original','classic','balanced','oval']){
  await load(layout,'actions',1440,1024,8,{back:'original'});
  const m=await read();
  near(m.frame.height,1024,layout+' full PC frame');
  for(const seat of m.seats){const expected=expectedSeats[seat.id-1];near(seat.avatar.cx,expected[0],layout+' seat '+seat.id+' x');near(seat.avatar.cy,expected[1],layout+' seat '+seat.id+' y');}
  near(m.boards[0]?.x,573,layout+' public cards x');near(m.boards[0]?.y,413,layout+' public cards y');
  near(m.boards[0]?.width,61.76,layout+' card width');near(m.boards[0]?.height,92.64,layout+' card height');
  near(m.cards[0]?.x,680.4723,layout+' hand x');near(m.cards[0]?.y,689,layout+' hand y');near(m.cards[0]?.width,62.03,layout+' hand width');
  near(m.raise?.cx,741.4821,layout+' raise x');near(m.raise?.cy,638.9981,layout+' raise y');near(m.raise?.width,70.34,layout+' raise size');
  near(m.call?.cx,867.0558,layout+' call x');near(m.call?.cy,730.0469,layout+' call y');near(m.call?.width,66.1,layout+' side button size');
  near(m.fold?.x+m.fold?.width*70.5/147,624.2918,layout+' fold visible center x');near(m.fold?.y+m.fold?.height*70.5/147,729.6516,layout+' fold visible center y');
  near(m.fold?.width*137/147,66.1,layout+' fold visible face size');
  check(m.quick.length===5,layout+' five quick buttons',m.quick.length);
  m.quick.forEach((button,index)=>{near(button.cx,expectedQuick[index][0],layout+' quick '+index+' x');near(button.cy,expectedQuick[index][1],layout+' quick '+index+' y');near(button.width,55.97,layout+' quick '+index+' size');});
  near(m.add?.x,-17,layout+' add time left anchor');near(m.add?.y,792,layout+' add time top');
  near(m.nav.width,600,layout+' navigation width');near(m.nav.y,927.8647,layout+' navigation y');
  if(layout!=='original')for(const seat of m.seats){check(seat.border==='none',layout+' no static avatar ring '+seat.id,seat.border);if(seat.name){check(seat.name.bottom<=seat.avatar.y+.5,layout+' nickname above avatar '+seat.id,seat);inside(seat.name,1440,1024,layout+' nickname stays in frame '+seat.id);}check(seat.info.y>=seat.avatar.bottom-.5,layout+' balance below avatar '+seat.id,seat);}
  await page.locator('#audit-stage').screenshot({path:`${output}/reference-${layout}.png`});
  await page.locator('.mx-operation-raise').click();
  const raised=await read();near(raised.confirm.cx,m.raise.cx,layout+' confirmation x');near(raised.confirm.cy,m.raise.cy,layout+' confirmation y');inside(raised.track,1440,1024,layout+' raise slider stays in frame');
  await page.locator('.mx-raise-range').press('End');
  const edited=await read();inside(edited.amount,1440,1024,layout+' edited raise amount stays in frame');
  await page.locator('#audit-stage').screenshot({path:`${output}/raise-${layout}.png`});
  results.push({layout,kind:'Figma reference',geometry:m});
 }
 for(const layout of ['original','classic','balanced','oval'])for(const cards of [2,4,5,6])for(const scene of ['actions','revealed']){
  await load(layout,scene,1440,1024,9,{cards,back:'original'});
  const hands=await page.locator('.mx-seat:not(.mx-seat-mine) .mx-hole-cards').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map(node=>({cards:[...node.querySelectorAll('.mx-card')].map(card=>{
   const r=card.getBoundingClientRect();
   return {value:Number(card.dataset.cardValue),image:getComputedStyle(card).backgroundImage,aspect:r.width/r.height,extraIndex:!!card.querySelector('.mx-card-index')};
  })})));
  for(const hand of hands){check(hand.cards.length===cards,`${layout}/${cards}/${scene}/card count`,hand);for(const card of hand.cards){check(!card.extraIndex,`${layout}/${cards}/keeps mobile face artwork`,card);if(card.value===0){check(card.image.includes('tableBack.png'),`${layout}/${cards}/existing mobile card back`,card);near(card.aspect,65/87,`${layout}/${cards}/mobile back aspect`,.001);}else near(card.aspect,120/176,`${layout}/${cards}/mobile face aspect`,.001);}}
  const m=await read();
  if(scene==='revealed')for(const seat of m.seats.filter(seat=>seat.id!==1&&seat.cards.length))check(Math.max(...seat.cards.map(card=>card.right))-Math.min(...seat.cards.map(card=>card.x))<=93.8,`${layout}/${cards}/compact opponent face strip`,seat.cards);
  if(cards===2||cards===6)await page.locator('#audit-stage').screenshot({path:`${output}/hand-${scene}-${cards}-${layout}.png`});
  results.push({layout,cards,scene,kind:'Opponent hand style',hands});
 }
 for(const layout of ['original','classic','balanced','oval']){
  await load(layout,'six',1440,900,9,{scale:110});const m=await read();
  for(const card of m.boards){disjoint(card,m.total,layout+'/110%/dual board clears total');for(const button of m.quick)disjoint(card,button,layout+'/110%/dual board clears quick bets');}
  results.push({layout,kind:'110% dual board',geometry:m});
 }
 const widths=[[1440,900],[1920,1080],[2560,1080],[3840,1080],[1025,1024],[1024,768],[844,390]];
 for(const [width,height]of widths)for(const seats of [2,3,4,5,6,7,8,9]){
  await load('balanced','actions',width,height,seats);const m=await read();
  for(const edge of ['left','right']){const column=m.seats.filter(seat=>seat.edge===edge);for(const seat of column)near(seat.avatar.cx,column[0].avatar.cx,`${width}/${seats}/${edge} one column`);}
  const top=m.seats.filter(seat=>seat.edge==='top');
  if(top.length===2){
   near(top[1].avatar.cx-top[0].avatar.cx,219.64*width/1440,`${width}/${seats}/top pair stretches horizontally`);
   const bounds=seat=>[seat.avatar,seat.name,seat.info,...seat.cards].filter(Boolean);
   const right=Math.max(...bounds(top[0]).map(r=>r.right)),left=Math.min(...bounds(top[1]).map(r=>r.x));
   check(left-right>=16*Math.min(1,width/1440,height/1024)-.5,`${width}/${seats}/top pair full player areas remain separate`,{left,right});
  }
  for(const seat of m.seats)inside(seat.avatar,width,height,`${width}/${seats}/avatar ${seat.id}`);
  for(const [name,node]of Object.entries({fold:m.fold,call:m.call,raise:m.raise,nav:m.nav}))inside(node,width,height,`${width}/${seats}/${name}`);
  for(const card of m.cards){disjoint(card,m.fold,`${width}/${seats}/fold clears hand`);disjoint(card,m.call,`${width}/${seats}/call clears hand`);}
  for(const card of m.boards)for(const button of m.quick)disjoint(card,button,`${width}/${seats}/board clears quick bets`);
  for(const pool of m.pools)disjoint(pool,m.total,`${width}/${seats}/pool clears total`);
  if(seats===9)await page.locator('#audit-stage').screenshot({path:`${output}/nine-${width}x${height}.png`});
  results.push({width,height,seats,kind:'PC stretching',geometry:m});
 }
 for(const layout of ['original','classic','balanced','oval'])for(const scene of ['six','revealed','settlement-all','jackpot-calltime']){
  await load(layout,scene,1440,1024,9);const m=await read();
  for(const card of m.boards){inside(card,1440,1024,`${layout}/${scene}/board`);for(const button of m.quick)disjoint(card,button,`${layout}/${scene}/board clears quick bets`);disjoint(card,m.info,`${layout}/${scene}/room info clears board`);}
  for(const win of m.wins)check(win.bottom<=m.nav.y+.5,`${layout}/${scene}/result clears navigation`,{win,nav:m.nav});
  if(scene==='six')for(const seat of m.seats.filter(seat=>seat.id!==1&&seat.cards.length)){const left=Math.min(...seat.cards.map(card=>card.x)),right=Math.max(...seat.cards.map(card=>card.right));check(right-left<=93.2945+.5,`${layout}/${scene}/opponent hand remains compact`,{seat:seat.id,width:right-left});}
  for(const feature of [m.jackpot,m.calltime].filter(Boolean)){disjoint(feature,m.total,`${layout}/${scene}/feature clears total`);disjoint(feature,m.info,`${layout}/${scene}/feature clears room info`);for(const pool of m.pools)disjoint(feature,pool,`${layout}/${scene}/feature clears pool`);}
  if(scene==='revealed')for(const button of m.auto)inside(button,1440,1024,layout+' automatic action');
  await page.locator('#audit-stage').screenshot({path:`${output}/${scene}-${layout}.png`});results.push({layout,scene,kind:'PC state',geometry:m});
 }
 for(const layout of ['original','classic','balanced','oval']){
  let reference;
  for(const [width,height]of [[375,812],[782,800],[1000,1024]]){
   await load(layout,'actions',width,height);const m=await read();
   await load(layout,'watch',width,height);const watched=await read();
   const sizes={support:m.support,chips:m.chips[0],add:m.add,chat:m.chat,watch:watched.watch[0]};
   if(reference)for(const [name,r]of Object.entries(sizes)){check(!!r,`${layout}/${width}/${name} exists`,r);if(r){near(r.width,reference[name].width,`${layout}/${width}/${name} fixed width`);near(r.height,reference[name].height,`${layout}/${width}/${name} fixed height`);}}
   else reference=sizes;
   for(const [name,r]of Object.entries(sizes))check(r&&r.width<85&&r.height<=65,`${layout}/${width}/${name} stays compact`,r);
   if(width===1000)await page.locator('#audit-stage').screenshot({path:`${output}/portrait-square-${layout}.png`});
   results.push({layout,width,height,kind:'Portrait fixed auxiliaries',sizes});
  }
 }
 check(errors.length===0,'browser errors',errors);check(missing.length===0,'missing assets',missing);
 assert.equal(failures.length,0,`${failures.length} design/geometry mismatches; see ${output}/verification.json`);
 console.log(`${results.length} Figma reference, PC stretching/state and portrait auxiliary cases passed.`);
}finally{await browser.close();await writeFile(output+'/verification.json',JSON.stringify({results,failures,errors,missing},null,2));}
