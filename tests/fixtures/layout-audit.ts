/** DEV-only acceptance workbench. Real views, isolated host, no game backend. */
import {GameClient} from '../../src/GameClient.js';
import {TexasGamePersonalSettings,type TableLayoutId} from '../../src/data/TexasGamePersonalSettings.js';
import {i18nMgr} from '../../src/i18n/i18nMgr.js';
import {installAuditInspector} from './AuditInspector.js';
import {AuditHost} from './AuditHost.js';
import {auditScenarios,type AuditOptions} from './AuditScenarios.js';
if(!import.meta.env.DEV)throw Error('Development-only audit');
const q=new URLSearchParams(location.search),scene=q.get('scene')??'figma',layout=q.get('layout')??'balanced';
const width=Number(q.get('width')??440),height=Number(q.get('height')??782),scale=Number(q.get('scale')??100);
const options:AuditOptions={layout,scene,seats:Number(q.get('seats')??(scene==='figma'?8:9)),hero:Number(q.get('hero')??1),actor:Number(q.get('actor')??1),dealer:Number(q.get('dealer')??1),cards:Number(q.get('cards')??2),long:q.get('long')==='1',scale};
const prefs=new TexasGamePersonalSettings();prefs.setSoundOnToStorage(false);prefs.updateAppearance({layout:layout as TableLayoutId,style:layout==='original'?'legacy':'solid',feltColor:q.get('felt')??(layout==='balanced'?'#57427f':layout==='classic'?'#079d80':'#3296d2'),cardBack:'red',publicCardSize:scale,tableTextSize:scale,betButtonSize:scale});prefs.shortCutMode=q.get('quick')==='3'?1:2;prefs.sliderSubmit=q.get('submit')==='release'?'release':'confirm';prefs.setShowBBToStorage(scene==='figma'||q.get('bb')==='1');
const style=document.createElement('style');style.textContent=`html,body{margin:0;background:#101419;color:#eee;font:13px system-ui}#audit-controls{padding:10px;display:flex;gap:7px;flex-wrap:wrap;max-width:1100px}#audit-controls label{display:flex;align-items:center;gap:4px}#audit-stage{position:relative;width:${width}px;height:${height}px;overflow:hidden}.mx-test-menu{display:none!important}#audit-info,#audit-log{max-width:1000px;padding:8px}#audit-log{max-height:150px;overflow:auto}button,select{font:inherit}#audit-controls button{padding:4px 9px}`;document.head.append(style);
const bar=document.querySelector<HTMLElement>('#audit-controls')!,stage=document.querySelector<HTMLElement>('#audit-stage')!;
const info=document.createElement('div'),logNode=document.createElement('ol');info.id='audit-info';logNode.id='audit-log';stage.before(info);stage.after(logNode);
const metadata=auditScenarios.find(s=>s.id===scene);info.textContent=`离线合成数据 · ${metadata?.label??scene}｜${metadata?.steps??''}｜覆盖：${metadata?.covers.join('、')??''}`;
function log(text:string){const li=document.createElement('li');li.textContent=text;logNode.prepend(li);while(logNode.children.length>40)logNode.lastChild?.remove();}
function select(key:string,label:string,values:readonly (string|number|{value:string;text:string})[],value:string){const wrap=document.createElement('label'),node=document.createElement('select');wrap.textContent=label;node.setAttribute('aria-label',key);for(const v of values){const option=document.createElement('option');option.value=typeof v==='object'?v.value:String(v);option.textContent=typeof v==='object'?v.text:String(v);node.append(option);}node.value=value;node.onchange=()=>{q.set(key,node.value);location.search=q.toString();};wrap.append(node);bar.append(wrap);}
select('layout','布局',['original','balanced','oval','classic'],layout);select('scene','场景',auditScenarios.map(s=>({value:s.id,text:`${s.group} · ${s.label}`})),scene);
for(const [key,label,val]of [['seats','人数',options.seats],['hero','本人座位',options.hero],['actor','状态作用座位',options.actor],['dealer','庄家座位',options.dealer]] as const)select(key,label,Array.from({length:key==='seats'?8:options.seats},(_,i)=>i+(key==='seats'?2:1)),String(val));
select('cards','手牌',[2,4,5,6],String(options.cards));select('scale','尺寸',[90,95,100,105,110],String(scale));select('locale','语言',['zh_CN','zh_TW','en','pt'],q.get('locale')??'zh_CN');select('quick','快捷',[3,5],q.get('quick')??'5');select('submit','滑杆',['confirm','release'],q.get('submit')??'confirm');
const host=new AuditHost(options,log);await i18nMgr.initLanguage();i18nMgr.setLanguage(q.get('locale')??'zh_CN');
const target={roomID:909090,matchID:scene.startsWith('mtt-')?900001:0,roomType:0};
const game=new GameClient(stage,{host,preferences:prefs,layout:q.get('orientation')==='auto'?'auto':'portrait',minimumLoadingMs:0,onState:s=>{stage.dataset.phase=s.phase;stage.dataset.hand=String(s.table?.handNum??0);if(s.phase==='error'){stage.dataset.ready='true';log(s.error??'');}},onLeave:()=>log('已离桌；点击重新进入可恢复。')});
function button(label:string,run:()=>unknown){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>log(String(e)));};bar.append(b);}
button('下一步',()=>host.next());button('播放',()=>host.play());button('暂停',()=>host.stop());button('重置发牌',()=>host.reset());button('重连快照',()=>host.publish({},'sync'));button('下一位庄家',()=>host.publish({dealerSeat:(host.state.dealerSeat??0)%host.state.seatCount+1}));button('站起',()=>host.standup());button('离桌',()=>game.leave());button('重新进入',async()=>{await game.enter(target);await host.activate();});button('切桌',async()=>{target.roomID++;await game.enter({...target});});
button('导出场景清单',()=>{const blob=new Blob([JSON.stringify(auditScenarios,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='offline-scenarios.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
await game.enter(target);
if(game.getState().phase==='table'){
 await host.activate();
 await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 const click=(selector:string)=>stage.querySelector<HTMLElement>(selector)?.click();
 if(scene==='raise')click('.mx-operation-raise');
 if(scene==='report')click('.mx-nav-button[data-action="report"]');
 if(scene==='history')click('.mx-nav-button[data-action="replay"]');
 if(scene==='profile')click(`.mx-seat[data-seat="${options.actor}"] .mx-avatar-hit`);
 if(scene==='settings'){click('.mx-menu');click('.mx-menu-item[data-menu-action="UITexas_Setting"]');}
 if(scene==='chat')click('.mx-chat-button');
 if(scene.startsWith('bring-')&&scene!=='bring-out')click(`.mx-seat[data-seat="${options.hero}"] .mx-avatar-fallback`);
 if(scene==='rules')click('.mx-table-add-chips');
 if(scene==='bring-out'){click('.mx-menu');const item=[...stage.querySelectorAll<HTMLButtonElement>('.mx-menu-item')].find(b=>b.textContent?.includes('带出'));item?.click();}
 if(scene==='exit')game.leave();
 if(scene==='switch-room'){target.roomID++;await game.enter({...target});}
}
installAuditInspector(logNode,host);
stage.dataset.ready='true';
window.addEventListener('pagehide',()=>{host.stop();game.destroy();},{once:true});
