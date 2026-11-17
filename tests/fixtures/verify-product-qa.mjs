import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const out=fileURLToPath(new URL('../../docs/qa/product-2026-11-17',import.meta.url));await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true,executablePath:process.env.MX_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[];
try{
 const p=await b.newPage({viewport:{width:1100,height:1200},deviceScaleFactor:1});
 const load=async(layout,scene,extra={})=>{await p.goto('http://127.0.0.1:5173/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width:440,height:layout==='original'?952:782,...extra}),{waitUntil:'domcontentloaded'});await p.locator('#audit-stage[data-ready=true]').waitFor();};
 const save=async(layout,check)=>{await p.locator('#audit-stage').screenshot({path:`${out}/${layout}-${check}.png`});results.push({layout,check,result:'pass'});};
 for(const layout of ['original','balanced','oval','classic']){
  await load(layout,'settings-quick');assert.equal(await p.locator('.mx-settings-tabs button').nth(1).getAttribute('aria-selected'),'true');await save(layout,'quick-tab');
  await load(layout,'bring-deposit');await p.locator('.mx-buyin-cancel').click();assert.match(await p.locator('.mx-buyin-amount').innerText(),/1,?000\s*\+\s*60/);
  const slider=p.locator('.mx-buyin-slider');await slider.focus();await slider.press('End');assert.match(await p.locator('.mx-buyin-amount').innerText(),/4,?000\s*\+\s*60/);assert.equal(await p.locator('.mx-buyin-auto-area').isVisible(),false);await save(layout,'deposit-max');
  await p.locator('.mx-buyin-confirm').click();await p.waitForFunction(()=>document.querySelector('.mx-buyin-overlay').hidden);assert.equal(await p.locator('.mx-seat-mine').count(),1);await save(layout,'deposit-seated');
  for(const scene of ['insurance-rules','insurance-rules-standard','insurance-rules-ev']){
   await load(layout,scene);assert.equal(await p.locator('.mx-insurance-rules').isVisible(),true);assert.equal(await p.locator('.mx-insurance-rules table').count(),scene.endsWith('-ev')?0:3);
   if(!scene.endsWith('-ev')){assert.equal(await p.locator('.mx-insurance-rules tbody tr').count(),60);await p.locator('.mx-insurance-rules .mx-record-body').evaluate(e=>e.scrollTop=e.scrollHeight);}
   await save(layout,scene);await p.locator('.mx-insurance-rules .mx-record-close').click();assert.equal(await p.locator('.mx-insurance-rules').isVisible(),false);
  }
  await load(layout,'settlement-bets',{hero:3,actor:5});
  assert.equal(await p.locator('.mx-seat-bet:visible').count(),0);
  assert.ok(await p.locator('.mx-seat-mine .mx-seat-win').isVisible());
  const winners=p.locator('.mx-seat').filter({has:p.locator('.mx-seat-win:visible')});
  assert.equal(await winners.count(),3);
  const nav=await p.locator('.mx-navigation').boundingBox();
  for(const seat of await winners.all()){
   assert.equal(await seat.locator('.mx-stack').isVisible(),false);
   const [win,chip]=await seat.evaluate(el=>{
    return ['.mx-seat-win','.mx-stack'].map(selector=>el.querySelector(selector).getBoundingClientRect().toJSON());
   });
   assert.ok(Math.abs(win.x+win.width/2-chip.x-chip.width/2)<0.5);
   assert.ok(Math.abs(win.y+win.height/2-chip.y-chip.height/2)<0.5);
   assert.ok(win.bottom<=nav.y+0.5,`${layout} winner must stay above navigation`);
  }
  assert.equal(await p.locator('.mx-stack:visible').count(),6);
  await save(layout,'winner-stack');
  await load(layout,'acting-self');const fold=await p.locator('.mx-operation-fold').boundingBox(),timer=await p.locator('.mx-operation-fold .mx-seat-timer').boundingBox();assert.ok(timer&&timer.width<=fold.width+4);await save(layout,'self-countdown');
  await load(layout,'acting-other');if(layout!=='original')assert.ok(Number(await p.locator('.mx-seat .mx-seat-timer[data-kind=action]:visible').getAttribute('data-remaining'))>0);await save(layout,'opponent-countdown');
  for(const [scene,count]of [['actions',3],['media-voice',4],['media-video',6]]){await load(layout,scene);assert.equal(await p.locator('.mx-nav-button').count(),count);assert.ok(await p.locator('.mx-nav-logo').isVisible());assert.ok(await p.locator('.mx-nav-logo').evaluate(e=>e.complete&&e.naturalWidth>0));await save(layout,scene+'-navigation');}
  await load(layout,'figma');assert.ok(await p.locator('.mx-seat-mine .mx-stack .mx-chip-unit').count());const sizes=await p.locator('.mx-seat-mine .mx-stack').evaluate(e=>[parseFloat(getComputedStyle(e).fontSize),parseFloat(getComputedStyle(e.querySelector('.mx-chip-unit')).fontSize)]);assert.ok(sizes[1]<sizes[0]);await save(layout,'bb-units');
  await load(layout,'sidepots-long');const overflow=await p.locator('.mx-pool-item').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1).length);assert.equal(overflow,0);await save(layout,'long-pools');
  await load(layout,'report-departed');assert.equal(await p.getByRole('button',{name:'保险',exact:true}).count(),0);assert.ok(await p.locator('.mx-record-offline').count());await save(layout,'departed-report');
 }
}catch(e){for(const page of b.contexts().flatMap(c=>c.pages())){await page.screenshot({path:out+'/interaction-failure.png'}).catch(()=>{});console.error(await page.locator('#audit-log').innerText().catch(()=>''));}results.push({result:'fail',error:String(e)});throw e;}finally{await b.close();await writeFile(out+'/product-interactions.json',JSON.stringify(results,null,2));}
console.log(`${results.length} product checks passed`);
