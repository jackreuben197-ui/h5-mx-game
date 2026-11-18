import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const out='docs/qa/product-2026-11-18/board-placeholders';await mkdir(out,{recursive:true});
let checks=0;
try{
 const page=await browser.newPage({viewport:{width:1100,height:1200}});
 for(const layout of ['original','balanced','oval','classic'])for(const [width,height] of [[440,782],[320,568]])for(const phase of ['preflop','flop','turn','river','dual-flop','dual-turn','dual-river']){
  await page.goto('http://127.0.0.1:5173/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene:'board-'+phase,width,height}));
  await page.locator('#audit-stage[data-ready=true][data-phase=table]').waitFor();
  const n=phase==='preflop'?0:phase.endsWith('flop')?3:phase.endsWith('turn')?4:5,dual=phase.startsWith('dual-');
  const boards=page.locator('.mx-board');assert.equal(await boards.count(),2);
  for(let i=0;i<2;i++){
   const cards=i===0?n:dual?n:0,slots=i===0&&layout==='classic'?5:cards;
   assert.equal(await boards.nth(i).locator('.mx-public-slot').count(),slots,`${layout}/${phase}/board${i}`);
   assert.equal(await boards.nth(i).locator('.mx-public-slot-empty').count(),slots-cards);
  }
  if(dual){const a=await boards.nth(0).locator('.mx-public-slot').first().boundingBox(),b=await boards.nth(1).locator('.mx-public-slot').first().boundingBox();if(layout==='classic'){assert.ok(b.y>a.y&&b.y<a.y+a.height,`${phase}: second row must overlap first`);assert.ok(Math.abs((b.y-a.y)/a.height-.5)<.03,`${phase}: half-card row pitch`);}else assert.ok(a.y+a.height<=b.y+.5,`${layout}/${phase}: existing spacing`);}
  if(layout==='classic'&&width===440)await page.locator('#audit-stage').screenshot({path:`${out}/${phase}.png`});
  checks++;
 }
 // Reuse the real component to verify that clearing a previously revealed second run removes its slots.
 const cleared=await page.evaluate(async()=>{
  const {PublicCardsView}=await import('/src/assets/style1/table/components/PublicCardsView/PublicCardsView.ts');
  const {PublicCardsData}=await import('/src/data/PublicCardsData.ts');
  const data=new PublicCardsData(),view=new PublicCardsView(data);
  const counts=[];for(const cards of [[],[2,24,43],[2,24,43,38],[]]){data.state={cards,handNum:1,presentation:'sync'};counts.push(view.root.children.length);}view.destroy();return counts;
 });assert.deepEqual(cleared,[0,3,4,0]);
 console.log(`${checks} layout/street/size checks and second-board clear regression passed`);
}finally{await browser.close();}
