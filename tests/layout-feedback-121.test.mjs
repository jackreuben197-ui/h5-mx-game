import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTableUi} from '../.test-build/assets/style1/table/layouts/DefaultTableUi.js';
test('spectator bottom player bets above its avatar in every portrait layout',()=>{
 for(const id of ['original','classic','balanced','oval'])for(const [width,height]of [[320,500],[375,812],[440,782]])for(let seatCount=2;seatCount<=9;seatCount++){
  const layout=defaultTableUi.createLayout(id);layout.resize(width,height,false);
  const p=layout.positions({seatCount,mySeat:0,players:[],community:[]}).get(1);
  assert.ok(p.betY+35<=-99.5,`${id} ${seatCount}: bottom bet intersects avatar`);
 }
});
test('original compact room details preserve original public card spacing and layout identity',()=>{
 const layout=defaultTableUi.createLayout('original');layout.resize(440,782,false);
 assert.equal(layout.compactRoomInfo,true);assert.equal(layout.id,'original');
 const info=layout.content({dual:false,boardSize:1,jackpotHeight:0});assert.ok(parseFloat(info.styles['--mx-room-info-width'])>0);
 layout.resize(900,440,true);assert.equal(layout.compactRoomInfo,false);
});
