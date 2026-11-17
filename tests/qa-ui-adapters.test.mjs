import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function module(path){const result=await build({entryPoints:[path],bundle:true,write:false,format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {AnchoredPopup}=await module('src/assets/style1/table/AnchoredPopup.ts');
const {seatEffectAnchor}=await module('src/assets/style1/table/components/SeatEffectView/SeatEffectView.ts');
function node(rect,w=rect.width,h=rect.height){return {clientWidth:w,clientHeight:h,children:[],listeners:new Map(),style:{setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}},getBoundingClientRect(){return rect},append(n){this.children.push(n)},contains(n){return this===n||this.children.includes(n)},addEventListener(k,v){this.listeners.set(k,v)},removeEventListener(k,v){if(this.listeners.get(k)===v)this.listeners.delete(k)},remove(){this.removed=true}};}

test('wallet popup converts viewport coordinates into its overlay under scale and opens above when needed',()=>{
 const overlay=node({left:50,top:100,right:650,bottom:900,width:600,height:800},300,400);
 const clip=node({left:60,top:120,right:640,bottom:860,width:580,height:740});
 const a=node({left:90,top:730,right:490,bottom:790,width:400,height:60});
 const list=node({width:200,height:100});list.hidden=false;list.offsetHeight=100;
 const popup=new AnchoredPopup(overlay,clip);let closed=0;popup.mount(list,a,()=>closed++);
 assert.equal(popup.position(list,a),true);assert.equal(list.style.left,'20px');assert.equal(list.style.width,'200px');assert.equal(list.style.bottom,'85px');assert.equal(list.style.top,'auto');
 overlay.listeners.get('click')({target:a});assert.equal(closed,0);overlay.listeners.get('click')({target:{}});assert.equal(closed,1);
 popup.destroy();assert.equal(clip.listeners.size,0);assert.equal(overlay.listeners.size,0);assert.equal(list.removed,true);
});
test('wallet popup closes when its anchor scrolls outside the dialog body',()=>{
 const overlay=node({left:0,top:0,right:400,bottom:500,width:400,height:500}),clip=node({top:50,bottom:450,width:400,height:400});
 const anchor=node({left:50,top:460,right:250,bottom:500,width:200,height:40}),list=node({width:200,height:80});list.hidden=false;
 const popup=new AnchoredPopup(overlay,clip);let closed=0;popup.mount(list,anchor,()=>closed++);clip.listeners.get('scroll')();assert.equal(closed,1);popup.destroy();
});
test('WIN and ALLIN use the explicit seat anchor and keep ALLIN anchored to the avatar',()=>{
 const previous=globalThis.getComputedStyle;globalThis.getComputedStyle=()=>({opacity:'0.8'});
 try{for(const scale of [.2,.6,1])for(const layout of ['original','classic','balanced','oval']){
  const seat={dataset:{anchorX:'.5',anchorY:String(2/3)},getBoundingClientRect:()=>({left:300-400*scale,top:500-600*scale,width:800*scale,height:900*scale}),querySelector:()=>({getBoundingClientRect:()=>({width:199*scale})}),closest:()=>({dataset:{tableLayout:layout}})};
  assert.deepEqual(seatEffectAnchor(seat,'win'),{x:300,y:500,scale,opacity:.8});
  for(const effect of ['allin-self','allin-other'])assert.deepEqual(seatEffectAnchor(seat,effect),{x:300,y:500,scale,opacity:.8});
 }}finally{globalThis.getComputedStyle=previous;}
});
