import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from './helpers/protocol-fixture.mjs';
import { ProtocolRoomData } from '../.test-build/data/ProtocolRoomData.js';
import { TexasGameRoomDataEmoji } from '../.test-build/data/TexasGameRoomDataEmoji.js';
import { MessageContext } from '../.test-build/net/messages/MessageContext.js';
import { TexasMessageHandler } from '../.test-build/net/messages/texas/TexasMessageHandler.js';

test('CC 132 gift broadcast reaches room animation data without rebuilding the table', () => {
  const data=new ProtocolRoomData(),events=[];
  data.emoji.on(TexasGameRoomDataEmoji.DIAMOND_GIFT,gift=>events.push(gift));
  const gift=new pb.ServerMessageRoomUserSendDiamond();
  gift.setSenderRid(101);gift.setRecieveRid(202);gift.setAmount(50);
  const router=new TexasMessageHandler(pb);
  assert.equal(router.accepts(pb.Code.MSG_S_ROOM_USER_SEND_DIAMOND),true);
  assert.equal(router.dispatch({code:pb.Code.MSG_S_ROOM_USER_SEND_DIAMOND,body:gift.serializeBinary()},new MessageContext(data,pb)),false);
  assert.deepEqual(events,[{senderID:101,receiverID:202,amount:50}]);
});

test('successful local gift and its server echo play once per gift', () => {
  const data=new TexasGameRoomDataEmoji(),events=[];
  data.on(TexasGameRoomDataEmoji.DIAMOND_GIFT,gift=>events.push(gift));
  const gift={senderID:101,receiverID:202,amount:50};
  data.diamondGiftEvent(gift,'local');data.diamondGiftEvent(gift,'remote');
  data.diamondGiftEvent(gift,'local');data.diamondGiftEvent(gift,'remote');
  assert.equal(events.length,2);
  data.clearData();data.diamondGiftEvent(gift,'remote');
  assert.equal(events.length,3);
});
