import test from 'node:test';
import assert from 'node:assert/strict';
import {VideoAntiCheatConfig,VideoModel} from '../.test-build/logic/VideoModel.js';
import {TableMedia} from '../.test-build/media/TableMedia.js';
import {ProtocolRoomData} from '../.test-build/data/ProtocolRoomData.js';
import {GlobalConfigStore} from '../.test-build/data/GlobalConfigStore.js';
import {VideoMaskChange} from '../.test-build/net/messages/texas/VideoMaskChange.js';
import {MessageContext} from '../.test-build/net/messages/MessageContext.js';
import {pb} from './helpers/protocol-fixture.mjs';
const config=(type,mode,...switches)=>new VideoAntiCheatConfig(type,30,mode,...(switches.length?switches:[true,true,true,true,true,true,true]),1,1);
test('CC voice, forced, random and sequence initial capture/permission branches',()=>{
 const audio=config(2,0).getSeatedSetting();assert.equal(audio.enableCamera,false);assert.equal(audio.canOpMicrophone,true);assert.equal(audio.openMicrophone,false);
 for(const mode of [VideoModel.FULL_TIME,VideoModel.FORCE]){const s=config(3,mode).getSeatedSetting();assert.equal(s.openCamera,true);assert.equal(s.openMicrophone,true);assert.equal(s.canOpCamera,false);assert.equal(s.canOpMicrophone,false);assert.equal(s.canDisablePowerSaving,false);}
 for(const mode of [VideoModel.RANDOM,VideoModel.SEQUENCE]){const s=config(3,mode).getSeatedSetting();assert.equal(s.openCamera,false);assert.equal(s.openMicrophone,false);assert.equal(s.canSwitchPowerSaving,false);}
});
test('CC optional mask and middle switches remain independent',()=>{
 const c=config(3,VideoModel.HUMAN,false,true,true,false,true,false,true),s=c.getSeatedSetting();
 assert.equal(s.openCamera,true);assert.equal(s.canOpCamera,false);assert.equal(s.openMicrophone,false);assert.equal(s.canOpMicrophone,true);assert.equal(s.openPowerSaving,false);assert.equal(s.canDisablePowerSaving,true);
 assert.equal(c.getVisibleVideoMaskId(0),0);assert.equal(c.getVisibleVideoMaskId(5),1);assert.equal(config(3,1).getVisibleVideoMaskId(0),1);
});
test('1133 changes only current occupant and normalizes old mask ids',()=>{
 const d=new ProtocolRoomData();d.snapshot={playersList:[{seatId:1,userRid:8,videoMaskId:0}],myInfo:{seatId:0}};
 const c=new MessageContext(d,pb);assert.equal(VideoMaskChange({userRid:7,videoMaskId:2},c),false);assert.equal(VideoMaskChange({userRid:8,videoMaskId:6},c),true);assert.equal(d.snapshot.playersList[0].videoMaskId,1);
});
test('remote media cannot appear on an empty or replaced seat; abort closes local tracks',async()=>{
 const d=new ProtocolRoomData(),abort=new AbortController();d.record={...new pb.RoomRecord().toObject(),antiCheatType:3};d.snapshot={playersList:[{seatId:1,userRid:8}],myInfo:{seatId:1}};
 const media=new TableMedia(d,8,{},new GlobalConfigStore(),abort.signal,()=>{},0);let stopped=0;
 media.video={close(){stopped++},stop(){},};media.joined=true;media.camera=true;assert.ok(media.videoTrack(8));
 d.snapshot.playersList=[{seatId:1,userRid:9}];assert.equal(media.videoTrack(8),undefined);assert.equal(media.seated,false);
 abort.abort();await media.queue;assert.ok(stopped>=1);assert.equal(media.joined,false);assert.equal(media.video,undefined);
});
test('902 random countdown opens capture, blocks closing during verification, then retains the open tracks',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:10000});
 const d=new ProtocolRoomData(),abort=new AbortController(),global=new GlobalConfigStore(),changes=[];
 d.record={...new pb.RoomRecord().toObject(),antiCheatType:3,antiCheatVideoType:2,powerSaving:1};
 d.snapshot={playersList:[{seatId:1,userRid:8}],myInfo:{seatId:1}};global.setConfig({anti_cheat_video_config:{random_countdown:1,time_limit:2}});
 const media=new TableMedia(d,8,{},global,abort.signal,()=>{},0);media.joined=true;
 media.video={setMuted:async value=>changes.push(['video',value]),stop(){},close(){}};media.audio={setMuted:async value=>changes.push(['audio',value]),stop(){},close(){}};
 media.randomVerify();media.randomVerify();assert.equal(media.timers.length,2);assert.equal(media.camera,false);
 t.mock.timers.tick(1000);await media.queue;assert.equal(media.camera,true);assert.equal(media.microphone,true);assert.equal(media.canSwitchMask,true);
 await media.toggle('camera');assert.equal(media.camera,true);
 t.mock.timers.tick(2000);assert.equal(media.camera,true);assert.equal(media.canOpCamera,true);await media.toggle('camera');assert.equal(media.camera,false);
 abort.abort();await media.queue;
});
test('sequence follows only ordinary own operator and closes on action completion',async()=>{
 const d=new ProtocolRoomData(),abort=new AbortController();d.record={...new pb.RoomRecord().toObject(),rid:42,antiCheatType:3,antiCheatVideoType:3};d.snapshot={playersList:[{seatId:1,userRid:8}],myInfo:{seatId:1},operatorList:[]};
 const media=new TableMedia(d,8,{},new GlobalConfigStore(),abort.signal,()=>{},0);media.joined=true;media.identity='42:0:1';
 media.video={setMuted:async()=>{},stop(){},close(){}};media.audio={setMuted:async()=>{},stop(){},close(){}};
 d.snapshot.operatorList=[{seatId:1,isInsurance:true}];media.sync();await media.queue;assert.equal(media.camera,false);
 d.snapshot.operatorList=[{seatId:1}];media.sync();await media.queue;assert.equal(media.camera,true);assert.equal(media.microphone,true);
 d.snapshot.operatorList=[{seatId:2}];media.sync();await media.queue;assert.equal(media.camera,false);assert.equal(media.microphone,false);
 abort.abort();await media.queue;
});

test('microphone icon follows native interruption and remote publication state',()=>{
 const d=new ProtocolRoomData(),abort=new AbortController();d.record={...new pb.RoomRecord().toObject(),antiCheatType:2};
 const media=new TableMedia(d,8,{},new GlobalConfigStore(),abort.signal,()=>{},0);
 const track={readyState:'live',muted:false};media.audio={getMediaStreamTrack:()=>track};media.microphone=true;
 assert.equal(media.microphoneActive,true);track.muted=true;assert.equal(media.audioEnabled(8),false);
 track.muted=false;assert.equal(media.audioEnabled(8),true);track.readyState='ended';assert.equal(media.audioEnabled(8),false);
 const user={uid:9,hasAudio:false};media.client={remoteUsers:[user]};assert.equal(media.audioEnabled(9),false);
 user.hasAudio=true;assert.equal(media.audioEnabled(9),true);media.blockedAudio.add(9);assert.equal(media.audioEnabled(9),false);
 media.audio=undefined;media.client=undefined;media.destroy();
});
