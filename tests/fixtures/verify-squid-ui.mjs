const {chromium}=await import(process.env.MX_PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
try {const p=await b.newPage({viewport:{width:1000,height:1200}});for(const layout of ['original','balanced','oval','classic']){
 await p.goto(`http://127.0.0.1:5173/tests/fixtures/layout-audit.html?scene=squid-join&layout=${layout}&width=440&height=952`);
 await p.locator('#audit-stage[data-ready=true]').waitFor();
 const intro=p.locator('.mx-squid-intro');if(await intro.isVisible())await p.locator('.mx-squid-commit').click();
 assert.equal(await p.locator('.mx-seat-mine .mx-seat-squid-mask').isVisible(),false);
 await p.locator('.mx-squid-join').click();
 await p.locator('.mx-seat-mine .mx-seat-squid-mask').waitFor({state:'visible'});
 assert.equal(await p.locator('.mx-seat-mine .mx-seat-squid').isVisible(),false);
 await p.locator('.mx-table-toast').waitFor({state:'visible'});
 console.log(layout,await p.locator('.mx-table-toast').innerText());
 await p.locator('.mx-table-toast').waitFor({state:'hidden'});
 await p.getByRole('button',{name:'模拟他人中途加入',exact:true}).click();
 await p.locator('.mx-table-toast').waitFor({state:'visible'});
 await p.locator('.mx-table-toast').waitFor({state:'hidden'});
 await p.getByRole('button',{name:'模拟他人中途加入',exact:true}).click();
 await p.locator('.mx-table-toast').waitFor({state:'visible'});
 assert.ok(await p.locator('.mx-seat:not(.mx-seat-mine) .mx-seat-squid-mask:visible').count());
 await p.locator('#audit-stage').screenshot({path:`/tmp/mx-squid-${layout}.png`});
}console.log('4 layouts: late join mask and repeated notices passed');}finally{await b.close();}
