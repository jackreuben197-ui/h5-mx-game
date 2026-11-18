import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const out='docs/qa/product-2026-11-18';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});const results=[];
try{
 const page=await browser.newPage({viewport:{width:1100,height:1200}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const layout of ['original','balanced','oval','classic']){
  const load=async(scene,width=440,height=782)=>{await page.goto('http://127.0.0.1:5173/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width,height}));await page.locator('#audit-stage[data-ready=true]').waitFor();};
  const save=async(check)=>{await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime<=1500).map(a=>a.finished.catch(()=>{}))));await page.locator('#audit-stage').screenshot({path:`${out}/${layout}-${check}.png`});results.push({layout,check,result:'pass'});};
  await load('settings');assert.equal(await page.locator('.mx-settings-professional').count(),0);
  assert.equal(await page.locator('.mx-settings-decks').isVisible(),true);assert.equal(await page.locator('.mx-settings-sizes').isVisible(),layout!=='original');
  const fixed=await page.locator('.mx-settings-fixed').boundingBox();await page.locator('.mx-settings-appearance-options').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await page.locator('.mx-settings-fixed').boundingBox(),fixed);
  assert.equal(await page.locator('.mx-settings-desks .mx-settings-desk').count(),15);await save('settings');
  await load('actions');await page.locator('.mx-room-info').click();assert.equal(await page.locator('.mx-room-details').isVisible(),true);assert.ok(await page.locator('.mx-room-details .mx-room-settings').isVisible());await save('room-details');
  await load('insurance-rules-standard');const heads=await page.locator('.mx-insurance-rules thead tr').evaluateAll(rows=>rows.map(r=>r.children.length));assert.ok(heads.length&&heads.every(n=>n===4));const rows=await page.locator('.mx-insurance-rules tbody tr').evaluateAll(rows=>rows.map(r=>[...r.children].map(c=>c.textContent)));assert.ok(rows.some(r=>r[0]==='1'&&r[2]==='11'));await save('insurance-odds');
  await load('squid-join');if(await page.locator('.mx-squid-intro').isVisible())await page.locator('.mx-squid-commit').click();await page.locator('.mx-squid-join').click();await page.locator('.mx-seat-mine .mx-seat-squid').waitFor();assert.equal(await page.locator('.mx-seat-mine .mx-seat-squid').innerText(),'0');assert.equal(await page.locator('.mx-seat-mine .mx-seat-squid-mask').isVisible(),false);await save('squid-zero');
  await load('squid-revealed');
  const markers=await page.locator('.mx-seat:not(.mx-seat-mine)').evaluateAll(seats=>seats.map(seat=>{const a=seat.querySelector('.mx-avatar-fallback').getBoundingClientRect(),q=seat.querySelector('.mx-seat-squid').getBoundingClientRect();return Math.abs(q.x-a.x)<=a.width*1.5&&Math.abs(q.y-a.y)<=a.height;}));assert.ok(markers.every(Boolean),'squid must keep avatar-local origin when lowered');await save('squid-revealed');
  await load('squid-result');await page.locator('.mx-squid-result').waitFor();await page.locator('.mx-squid-result').click({position:{x:2,y:2}});assert.equal(await page.locator('.mx-squid-result').isVisible(),false);await save('squid-result-dismiss');
  await load('bring-deposit');await page.locator('.mx-buyin-confirm').click();await page.locator('.mx-buyin-confirm').click();assert.equal(await page.locator('.mx-buyin-close').isVisible(),false);await save('buyin');
  await load('folded');const first=page.locator('.mx-seat-mine .mx-card-slot').first();await first.click();await page.waitForFunction(()=>!!document.querySelector('.mx-seat-mine .mx-card-selected'));await first.click();assert.equal(await page.locator('.mx-seat-mine .mx-card-selected').count(),0);await save('fold-selection');
  await load('flow');for(let step=0;step<8;step++)await page.getByRole('button',{name:'下一步',exact:true}).click();await save('hand-flow');
  await load('settings-quick');assert.equal(await page.locator('.mx-settings-shortcut').count(),5);await save('quick-five');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await writeFile(out+'/feedback-interactions.json',JSON.stringify(results,null,2));}
console.log(results.length+' feedback checks passed');
