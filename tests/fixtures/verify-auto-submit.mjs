import assert from 'node:assert/strict';
const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const base=process.env.MX_AUDIT_URL||'http://127.0.0.1:4180';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
let cases=0;
try {
 const page=await browser.newPage({viewport:{width:1100,height:1300},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const layout of ['original','balanced','oval','classic']){
  await page.goto(base+'/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene:'auto',width:390,height:844}));
  await page.locator('#audit-stage[data-ready=true]').waitFor();
  for(const [choice,action,due] of [['fold','check',0],['fold','fold',10],['check','check',0],['call','call',10],['allin','allin',100]]){
   const result=await page.evaluate(async({layout,choice,action,due})=>{
    const [{ActionControls},{TexasGamePersonalSettings},{makeAuditSnapshot}]=await Promise.all([
     import('/src/assets/style1/table/action-controls.ts'),import('/src/data/TexasGamePersonalSettings.ts'),import('/tests/fixtures/AuditScenarios.ts')]);
    window.autoSubmitAudit?.controls.destroy();
    const prefs=new TexasGamePersonalSettings();prefs.updateAppearance({layout});
    const sent=[],pending=[];
    const controls=new ActionControls((...args)=>{sent.push(args);return new Promise((resolve,reject)=>pending.push({resolve,reject}));},()=>{}, {open(){},close(){}},async()=>{},prefs);
    const old=document.querySelector('.mx-operation');
    if(old){controls.root.style.cssText=old.style.cssText;old.replaceWith(controls.root);}
    else document.querySelector('.mx-table').append(controls.root);
    window.autoSubmitAudit={controls};
    const state=makeAuditSnapshot({layout,scene:'auto',seats:9,hero:1,actor:1,dealer:1,cards:2,scale:100});
    Object.assign(state,{presentation:'live',roundBet:due,canAddTime:true,addTimeCost:10,
     players:state.players.map(p=>p.seat===1?{...p,chips:100,roundBet:0,roundActioned:false}:p)});
    const read=()=>({manual:!controls.root.querySelector('.mx-operation-row').hidden,
     quick:!controls.root.querySelector('.mx-operation-quick').hidden,
     extra:!controls.root.querySelector('.mx-add-time').hidden,
     auto:!controls.root.querySelector('.mx-auto-operation').hidden,
     sent:sent.length});
    const turn={...state,revision:2,actions:['fold',due===0?'check':due>=100?'allin':'call',...(due<100?['raise','allin']:[])],
     betting:{id:'auto-turn',call:due,min:20,max:99,step:1,allIn:100}};
    const frames=[];
    controls.render(state);
    controls.root.querySelector('.mx-auto-'+choice).click();
    controls.render(turn);frames.push(read());
    for(let i=0;i<3;i++){await new Promise(requestAnimationFrame);frames.push(read());}
    controls.render({...turn,pot:turn.pot+1});frames.push(read());
    pending[0].resolve();await Promise.resolve();await new Promise(requestAnimationFrame);frames.push(read());
    // The same snapshot after acknowledgement must not reopen this turn or resend.
    controls.render(turn);frames.push(read());
    controls.render({...turn,presentation:'sync',revision:3});const restored=read();
    // A new authoritative turn remains available for manual input.
    controls.render({...turn,revision:4,betting:{...turn.betting,id:'next-turn'}});const next=read();
    controls.destroy();delete window.autoSubmitAudit;
    return {frames,sent,restored,next};
   },{layout,choice,action,due});
   for(const frame of result.frames){
    assert.deepEqual(frame,{manual:false,quick:false,extra:false,auto:action!=='fold'&&action!=='allin',sent:1},`${layout} ${choice} -> ${action}`);
   }
   assert.deepEqual(result.sent,[[action,action==='allin'?100:undefined]]);
   assert.equal(result.restored.manual,true);assert.equal(result.next.manual,true);
   cases++;
  }
 }
 assert.deepEqual(errors,[]);console.log(`${cases} automatic submission browser cases passed`);
} finally {await browser.close();}
