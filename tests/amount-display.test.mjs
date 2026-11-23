import test from 'node:test';
import assert from 'node:assert/strict';
import { ChipFormatter } from '../.test-build/logic/ChipFormatter.js';
import { StringHelper } from '../.test-build/logic/StringHelper.js';
test('chip formatting shows full numbers, whole chips and exact sub-chip amounts', () => {
  assert.equal(ChipFormatter.format(20000), '200');
  assert.equal(ChipFormatter.format(9469), '94');
  assert.equal(ChipFormatter.format(189690), '1896');
  assert.equal(ChipFormatter.format(123456789), '1234567');
  assert.equal(ChipFormatter.format(19), '0.19');
});
test('CC ShowBB uses twice smallBlind without modifying wire amounts', () => {
  const raw = 20000;
  assert.equal(ChipFormatter.format(raw, 1000, true), '10BB');
  assert.equal(ChipFormatter.format(raw, 1000, false), '200');
  assert.equal(raw, 20000);
  assert.equal(new ChipFormatter(1000, false, true).showPlayerBalanceWithShowBB(199), '1');
  assert.equal(new ChipFormatter(1000, false, true).showPlayerBalanceWithShowBB(19), '0.19');
});
test('buy-in and wallet keep their monetary precision independently of table labels', () => {
  assert.equal(StringHelper.GetLongString(9469), '94.69');
  assert.equal(StringHelper.GetLongStringLocale(36274620), '362,746.20');
});

test('table chip labels preserve sub-chip and BB values', () => {
  assert.equal(ChipFormatter.tableAmount(170), '1');
  assert.equal(ChipFormatter.tableAmount(90), '0.9');
  assert.equal(ChipFormatter.tableAmount(170, 50, true), '1.70BB');
  assert.equal(ChipFormatter.tableAmount(5), '0.05');
  for (const [raw, expected] of [[0, '0'], [99, '0.99'], [-99, '-0.99'], [100, '1'], [-100, '-1'], [199, '1'], [-199, '-1'], [123456789, '1234567'], [-123456789, '-1234567']]) {
    assert.equal(ChipFormatter.tableAmount(raw), expected);
    assert.equal(ChipFormatter.format(raw), expected);
    assert.equal(new ChipFormatter().showPlayerBalanceWithShowBB(raw), expected);
  }
  assert.equal(ChipFormatter.tableAmount(123456789, 50, true), '1234567.80BB');
  assert.equal(ChipFormatter.tableAmount(170, 0, true), '1');
  assert.equal(ChipFormatter.amount(1234567.89, 1), '1234567');
});
