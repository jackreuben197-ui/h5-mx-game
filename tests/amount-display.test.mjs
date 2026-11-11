import test from 'node:test';
import assert from 'node:assert/strict';
import { ChipFormatter } from '../.test-build/logic/ChipFormatter.js';
import { StringHelper } from '../.test-build/logic/StringHelper.js';
test('CC chip formatting: wire units, truncation, K/M and fractional display', () => {
  assert.equal(ChipFormatter.format(20000), '200');
  assert.equal(ChipFormatter.format(9469), '94.60');
  assert.equal(ChipFormatter.format(189690), '1.8K');
  assert.equal(ChipFormatter.format(123456789), '1.2M');
  assert.equal(ChipFormatter.format(19), '0.10');
});
test('CC ShowBB uses twice smallBlind without modifying wire amounts', () => {
  const raw = 20000;
  assert.equal(ChipFormatter.format(raw, 1000, true), '10BB');
  assert.equal(ChipFormatter.format(raw, 1000, false), '200');
  assert.equal(raw, 20000);
  assert.equal(new ChipFormatter(1000, false, true).showPlayerBalanceWithShowBB(199), '1');
  assert.equal(new ChipFormatter(1000, false, true).showPlayerBalanceWithShowBB(19), '0.19');
});
test('buy-in and wallet use their original CC methods, not abbreviated table formatting', () => {
  assert.equal(StringHelper.GetLongString(9469), '94.69');
  assert.equal(StringHelper.GetLongStringLocale(36274620), '362,746.20');
});
