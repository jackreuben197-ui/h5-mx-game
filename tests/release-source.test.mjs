import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { releaseSource } from '../scripts/release-source.mjs';
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'mx-release-source-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  git(root,'init');git(root,'config','user.name','Release test');git(root,'config','user.email','test@example.invalid');
  writeFileSync(join(root,'.gitignore'),'node_modules/\n');
  const shell=join(root,'deps/h5-game');mkdirSync(shell,{recursive:true});
  writeFileSync(join(shell,'package.json'),'{}');
  git(root,'add','.');git(root,'commit','-m','fixture');
  return {root,shell};
}
test('vendored H5 with stale submodule pointer uses MX revision and scoped dirty status', t=>{
  const {root,shell}=fixture(t);
  writeFileSync(join(shell,'.git'),'gitdir: ../../.git/modules/deps/h5-game\n');
  writeFileSync(join(root,'unrelated.txt'),'MX change');
  mkdirSync(join(shell,'node_modules'));writeFileSync(join(shell,'node_modules/cache'),'ignored');
  assert.deepEqual(releaseSource(shell,root),{kind:'vendored',path:'deps/h5-game',commit:git(root,'rev-parse','HEAD'),dirty:false});
  writeFileSync(join(shell,'package.json'),'{"changed":true}');
  assert.equal(releaseSource(shell,root).dirty,true);
});
test('vendored H5 without gitfile is not misidentified as an independent repository', t=>{
  const {root,shell}=fixture(t);
  assert.equal(releaseSource(shell,root).kind,'vendored');
});
test('independent H5 checkout reports its own revision and changes', t=>{
  const {root}=fixture(t), {root:shell}=fixture(t);
  const info=releaseSource(shell,root);
  assert.deepEqual(info,{kind:'repository',commit:git(shell,'rev-parse','HEAD'),dirty:false});
  writeFileSync(join(shell,'local.txt'),'changed');
  assert.equal(releaseSource(shell,root).dirty,true);
});
test('source archive has explicit unknown revision instead of adopting a parent repository', t=>{
  const {root}=fixture(t);
  const shell=join(root,'untracked-h5');mkdirSync(shell);writeFileSync(join(shell,'package.json'),'{}');
  assert.deepEqual(releaseSource(shell,root),{kind:'directory',commit:null,dirty:null});
});
