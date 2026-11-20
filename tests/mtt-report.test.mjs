import test from 'node:test';
import assert from 'node:assert/strict';
import {mttTimestampSeconds, mttReportTiming, mttDuration} from '../.test-build/logic/MttReportTiming.js';
import {playerProfileStats} from '../.test-build/logic/PlayerProfileStats.js';

test('MTT report accepts RFC3339, Unix seconds, milliseconds and numeric strings', () => {
 const epoch=Date.parse('2026-11-20T06:00:00Z')/1000;
 for(const value of ['2026-11-20T06:00:00Z','2026-11-20T14:00:00+08:00',epoch,epoch*1000,String(epoch),String(epoch*1000)])assert.equal(mttTimestampSeconds(value),epoch);
 for(const value of [undefined,null,'','invalid',NaN,Infinity,0,-1])assert.equal(mttTimestampSeconds(value),0);
});

test('MTT clocks count elapsed time and hold at zero until the next authoritative blind level', () => {
 const now=Date.parse('2026-11-20T06:10:00Z')/1000;
 const detail={mtt:{start_time:'2026-11-20T06:00:00Z',status:1,upblind_interval:300},more:{nu:String((now-290)*1000)}};
 assert.deepEqual(mttReportTiming(detail,now),{preStart:false,start:now-600,deadline:now+10,elapsed:600,remaining:10});
 assert.equal(mttReportTiming(detail,now+10).remaining,0);
 assert.equal(mttReportTiming(detail,now+15).remaining,0,'an expired interval must not restart');
 assert.equal(mttDuration(311),'05:11');assert.equal(mttDuration(3661,true),'01:01:01');
 const next={...detail,more:{nu:now+10}};
 assert.equal(mttReportTiming(next,now+11).remaining,299);
});

test('MTT pre-start clock has zero elapsed time and uses the actual start deadline', () => {
 const start=Date.parse('2026-11-20T07:00:00Z')/1000;
 const detail={mtt:{start_time:'2026-11-20T15:00:00+08:00',status:0,upblind_interval:600}};
 assert.equal(mttReportTiming(detail,start-90).remaining,90);
 assert.equal(mttReportTiming(detail,start-90).elapsed,0);
 assert.equal(mttReportTiming(detail,start+1).remaining,0);
 assert.equal(mttReportTiming({}).remaining,0);
});

test('H5 combine player statistics preserve podium counts from arrays and legacy objects', () => {
 const podium={frist_times:7,second_times:4,third_times:2,play_times:38,win_times:13};
 const room={total_hand:42,vpip:27},allin={active_count:5};
 for(const raw of [{mtt_room_data:[podium],room_data:[room],allin_data:allin},{mtt_room_data:podium,room_data:room,allin_data:allin}]){
  const stats=playerProfileStats(raw);
  assert.deepEqual(stats.mtt_room_data,podium);assert.deepEqual(stats.room_data,room);assert.equal(stats.allin_data,allin);
 }
 assert.equal(playerProfileStats({mtt_room_data:[],room_data:[]}).mtt_room_data,undefined);
 assert.equal(playerProfileStats(undefined),undefined);
});
