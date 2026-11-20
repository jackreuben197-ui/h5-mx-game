import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.MX_AUDIT_BASE||'http://127.0.0.1:4180';
const out='docs/qa/pc-middle-2026-11-20';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:2000,height:1250}});
 page.on('pageerror',e=>errors.push(e.message));
 const measure=()=>page.evaluate(()=>{
  const read=selector=>{const node=document.querySelector(selector);if(!node||!node.checkVisibility())return null;const r=node.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  return{frame:read('.mx-viewport'),info:read('.mx-room-info'),total:read('.mx-pot'),pool:read('.mx-pool-main'),jackpot:read('.mx-jackpot-pool'),calltime:read('.mx-calltime')};
 });
 const verify=(m,label)=>{
  assert.ok(Math.abs((m.info.left+m.info.right)-(m.frame.left+m.frame.right))<.3,label+': room text is off center');
  assert.ok(m.info.top>=m.frame.top+7.5,label+': room text is clipped at the top');
  const features=[m.jackpot,m.calltime].filter(Boolean);
  for(const feature of features){
   assert.ok(m.info.bottom+7.5<=feature.top,label+': feature overlaps room text');
   assert.ok(feature.bottom+7.5<=m.total.top,label+': feature overlaps total pot');
   if(m.pool)assert.ok(feature.bottom<=m.pool.top,label+': feature overlaps main pot');
  }
  if(!features.length)assert.ok(m.info.bottom+7.5<=m.total.top,label+': room text overlaps total pot');
 };
 for(const layout of ['original','classic','balanced','oval'])for(const [width,height]of [[1440,900],[1920,1080]])for(const scene of ['actions','jackpot','jackpot-calltime']){
  const label=`${layout}/${width}/${scene}`;
  await page.goto(base+'/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width,height,orientation:'auto',scale:110,seats:9}));
  await page.locator('#audit-stage[data-ready=true]').waitFor();
  assert.equal(await page.locator('#audit-stage').getAttribute('data-phase'),'table');
  if(scene!=='actions')await page.locator('.mx-jackpot-pool').waitFor({state:'visible'});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const geometry=await measure();if(scene==='jackpot-calltime')assert.ok(geometry.calltime,'combined fixture must show CallTime');verify(geometry,label);results.push({label,geometry});
  if(width===1440)await page.locator('#audit-stage').screenshot({path:`${out}/${layout}-${scene}.png`});
  if(scene==='jackpot-calltime'){
   await page.locator('#audit-stage').evaluate(node=>{node.style.width='1024px';node.style.height='600px';});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const small=await measure();verify(small,label+'/resized');
   assert.ok(Math.abs(small.jackpot.width-geometry.jackpot.width)<.1,'Jackpot must retain its fixed PC size');
   results.push({label:label+'/resized',geometry:small});
  }
 }
 assert.deepEqual(errors,[]);console.log(`${results.length} PC center/Jackpot/CallTime cases passed, including 110% text and live resize.`);
}finally{await browser.close();await writeFile(out+'/verification.json',JSON.stringify({results,errors},null,2));}
