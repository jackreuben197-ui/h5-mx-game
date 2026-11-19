import test from 'node:test';
import assert from 'node:assert/strict';
import { TexasGamePersonalSettings } from '../.test-build/data/TexasGamePersonalSettings.js';

function storage(t) {
  const values=new Map();
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;});
  return values;
}

function configure(settings) {
  settings.updateAppearance({layout:'oval',style:'solid',feltColor:'#3296d2',cardBack:'gold',publicCardSize:110,tableTextSize:90,betButtonSize:105});
  settings.setShowBBToStorage(true);
  settings.setDeskTypeToStorage(12);
  settings.setPokerCardTypeToStorage(2);
  settings.setSoundOnToStorage(false);
  settings.setSliderSubmit('release');
  settings.shortCut3ActionsIndex=[1,2,9];
  settings.shortCut5ActionsIndex=[0,1,5,6,9];
  [10,53,98].forEach((value,index)=>settings.setCustomPotRatio(index,value));
  settings.shortCutMode=2;
  [23,47,61,79,100].forEach((value,index)=>settings.setCustomPotRatio(index,value));
}

function snapshot(settings) {
  return {
    appearance:settings.appearance,showBB:settings.showBB,deskType:settings.deskType,
    pokerCardType:settings.pokerCardType,soundOn:settings.soundOn,sliderSubmit:settings.sliderSubmit,
    mode:settings.shortCutMode,presets3:settings.shortCut3ActionsIndex,presets5:settings.shortCut5ActionsIndex,
    shortcuts:settings.tableShortcuts,
  };
}

test('all table preferences survive reload and stay isolated by account and brand',t=>{
  storage(t);
  const original=new TexasGamePersonalSettings('mx');original.setAccount(101);
  assert.equal(original.hasSavedSoundPreference,false);
  configure(original);
  const expected=snapshot(original);
  const reloaded=new TexasGamePersonalSettings('mx');reloaded.setAccount(101);
  assert.deepEqual(snapshot(reloaded),expected);
  assert.equal(reloaded.hasSavedSoundPreference,true);
  reloaded.shortCutMode=1;
  assert.deepEqual(reloaded.tableShortcuts.map(cut=>cut.name),['10%','53%','98%']);
  reloaded.shortCutMode=2;
  reloaded.setAccount(102);
  const defaults=snapshot(reloaded);
  assert.equal(defaults.mode,1);assert.equal(defaults.shortcuts.length,3);
  assert.equal(defaults.showBB,false);assert.equal(defaults.soundOn,true);
  assert.equal(reloaded.hasSavedSoundPreference,false);
  reloaded.setAccount(101);assert.deepEqual(snapshot(reloaded),expected);
  const otherBrand=new TexasGamePersonalSettings('midnight');otherBrand.setAccount(101);
  assert.deepEqual(snapshot(otherBrand),defaults);
  reloaded.setAccount(0);assert.deepEqual(snapshot(reloaded),defaults);
  reloaded.setAccount(101);assert.deepEqual(snapshot(reloaded),expected);
});

test('legacy migration retains appearance and both custom ratio modes without leaking to another account',t=>{
  storage(t);
  const legacy=new TexasGamePersonalSettings();configure(legacy);
  const expected=snapshot(legacy);
  const migrated=new TexasGamePersonalSettings('mx');migrated.setAccount(101);
  assert.deepEqual(snapshot(migrated),expected);
  migrated.shortCutMode=1;
  assert.deepEqual(migrated.tableShortcuts.map(cut=>cut.name),['10%','53%','98%']);
  const reloaded=new TexasGamePersonalSettings('mx');reloaded.setAccount(101);
  assert.deepEqual(reloaded.tableShortcuts,migrated.tableShortcuts);
  reloaded.setAccount(102);
  assert.equal(reloaded.appearance.layout,'original');
  assert.equal(reloaded.tableShortcuts[0].name,'1/2');
});

test('reset quick settings persists across reload while keeping the rest of the table preferences',t=>{
  storage(t);
  const settings=new TexasGamePersonalSettings('mx');settings.setAccount(101);configure(settings);
  const appearance=settings.appearance;
  settings.resetQuickSettings();
  const reloaded=new TexasGamePersonalSettings('mx');reloaded.setAccount(101);
  assert.deepEqual(reloaded.appearance,appearance);
  assert.equal(reloaded.showBB,true);assert.equal(reloaded.deskType,12);
  assert.equal(reloaded.pokerCardType,2);assert.equal(reloaded.soundOn,false);
  assert.equal(reloaded.sliderSubmit,'confirm');assert.equal(reloaded.shortCutMode,1);
  assert.deepEqual(reloaded.tableShortcuts.map(cut=>cut.name),['1/2','1.0','1.2']);
  reloaded.shortCutMode=2;
  assert.deepEqual(reloaded.tableShortcuts.map(cut=>cut.name),['1/3','1/2','2/3','1.0','1.2']);
});
