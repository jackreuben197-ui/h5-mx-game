import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const out='docs/qa/product-2026-11-19';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1000,height:1150}});page.on('pageerror',e=>errors.push(e.message));
 const load=async(layout,scene,width=440,height=782,extra={})=>{await page.goto('http://127.0.0.1:5173/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width,height,...extra}));await page.locator('#audit-stage[data-ready=true]').waitFor();};
 const save=async(layout,scene,width)=>{const name=`${layout}-${scene}-${width}`;await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime<=5000).map(a=>a.finished.catch(()=>{}))));await page.locator('#audit-stage').screenshot({path:`${out}/${name}.png`});results.push({layout,scene,width,result:'通过',image:name+'.png'});};
 for(const layout of ['original','balanced','oval','classic'])for(const [width,height]of [[320,500],[375,812],[440,782]]){
  await load(layout,'observer-bottom',width,height,{long:1,bb:1});
  const bottom=page.locator('.mx-seat[data-seat="1"]');const avatar=await bottom.locator('.mx-avatar-fallback').boundingBox(),bet=await page.locator(':is(.mx-seat,.mx-seat-bets)[data-seat="1"] .mx-seat-bet').boundingBox();
  assert.ok(bet&&avatar&&bet.y+bet.height<=avatar.y,`${layout} ${width}: 旁观底部下注应在头像上方`);
  const collisions=await page.locator('.mx-seat[data-edge=left],.mx-seat[data-edge=right]').evaluateAll(seats=>seats.filter(s=>{const a=s.querySelector('.mx-avatar-fallback').getBoundingClientRect(),b=(s.querySelector('.mx-seat-bet-chip')??document.querySelector(`.mx-seat-bets[data-seat="${s.dataset.seat}"] .mx-seat-bet-chip`)).getBoundingClientRect();return b.right>a.left+1&&b.left<a.right-1&&b.bottom>a.top+1&&b.top<a.bottom-1;}).map(s=>s.dataset.seat));
  assert.deepEqual(collisions,[],`${layout} ${width}: 长金额图标不能压头像`);await save(layout,'observer-bottom',width);
  await load(layout,'actions',width,height,{scale:110});
  assert.equal(await page.locator('.mx-room-info-compact').count(),1);
  if(layout==='balanced'||layout==='oval'){
   const info=await page.locator('.mx-room-info').boundingBox();
   const quick=await page.locator('.mx-quick-bet').evaluateAll(es=>Math.min(...es.filter(e=>!e.hidden).map(e=>e.getBoundingClientRect().top)));
   assert.ok(info.y+info.height<=quick+1,`${layout} ${width}: 房间信息不能压快捷按钮`);
  }
  if(layout==='oval'){
   const a=await page.locator('.mx-seat-mine .mx-player-action').boundingBox(),b=await page.locator('.mx-operation-raise').boundingBox();
   assert.ok(a&&b&&a.y+a.height<=b.y+1,`椭圆 ${width}: 气泡需完整露出`);
   await page.getByRole('button',{name:'下一步',exact:true}).click();
   await page.getByRole('button',{name:'下一步',exact:true}).click();
  }
  await save(layout,'actions',width);
  await load(layout,'settlement',width,height,{actor:3});await save(layout,'settlement',width);
 }
 for(const scene of ['profile','profile-admin','profile-video'])for(const actor of [1,2]){
  await load('classic',scene,375,812,{actor});const panel=page.locator('.mx-player-profile-overlay');await panel.waitFor();
  if(actor===2)await panel.locator('.mx-player-profile-prop').first().waitFor();
  assert.equal(await panel.locator('.mx-player-profile-prop').count(),actor===1?0:12);
  assert.equal(await panel.locator('.mx-player-profile-balance').count(),1);
  const stats=await panel.locator('.mx-player-profile-stat').allTextContents();assert.equal(stats.length,6);assert.match(stats[3],/VPIP/);assert.match(stats[4],/PFR/);
  await save('classic',scene+'-'+actor+'-data',375);
  await panel.locator('.mx-record-footer button').nth(1).click();assert.equal(await panel.locator('.mx-player-profile-radar').count(),1);await save('classic',scene+'-'+actor+'-allin',375);
  if(actor===2){await panel.locator('.mx-record-footer button').nth(2).click();assert.equal(await panel.locator('.mx-player-profile-gift-choice').count(),6);assert.equal(await panel.locator('.mx-player-profile-balance').count(),1);await save('classic',scene+'-'+actor+'-gift',375);}
  await panel.locator('.mx-record-close').click();assert.equal(await panel.isVisible(),false);
 }
 await load('classic','board-preflop');assert.equal(await page.locator('.mx-public-slot-empty').count(),5);
 const shadows=await page.locator('.mx-public-slot-empty').evaluateAll(es=>es.map(e=>getComputedStyle(e).boxShadow));assert.ok(shadows.every(s=>s.includes('inset')));await save('classic','board-preflop',440);
 assert.deepEqual(errors,[]);
}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));}
console.log(`${results.length} 项浏览器检查通过`);
