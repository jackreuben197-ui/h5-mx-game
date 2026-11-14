import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportController } from '../.test-build/logic/ReportController.js';
import { pb } from './helpers/protocol-fixture.mjs';
test('report tabs interpret protocol flags and hide insurance only alongside squid',()=>{
 const record=new pb.RoomRecord().toObject(),snapshot=new pb.ServerMessageEnterRoom().toObject();
 snapshot.roomInfo=new pb.RoomInfo().toObject();snapshot.handInfo=new pb.HandInfo().toObject();
 const controller=new ReportController({data:{record,snapshot}});
 record.jackpot=2;assert.deepEqual(controller.tabs,['battle']);
 record.insuranceOn=1;assert.deepEqual(controller.tabs,['battle','insurance']);
 record.squidBase=10;assert.deepEqual(controller.tabs,['battle','mode']);
 record.jackpot=1;assert.deepEqual(controller.tabs,['battle','jackpot','mode']);
 record.squidBase=0;record.jackpot=2;record.mushroomMode=1;assert.deepEqual(controller.tabs,['battle','insurance','mode']);
});
