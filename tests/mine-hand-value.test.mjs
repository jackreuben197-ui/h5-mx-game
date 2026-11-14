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

test('Omaha must use exactly two hole cards even when the board is a royal flush',()=>{
 const board=[10,11,12,13,14];
 assert.equal(mineHandValueType(table([17,33],board)),10);
 for(const [gameType,cards] of [[1,[17,33,49,20]],[2,[17,33,49,20,36]],[3,[17,33,49,20,36,52]]])
  assert.notEqual(mineHandValueType(table(cards,board,{gameType})),10);
});
test('6+ recognizes A6789 while ordinary Holdem does not',()=>{
 assert.equal(mineHandValueType(table([14,21],[37,53,9],{pokerType:2})),5);
 assert.equal(mineHandValueType(table([14,21],[37,53,9])),1);
});

test('seat data recomputes a pair into a straight when the river completes broadway',async()=>{
 const {SeatData}=await import('../.test-build/data/SeatData.js');
 const seat=new SeatData(1),changes=[];seat.on(SeatData.CHANGE,s=>changes.push(s.handValueType));
 for(const community of [[5,41,55],[5,41,55,42],[5,41,55,42,59]])
  seat.replace({...table([13,28],community),seatCount:2,handNum:1,presentation:'live'});
 assert.deepEqual(changes,[2,2,5]);
});
