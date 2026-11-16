import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';
const{chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});const results=[];
try{const p=await b.newPage({viewport:{width:1100,height:1400},isMobile:true,hasTouch:true});
for(const layout of ['original','balanced','oval','classic']){
 const load=async(scene,extra={})=>{await p.goto('http://127.0.0.1:4179/tests/fixtures/layout-audit.html?'+new URLSearchParams({layout,scene,...extra}),{waitUntil:'domcontentloaded'});await p.locator('#audit-stage[data-ready=true]').waitFor();};
 await load('acting-self');const ring=p.locator('.mx-operation-fold>.mx-seat-timer');await ring.waitFor({state:'visible'});
 await p.getByText('逐元素模拟编辑器',{exact:false}).click();await p.getByRole('button',{name:'清除行动光圈',exact:true}).click();await ring.waitFor({state:'hidden'});
 await p.getByRole('button',{name:'轮到该玩家',exact:true}).click();await ring.waitFor({state:'visible'});
 await p.locator('[data-audit-field="handEnded"]').check();await ring.waitFor({state:'hidden'});results.push({layout,test:'clear/restart/end',pass:true});
 await load('countdown-expire');await ring.waitFor({state:'hidden',timeout:8000});results.push({layout,test:'timeout',pass:true});
 await load('acting-self',{orientation:'auto',width:'900',height:'500'});await ring.waitFor({state:'visible'});const a=await ring.boundingBox(),c=await p.locator('.mx-operation-fold').boundingBox();assert.ok(Math.abs(a.width-c.width)<.3);results.push({layout,test:'auto landscape bounds',pass:true});
}
}finally{await b.close();await writeFile('docs/qa/layout-audit-2026-11-16/round2/countdown-results.json',JSON.stringify(results,null,2));}console.log(results.length+' countdown cases passed');
