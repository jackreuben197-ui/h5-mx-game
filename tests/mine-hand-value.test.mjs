import test from 'node:test';
import assert from 'node:assert/strict';
import { mineHandValueType } from '../.test-build/logic/MineHandValue.js';

const table = (cards, community, extra = {}) => ({
  mySeat: 1, players: [{seat: 1, cards, folded: false}], community, handEnded: false, ...extra,
});

test('CC best-five evaluator updates my visible hand type after each public street', () => {
  assert.equal(mineHandValueType(table([14, 29], [2, 22, 39])), 2); // pair of aces
  assert.equal(mineHandValueType(table([14, 28], [42, 56, 10])), 5); // broadway straight
  assert.equal(mineHandValueType(table([14, 13], [2, 7, 9, 24])), 6); // spade flush
});

test('no hand-type badge for covered cards, preflop, folds or finished hands', () => {
  assert.equal(mineHandValueType(table([0, 29], [2, 22, 39])), undefined);
  assert.equal(mineHandValueType(table([14, 29], [])), undefined);
  assert.equal(mineHandValueType(table([14, 29], [2, 22, 39], {players:[{seat:1,cards:[14,29],folded:true}]})), undefined);
  assert.equal(mineHandValueType(table([14, 29], [2, 22, 39], {handEnded:true})), undefined);
});
