import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.MX_AUDIT_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1100,height:1300},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const load=async(layout,scene,width=375,height=568,extra={})=>{
  await page.goto(base+'/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,width,height,...extra}));
  await page.locator('#audit-stage[data-ready=true]').waitFor();
 };
 const status=()=>page.evaluate(()=>{
  const visible=selector=>[...document.querySelectorAll(selector)].filter(e=>e.checkVisibility());
  return {manual:visible('.mx-operation-row button').length,quick:visible('.mx-quick-bet').length,
   extra:visible('.mx-add-time').length,auto:visible('.mx-auto-operation button').map(e=>({class:e.className,disabled:e.disabled})),
   sent:window.submitAudit.sent.length};
 });
 for(const layout of ['original','balanced','oval','classic'])for(const quick of [3,5]){
  await load(layout,'actions',375,568,{quick});
  // Use the real controls with a deferred transport to isolate both acknowledgement and broadcast timing.
  await page.evaluate(async({layout,quick})=>{
   const [{ActionControls},{TexasGamePersonalSettings},{makeAuditSnapshot}]=await Promise.all([
    import('/src/assets/style1/table/action-controls.ts'),import('/src/data/TexasGamePersonalSettings.ts'),import('/tests/fixtures/AuditScenarios.ts')]);
   const prefs=new TexasGamePersonalSettings();prefs.updateAppearance({layout});prefs.shortCutMode=quick===3?1:2;
   const sent=[],pending=[];
   const controls=new ActionControls((...args)=>{sent.push(args);return new Promise((resolve,reject)=>pending.push({resolve,reject}));},()=>{}, {open(){},close(){}},async()=>{},prefs);
   const old=document.querySelector('.mx-operation');controls.root.style.cssText=old.style.cssText;old.replaceWith(controls.root);
   const state=makeAuditSnapshot({layout,scene:'actions',seats:9,hero:1,actor:1,dealer:1,cards:2,scale:100});state.presentation='live';
   controls.render(state);window.submitAudit={controls,prefs,state,sent,pending};
  },{layout,quick});
  assert.equal((await status()).quick,quick);
  await page.locator('.mx-quick-bet').first().click();
  const verifySubmitted=async()=>{
   const s=await status();assert.equal(s.manual,0);assert.equal(s.quick,0);assert.equal(s.extra,0);assert.equal(s.sent,1);
   assert.deepEqual(s.auto.map(b=>b.class),['mx-auto-fold','mx-auto-call']);assert.ok(s.auto.every(b=>!b.disabled));
  };
  await verifySubmitted();
  for(let frame=0;frame<3;frame++){
   await page.evaluate(()=>new Promise(requestAnimationFrame));await verifySubmitted();
  }
  await page.evaluate(()=>{
   const a=window.submitAudit;a.controls.render({...a.state,pot:a.state.pot+1});
   document.querySelector('.mx-quick-bet').click();
  });await verifySubmitted();
  await page.locator('.mx-auto-call').click();assert.equal(await page.locator('.mx-auto-call').getAttribute('aria-pressed'),'true');
  await page.locator('.mx-auto-call').click();assert.equal((await status()).sent,1);
  await page.evaluate(async()=>{window.submitAudit.pending[0].resolve();await Promise.resolve();});await verifySubmitted();
  await page.evaluate(()=>{
   const a=window.submitAudit;a.state={...a.state,actions:[],betting:undefined,roundBet:1000,
    players:a.state.players.map(p=>p.seat===a.state.mySeat?{...p,roundBet:1000,roundActioned:true}:p)};a.controls.render(a.state);
  });await verifySubmitted();
  await page.evaluate(()=>{
   const a=window.submitAudit;a.state={...a.state,actions:['fold','call','raise','allin'],roundBet:2000,
    betting:{id:'next-turn',call:1000,min:2000,max:19999,step:1,allIn:20000}};a.controls.render(a.state);
  });
  assert.equal((await status()).manual,3);assert.equal((await status()).quick,quick);assert.equal((await status()).auto.length,0);
  // A rejected request or authoritative resync restores the turn; an old completion cannot affect a new account.
  await page.evaluate(async()=>{
   const a=window.submitAudit,failed=a.controls.submit('raise',2000).catch(()=>{});a.pending[1].reject(Error('offline rejection'));await failed;
  });assert.equal((await status()).manual,3);assert.equal((await status()).quick,quick);
  await page.evaluate(async()=>{
   const a=window.submitAudit,done=a.controls.submit('raise',2000);a.pending[2].resolve();await done;
   a.state={...a.state,presentation:'sync',revision:a.state.revision+1};a.controls.render(a.state);
  });assert.equal((await status()).manual,3);assert.equal((await status()).quick,quick);
  await page.evaluate(async()=>{
   const a=window.submitAudit,old=a.controls.submit('raise',2000);a.prefs.setAccount(987654);
   a.state={...a.state,betting:{...a.state.betting,id:'new-account'}};a.controls.render(a.state);a.pending[3].resolve();await old;
  });assert.equal((await status()).manual,3);assert.equal((await status()).auto.length,0);
  results.push({layout,quick,test:'immediate submit, delayed acknowledgement/broadcast, retry and account isolation',pass:true});
 }
 for(const layout of ['original','balanced','oval','classic'])for(const [width,height] of [[320,400],[320,480],[320,568],[375,500],[375,667],[390,844],[768,1024],[844,390]]){
  await load(layout,'squid-revealed',width,height,{orientation:'auto'});
  const geometry=await page.evaluate(()=>{
   const menu=document.querySelector('.mx-menu'),label=document.querySelector('.mx-menu-label'),squid=document.querySelector('.mx-squid-count'),stand=document.querySelector('.mx-squid-stand');
   const box=n=>n.getBoundingClientRect().toJSON(),m=box(menu),hit=document.elementFromPoint(m.x+m.width/2,m.y+m.height/2);
   return {orientation:document.querySelector('.mx-table').dataset.orientation,menu:m,label:label.checkVisibility()?box(label):undefined,squid:box(squid),stand:box(stand),menuHit:hit===menu||menu.contains(hit),squidTop:squid.style.top,standTop:stand.style.top};
  });
  const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  assert.equal(overlap(geometry.menu,geometry.squid),false,JSON.stringify({layout,width,height,geometry}));
  if(geometry.label&&geometry.orientation==='portrait')assert.equal(overlap(geometry.label,geometry.squid),false,JSON.stringify({layout,width,height,geometry}));
  assert.ok(geometry.menuHit,`${layout} ${width}x${height}: settings must receive clicks`);
  await page.locator('.mx-menu').click();assert.equal(await page.locator('.mx-menu').getAttribute('aria-expanded'),'true');
  await page.locator('.mx-menu-shade').click({position:{x:width-2,y:2}});
  if(layout==='original'&&((width===320&&height===568)||(width===375&&height===500)))await page.locator('#audit-stage').screenshot({path:`/tmp/mx-submit-settings-${width}-${height}.png`});
  results.push({layout,width,height,test:'settings click; portrait settings/squid separation',pass:true,geometry});
 }
 assert.deepEqual(errors,[]);console.log(`${results.length} browser cases passed`);
} finally {await browser.close();await writeFile('/tmp/mx-submit-settings-results.json',JSON.stringify(results,null,2));}
