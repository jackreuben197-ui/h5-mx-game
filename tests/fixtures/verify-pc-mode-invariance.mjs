import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.MX_AUDIT_BASE||'http://127.0.0.1:4180';
const output='docs/qa/pc-mode-invariance-2026-11-20';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.MX_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[],mismatches=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1200}});
 page.on('pageerror',error=>errors.push(error.message));
 const settle=async()=>{
  await page.evaluate(async()=>{
   await document.fonts.ready;
   await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
 };
 const measure=()=>page.evaluate(()=>{
  const frame=document.querySelector('#audit-stage').getBoundingClientRect();
  const nodes=['.mx-viewport','.mx-board','.mx-public-slot','.mx-board .mx-card','.mx-pot','.mx-pool-item','.mx-pot-chip','.mx-room-info','.mx-operation','.mx-operation-button','.mx-quick-bet','.mx-navigation','.mx-nav-button','.mx-menu-back','.mx-menu','.mx-chat-button','.mx-support-button','.mx-table-add-chips','.mx-seat','.mx-hole-cards','.mx-card-slot','.mx-hole-cards .mx-card','.mx-seat-bet','.mx-seat-bet-chip','.mx-dealer','.mx-player-action'];
  const geometry={};
  for(const selector of nodes)geometry[selector]=[...document.querySelectorAll(selector)].filter(node=>node.checkVisibility()).map(node=>{
   const r=node.getBoundingClientRect(),s=getComputedStyle(node);
   return {x:r.x-frame.x,y:r.y-frame.y,width:r.width,height:r.height,backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,border:s.border,borderRadius:s.borderRadius,fontSize:s.fontSize,fontWeight:s.fontWeight,boxShadow:s.boxShadow,backdropFilter:s.backdropFilter};
  });
  const table=document.querySelector('.mx-table'),style=getComputedStyle(table);
  geometry.table={felt:table.dataset.felt,backgroundImage:style.backgroundImage,backgroundColor:style.backgroundColor,feltImage:style.getPropertyValue('--mx-felt-image')};
  return geometry;
 });
 const compare=(actual,expected,label,path='')=>{
  if(typeof expected==='number'&&typeof actual==='number'){
   if(Math.abs(actual-expected)>.15)mismatches.push({label,path,expected,actual});
  }else if(expected&&actual&&typeof expected==='object'&&typeof actual==='object'){
   if(Array.isArray(expected)&&actual.length!==expected.length)mismatches.push({label,path,expected:expected.length,actual:actual.length});
   for(const key of Object.keys(expected))compare(actual[key],expected[key],label,path?path+'.'+key:key);
  }else if(actual!==expected)mismatches.push({label,path,expected,actual});
 };
 const counts=process.env.MX_PC_COUNTS?process.env.MX_PC_COUNTS.split(',').map(Number):[2,3,4,5,6,7,8,9];
 const scenes=process.env.MX_PC_SCENES?.split(',')??['actions','six','observer-bottom'];
 for(const seats of counts)for(const [width,height]of [[1440,900],[1920,1080]])for(const scene of scenes){
  await page.goto(base+'/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout:'balanced',scene,orientation:'auto',width,height,seats,scale:110}));
  await page.locator('#audit-stage[data-ready=true]').waitFor();
  assert.equal(await page.locator('#audit-stage').getAttribute('data-phase'),'table');
  await settle();
  const baseline=await measure();
  for(const layout of ['original','classic','oval','balanced']){
   await page.locator('.mx-menu').click();
   await page.locator('.mx-menu-item[data-menu-action="UITexas_Setting"]').click();
   await page.locator(`.mx-settings-layouts button[data-layout="${layout}"]`).click();
   await page.locator('.mx-personal-settings').press('Escape');
   await settle();
   const geometry=await measure(),label=`${seats}/${width}/${scene}/${layout}`;
   compare(geometry,baseline,label);
   results.push({label,geometry});
   if(seats===8&&width===1440)await page.locator('#audit-stage').screenshot({path:`${output}/${scene}-${layout}.png`});
  }
 }
 assert.deepEqual(errors,[]);
 assert.equal(mismatches.length,0,`${mismatches.length} changes outside the player identity region; see ${output}/verification.json`);
 console.log(`${results.length} live PC mode switches preserved all non-identity geometry, styling and table appearance.`);
}finally{
 await browser.close();
 await writeFile(output+'/verification.json',JSON.stringify({results,mismatches,errors},null,2));
}
