import test from 'node:test';
import assert from 'node:assert/strict';
import {AsyncImage} from '../.test-build/assets/style1/table/AsyncImage.js';
test('seat image hides old bitmap and ignores late load/error after replacement, leave and destroy',()=>{
 const image={hidden:false,src:'old',removeAttribute(){this.src='';}};
 const view=new AsyncImage(image);
 view.set('/old.png','1');image.onload();assert.equal(image.hidden,false);
 const oldLoad=image.onload,oldError=image.onerror;
 view.set('/new.png','2');assert.equal(image.hidden,true);oldLoad();assert.equal(image.hidden,true);
 image.onload();assert.equal(image.hidden,false);oldError();assert.equal(image.hidden,false);
 const newLoad=image.onload;view.set('');newLoad();assert.equal(image.hidden,true);assert.equal(image.src,'');
 view.set('/new.png','3');assert.equal(image.hidden,true);const afterDestroy=image.onload;view.destroy();afterDestroy();assert.equal(image.hidden,true);
});
