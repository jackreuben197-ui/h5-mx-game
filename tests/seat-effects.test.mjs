import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/assets/style1/table/components/SeatEffectView/SeatEffectView.ts'],bundle:true,write:false,format:'esm'});
const {SeatEffectView}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const base = { mine: false, handNum: 1, presentation: 'live', player: { action: '', cards: [], name: 'test' } };
function create() {
  const calls = [], classes = new Set(), actionClasses=new Set();
  const effects = { play: async (key, type) => { calls.push(['play', key, type]); return true; }, stop: key => calls.push(['stop', key]) };
  const target=values=>({classList:{remove:value=>values.delete(value),toggle:(value,on)=>on?values.add(value):values.delete(value)}});
  return { view: new SeatEffectView(3, target(classes), effects,target(actionClasses)), calls, classes, actionClasses, effects };
}
const allin = state => ({...state, player: {...state.player, action: '全下'}});
const win = state => ({...state, player: {...state.player, settlement: {win: {handValueType: 1, collectedChips: 100}}}});

test('ALLIN selects own/other asset, does not restart on unrelated sync, clears on next hand', async () => {
  const { view, calls, classes, actionClasses } = create();
  view.render(base); view.render(allin(base)); await Promise.resolve();
  view.render({...allin(base), presentation:'sync'});
  assert.deepEqual(calls.filter(c=>c[0]==='play'), [['play','3:allin','allin-other']]);
  assert.ok(classes.has('mx-spine-allin'));
  assert.ok(actionClasses.has('mx-spine-allin'),'the elevated bubble follows the ALLIN replacement');
  view.render({...base, handNum: 2});
  assert.ok(!classes.has('mx-spine-allin'));
  assert.ok(!actionClasses.has('mx-spine-allin'),'the next hand restores the elevated bubble');
  view.render(allin({...base, handNum: 2, mine: true}));
  assert.equal(calls.filter(c=>c[0]==='play').at(-1)[2], 'allin-self');
  view.destroy();
});
test('WIN plays only for a live settlement transition, never init/reconnect or BB changes', () => {
  const {view, calls} = create();
  view.render(win({...base, presentation:'sync'})); view.render(win(base));
  assert.equal(calls.filter(c=>c[0]==='play').length, 0);
  view.render({...base, handNum: 2}); view.render(win({...base, handNum: 2}));
  view.render({...win({...base, handNum: 2}), showBB:true, presentation:'sync'});
  assert.deepEqual(calls.filter(c=>c[0]==='play'), [['play','3:win','win']]);
  view.render({...base, handNum: 3});
  assert.equal(calls.at(-1)[1], '3:win');
});
test('late animation load cannot hide a cleared action or a destroyed seat', async () => {
  const {view, effects, classes, actionClasses} = create();
  let resolve;
  effects.play = () => new Promise(done => resolve = done);
  view.render(base); view.render(allin(base)); view.destroy();
  resolve(true); await Promise.resolve();
  assert.ok(!classes.has('mx-spine-allin'));
  assert.ok(!actionClasses.has('mx-spine-allin'));
});

test('ALLIN holds through action/BB/language refreshes and stops specifically at hand end', async () => {
  const {view, calls, classes} = create();
  view.render(base); view.render(allin(base)); await Promise.resolve();
  view.render({...base, showBB:true, presentation:'sync'});
  assert.ok(classes.has('mx-spine-allin'));
  assert.equal(calls.filter(c=>c[0]==='play').length, 1);
  view.render({...base, handEnded:true});
  assert.ok(!classes.has('mx-spine-allin'));
  const plays = calls.filter(c=>c[0]==='play').length;
  view.render({...allin(base), handEnded:true, presentation:'sync'});
  assert.equal(calls.filter(c=>c[0]==='play').length, plays);
});
test('replacement occupant cannot inherit ALLIN even without an intermediate empty-seat render',async()=>{
 const {view,classes}=create();
 view.render(allin({...base,player:{...base.player,userRid:1}}));await Promise.resolve();assert.ok(classes.has('mx-spine-allin'));
 view.render({...base,player:{...base.player,userRid:2}});assert.ok(!classes.has('mx-spine-allin'));
 view.destroy();
});
