import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.MX_AUDIT_BASE||'http://127.0.0.1:4180';
const output='docs/qa/pc-sizing-2026-11-20';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.MX_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[],errors=[],missing=[];
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<.15,`${label}: ${actual} != ${expected}`);
try{
 const page=await browser.newPage({viewport:{width:2000,height:1300}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))missing.push(response.url());});
 const load=async(layout,scene,width,height)=>{
  await page.goto(base+'/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width,height,orientation:'auto',seats:9}));
  await page.locator('#audit-stage[data-ready=true]').waitFor();
  assert.equal(await page.locator('#audit-stage').getAttribute('data-phase'),'table',await page.locator('#audit-log').innerText());
  await page.evaluate(async()=>{
   await Promise.all([...document.querySelectorAll('.mx-record-panel')].flatMap(node=>node.getAnimations()).filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
  });
 };
 const rect=selector=>page.locator(selector).first().boundingBox();
 const font=selector=>page.locator(selector).first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
 for(const [width,height]of [[1440,1024],[1920,1080]]){
  let anchors;
  for(const layout of ['original','classic','balanced','oval']){
   await load(layout,'actions',width,height);
   // Wait only for the finite seat-position animation, never for looping effects.
   await page.waitForFunction(()=>[...document.querySelectorAll('.mx-seat')].every(n=>n.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).every(a=>a.playState==='finished')));
   const avatar=await rect('.mx-seat-mine .mx-avatar-fallback');
   near(avatar.width,93.2945*({original:1,classic:58/60,balanced:1,oval:.9}[layout]),layout+' avatar');
   near((await rect('.mx-board .mx-card')).width,61.76,layout+' public card');
   const centers=await page.locator('.mx-seat').evaluateAll(nodes=>nodes.map(n=>[n.dataset.seat,parseFloat(n.style.left),parseFloat(n.style.top)]));
   if(anchors)assert.deepEqual(centers,anchors,'PC layouts must share seat positions');else anchors=centers;
   assert.ok((await rect('.mx-support-button')).width<110,'support entry must keep its PC design size');
   near((await rect('.mx-menu-back')).width,41.5459,'PC back button');
   near((await rect('.mx-menu')).width,41.5459,'PC settings button');
   near((await rect('.mx-support-button')).width,86.7463,'PC support button');
   await page.locator('.mx-table-safety').evaluate(node=>{node.hidden=false;});
   near((await rect('.mx-table-safety')).width,44.6183,'PC safety button width');
   near((await rect('.mx-table-safety')).height,54.5917,'PC safety button height');
   const frame=await rect('#audit-stage'),nav=await rect('.mx-navigation');
   near(nav.width,600,'PC bottom menu width');near(nav.height,96.1353,'PC bottom menu height');
   near(nav.x+nav.width/2,frame.x+width/2,'PC menu centered');
   near(nav.y+nav.height,frame.y+height,'PC menu bottom alignment');
   for(const button of await page.locator('.mx-operation-row .mx-operation-button:visible').all()){
    const operation=await button.boundingBox();assert.ok(operation.y+operation.height<=nav.y+.2,'bottom menu must not cover operation controls');
   }
   for(const [resizeWidth,resizeHeight]of [[1024,900],[844,390]]){
    await page.locator('#audit-stage').evaluate((node,{w,h})=>{node.style.width=w+'px';node.style.height=h+'px';},{w:resizeWidth,h:resizeHeight});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const density=Math.min(1,resizeWidth/1440,resizeHeight/1024);
    near((await rect('.mx-seat-mine .mx-avatar-fallback')).width,avatar.width*density,'PC avatars retain their aspect ratio under frame scaling');
    near((await rect('.mx-board .mx-card')).width,61.76*density,'PC cards share the frame scale');
    near((await rect('.mx-menu')).width,41.5459*density,'PC settings share the frame scale');
    near((await rect('.mx-support-button')).width,86.7463*density,'PC support shares the frame scale');
   }
   await page.locator('#audit-stage').evaluate((node,{w,h})=>{node.style.width=w+'px';node.style.height=h+'px';},{w:width,h:height});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.locator('#audit-stage').screenshot({path:`${output}/${layout}-${width}-table.png`});
   for(const scene of ['report','history','chat']){
    await load(layout,scene,width,height);
    const panel=await rect('.mx-record-overlay:not([hidden]) .mx-record-panel');
    near(panel.width,452.64,layout+' '+scene+' panel');
    const stage=await rect('#audit-stage');
    assert.ok(panel.x>=stage.x-.2&&panel.x+panel.width<=stage.x+width+.2,'dock must remain inside the table');
    const body=await rect('.mx-record-overlay:not([hidden]) .mx-record-body');
    assert.ok(body.height>80,scene+' must keep a scrollable body');
    if(scene==='report')assert.ok(await font('.mx-report-overlay h2')<31,'report title must keep its PC design size');
    if(scene==='history'){
     await page.locator('.mx-history-details').click();
     near((await rect('.mx-history-overlay .mx-record-panel')).width,452.64,'history detail panel');
    }
    if(width===1440&&layout==='original')await page.locator('#audit-stage').screenshot({path:`${output}/final-${scene}.png`});
   }
   await load(layout,'bring-wallet',width,height);
   await page.locator('.mx-buyin-confirm').click();
   await page.locator('.mx-buyin-panel[data-step=rules]').waitFor();
   near((await rect('.mx-buyin-panel')).width,325,'configuration width');
   near((await rect('.mx-buyin-panel')).height,494,'configuration height');
   if(width===1440&&layout==='original')await page.locator('#audit-stage').screenshot({path:`${output}/final-configuration.png`});
   await page.locator('.mx-buyin-confirm').click();
   await page.locator('.mx-buyin-panel[data-step=amount]').waitFor();
   near((await rect('.mx-buyin-panel')).width,387.03,'buy-in width');
   near((await rect('.mx-buyin-panel')).height,534.13,'buy-in height');
   near(await font('.mx-buyin-amount'),36.86,'buy-in amount font');
   near((await rect('.mx-buyin-confirm')).width,158.35,'buy-in confirm size');
   await page.locator('.mx-wallet-current').click();
   assert.equal(await page.locator('.mx-wallet-list').isVisible(),true,'wallet selector must still open');
   const wallet=await rect('.mx-wallet-list');
   assert.ok(wallet.x>=0&&wallet.x+wallet.width<=width+.2,'wallet list must align with its resized anchor');
   await page.locator('.mx-wallet-current').click();
   const slider=page.locator('.mx-buyin-slider');
   await slider.press('Home');await slider.press('ArrowRight');
   assert.ok(Number(await slider.inputValue())>0,'resized slider must remain interactive');
   if(width===1440&&layout==='original')await page.locator('#audit-stage').screenshot({path:`${output}/final-buy-in.png`});
   results.push({layout,width,height,status:'pass'});
  }
 }
 for(const [width,height]of [[844,390],[1024,600]]){
  await load('original','bring-wallet',width,height);
  await page.locator('.mx-buyin-cancel').click();
  const panel=await rect('.mx-buyin-panel'),stage=await rect('#audit-stage');
  near(panel.width,387.03,'short landscape buy-in width');
  assert.ok(panel.height<=height&&panel.y>=stage.y-.2&&panel.y+panel.height<=stage.y+height+.2,'short PC window must fit vertically');
  await page.locator('.mx-buyin-confirm').click();
  await page.locator('.mx-buyin-overlay').waitFor({state:'hidden'});
 }
 for(const layout of ['original','classic','balanced','oval'])for(const [width,height]of [[440,782],[375,500]]){
  await load(layout,'bring-wallet',width,height);
  assert.equal(await page.locator('.mx-buyin-overlay').getAttribute('data-desktop'),'false');
  await page.locator('.mx-buyin-cancel').click();
  near(await font('.mx-buyin-amount'),29,'portrait amount must retain its previous size');
 }
 for(const scene of ['settings','insurance-rules']){
  await load('original',scene,1440,1024);
  const panel=await rect(scene==='settings'?'.mx-personal-settings':'.mx-record-overlay:not([hidden]) .mx-record-panel');
  near(panel.width,scene==='settings'?437:440,scene+' unchanged width');
  near(panel.height,scene==='settings'?684.8125:510,scene+' unchanged height');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log(`${results.length} PC layout/window combinations passed; report, history, chat, configuration, buy-in, wallet/slider, short windows, 8 portrait cases and unchanged settings/rules verified.`);
}finally{await browser.close();await writeFile(output+'/verification.json',JSON.stringify({results,errors,missing},null,2));}
