import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
const root=resolve('src');
async function files(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]))).flat();}
test('shared application code only selects the skin through configuration entries',async()=>{
  for(const file of await files(root)){
    const name=relative(root,file);
    if(!name.endsWith('.ts')||name.startsWith('assets/')||name.startsWith('config/')||name.startsWith('demo/'))continue;
    const source=await readFile(file,'utf8');
    for(const match of source.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)){
      const target=relative(root,resolve(dirname(file),match[1]));
      assert.ok(!target.startsWith('assets/style1/'),`${name} imports skin internals ${match[1]}`);
    }
  }
});
