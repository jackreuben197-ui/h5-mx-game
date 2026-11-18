import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const out='docs/qa/figma-43-44';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});const results=[];
try{
 const page=await browser.newPage({viewport:{width:1100,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=async(scene,layout,width,height)=>{await page.goto('http://127.0.0.1:5173/tests/fixtures/layout-audit.html?'+new URLSearchParams({scene,layout,width,height}));await page.locator('#audit-stage[data-ready=true]').waitFor();};
 for(const layout of ['original','classic','balanced','oval'])for(const [width,height] of [[440,782],[375,812],[320,400]]){
  await load('settings',layout,width,height);await page.locator('.mx-settings-tabs button').first().blur();
  assert.deepEqual(await page.locator('.mx-settings-layouts button').evaluateAll(es=>es.map(e=>e.dataset.layout)),['original','classic','balanced','oval']);
  assert.ok(await page.locator('.mx-layout-preview').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth===88&&e.naturalHeight===146)));
  const fixed=await page.locator('.mx-settings-fixed').boundingBox();
  assert.equal(await page.locator('.mx-settings-sizes').isVisible(),layout!=='original');
  assert.equal(await page.locator('.mx-settings-backs').isVisible(),layout!=='original');
  if(layout==='original')assert.equal(await page.locator('.mx-settings-desks').evaluate(e=>new Set([...e.children].filter(n=>!n.hidden).map(n=>n.offsetTop)).size),3);
  await page.locator('#audit-stage').screenshot({path:`${out}/settings-${layout}-${width}.png`});
  await page.locator('.mx-settings-appearance-options').evaluate(e=>e.scrollTop=e.scrollHeight);
  assert.deepEqual(await page.locator('.mx-settings-fixed').boundingBox(),fixed);
  if(layout!=='original'){
   assert.equal(await page.locator('.mx-settings-colors').isVisible(),true);
   await page.locator('.mx-settings-desk[aria-label="1"]').click();await page.waitForFunction(()=>document.querySelector('.mx-settings-colors').hidden);
   await page.locator('.mx-settings-solid').click();await page.waitForFunction(()=>!document.querySelector('.mx-settings-colors').hidden);
   await page.locator('.mx-settings-colors').scrollIntoViewIfNeeded();
   await page.locator('#audit-stage').screenshot({path:`${out}/colors-${layout}-${width}.png`});
  }
  for(const next of ['original','classic','balanced','oval']){await page.locator(`.mx-settings-layouts button[data-layout=${next}]`).click();assert.deepEqual(await page.locator('.mx-settings-fixed').boundingBox(),fixed);}
  results.push({layout,width,height,check:'settings order/assets/fixed header/visibility/desk grid/colors',result:'pass'});
  for(const scene of ['squid-result-figma','squid-result']){
   await load(scene,layout,width,height);await page.locator('.mx-squid-result').waitFor();
   assert.equal(await page.locator('.mx-squid-result-row').count(),scene==='squid-result'?9:7);
   assert.equal(await page.locator('.mx-squid-lose').count(),0);
   const stage=await page.locator('#audit-stage').boundingBox(),panel=await page.locator('.mx-squid-result .mx-special-panel').boundingBox();
   assert.ok(panel.x>=stage.x&&panel.y>=stage.y&&panel.x+panel.width<=stage.x+stage.width+1&&panel.y+panel.height<=stage.y+stage.height+1);
   if(scene==='squid-result-figma'){
    assert.ok((await page.locator('.mx-squid-reward').innerText()).startsWith('5X'));
    assert.equal(await page.locator('.mx-squid-result-row strong[data-sign=negative]').count(),2);
    if(width===375){assert.ok(Math.abs(panel.width-317.03)<1);assert.ok(Math.abs(panel.height-457.13)<1);}
   }
   await page.waitForTimeout(500);await page.locator('#audit-stage').screenshot({path:`${out}/${scene}-${layout}-${width}.png`});
   await page.locator('.mx-squid-result').click({position:{x:2,y:2}});assert.equal(await page.locator('.mx-squid-result').isVisible(),false);
   results.push({layout,width,height,check:scene+' geometry/rows/reward/sign/dismiss',result:'pass'});
  }
 }
 await load('squid-result-figma','classic',375,812);await page.locator('.mx-squid-result').waitFor();await page.locator('.mx-squid-result').waitFor({state:'hidden',timeout:6500});results.push({check:'automatic close after five seconds',result:'pass'});
 assert.deepEqual(errors,[]);
}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));}
console.log(results.length+' Figma 43/44 checks passed');
