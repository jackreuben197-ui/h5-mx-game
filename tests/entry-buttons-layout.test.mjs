import test from 'node:test';
import assert from 'node:assert/strict';
import {entryButtonsLayout} from '../.test-build/assets/style1/table/layouts/entry-buttons-layout.js';

const base={info:{left:100,right:240,top:180,bottom:220},stage:{left:0,top:0},avatarTop:280,unit:.25,seatScale:1,join:true,returning:true,mtt:false,mttScale:1,obstacles:[]};
const px=(styles,key,unit)=>parseFloat(styles[key])*unit;

test('short entry space fits two actions below information and above the avatar',()=>{
 const styles=entryButtonsLayout(base),fit=Number(styles['--mx-entry-fit']);
 const join=px(styles,'--mx-entry-join-top',base.unit),back=px(styles,'--mx-entry-return-top',base.unit);
 assert.ok(fit>0&&fit<1);
 assert.ok(join>=base.info.bottom+4);
 assert.ok(back>=join+120*base.unit*fit+4);
 assert.ok(back+120*base.unit*fit<=base.avatarTop-4+1e-9);
 assert.equal(px(styles,'--mx-entry-center-x',base.unit),170);
});

test('entry actions pass occupied public cards and preserve screen gaps across stage scales',()=>{
 const card={left:120,right:220,top:222,bottom:260};
 for(const unit of [.15,.3,.6]){
  const styles=entryButtonsLayout({...base,unit,avatarTop:400,returning:false,obstacles:[card]});
  const top=px(styles,'--mx-entry-join-top',unit);
  assert.ok(top>=card.bottom+4);
  assert.equal(Number(styles['--mx-entry-fit']),1);
 }
 const offCenter=entryButtonsLayout({...base,returning:false,obstacles:[{...card,left:400,right:500}]});
 assert.equal(px(offCenter,'--mx-entry-join-top',base.unit),base.info.bottom+4);
});
