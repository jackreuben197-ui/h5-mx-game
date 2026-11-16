import test from 'node:test';
import assert from 'node:assert/strict';
import {SeatData} from '../.test-build/data/SeatData.js';
test('own action countdown moves to Fold while opponents and keep-seat data stay available',()=>{
 const mine=new SeatData(3),other=new SeatData(1);
 const timer={seat:3,deadline:Date.now()/1000+30,totalTime:30};
 const state={mySeat:3,seatCount:3,players:[],community:[],actions:['fold','call','raise'],handNum:1,presentation:'live',countdowns:[timer],actingSeat:3};
 mine.replace(state);other.replace(state);
 assert.equal(mine.state.foldCountdown,true);assert.deepEqual(mine.state.countdown,timer);assert.equal(other.state.foldCountdown,false);
 mine.replace({...state,actions:[]});assert.equal(mine.state.foldCountdown,false);
 mine.replace({...state,handEnded:true});assert.equal(mine.state.foldCountdown,false);
 mine.replace({...state,mySeat:1});assert.equal(mine.state.foldCountdown,false);
});
