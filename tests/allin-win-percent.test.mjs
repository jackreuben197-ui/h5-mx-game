import test from 'node:test';
import assert from 'node:assert/strict';
import { pb, record, snapshot } from './helpers/protocol-fixture.mjs';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
import { PublicCards } from '../.test-build/net/messages/texas/PublicCards.js';
import { Showcards } from '../.test-build/net/messages/texas/Showcards.js';
import { HandClear } from '../.test-build/net/messages/texas/HandClear.js';
import { EnterRoomMapper } from '../.test-build/logic/EnterRoomMapper.js';

const target={roomID:1001,matchID:0,roomType:0};
function setup(){const data=new ProtocolRoomData();data.record=record().toObject();data.snapshot=snapshot().toObject();return {data,context:new MessageContext(data,pb)};}
function odds(seat,win,left){return {seatId:seat,winCardsCount:win,leftCardsCount:left,winCardsList:[]};}
function percent(data,seat){return new EnterRoomMapper(pb).map(data,target,1).players.find(p=>p.seat===seat).winPercent100;}

test('CC all-in odds follow PublicCards and Showcards, then clear for the next hand',()=>{
  const {data,context}=setup();
  const turn={rnd:pb.Def.Round.TURN,publicCardsArrayList:[42],publicCardsArray2List:[],extPublicCardsArrayList:[],
    allinUsersList:[odds(4,37,100),odds(1,63,100)]};
  assert.equal(PublicCards(turn,context),true);
  assert.equal(percent(data,4),3700);
  assert.equal(percent(data,1),6300);
  assert.equal(PublicCards(turn,context),false,'repeated board and odds do not redraw');
  assert.equal(Showcards({playerCardsList:[],isAll:true,allinUsersList:[odds(4,379,1000)]},context),true);
  assert.equal(percent(data,4),3790);
  HandClear({},context);
  assert.equal(percent(data,4),undefined);
});

test('reconnect maps authoritative winCardsInfo and ignores an unavailable denominator',()=>{
  const {data}=setup();
  const mine=data.snapshot.playersList.find(p=>p.seatId===4);
  mine.winCardsInfo={wcCount:127,lcCount:200};
  assert.equal(percent(data,4),6350);
  mine.winCardsInfo={wcCount:0,lcCount:0};
  assert.equal(percent(data,4),undefined);
});
