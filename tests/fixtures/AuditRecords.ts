import type { RoomRecords } from '../../src/core/RoomRecords.js';
import type { ReplayHandData } from '../../src/data/ReplayHandData.js';
import { PrivateUcChargeStore } from '../../src/data/PrivateUcChargeStore.js';
import type { DemoFeatures } from '../../src/demo/DemoFeatures.js';
import type { TableSnapshot } from '../../src/core/types.js';
import type { HoldemRuntime } from '../../src/net/ProtocolRuntime.js';
/** Local-only service responses. No production HTTP, websocket or payment adapter is created. */
export function auditRecords(features:DemoFeatures,pb:HoldemRuntime,current:()=>TableSnapshot,update:(v:Partial<TableSnapshot>)=>void,log:(v:string)=>void):RoomRecords {
 const data=features.data,notes=new Map<number,string>(),muted=new Set<number>(),saved=new Set<number>();
 const profile=(uid:number)=>({basic:{random_num:uid,nick_name:current().players.find(p=>p.userRid===uid)?.name??'模拟观众',avatar:new URL('../../src/assets/raw/ui/avatar.png',import.meta.url).href,remark_name:notes.get(uid)},stats:{room_data:{total_game_cnt:12,vpip:45,prf:20,total_hand:98,wins:31},pool_rate:45,allin_data:{active_count:12,active_profit_count:8,passive_count:4,passive_profit_count:2,behind_count:3,behind_profit_count:1,ahead_count:5,ahead_profit_count:4}}});
 const records:RoomRecords={data,config:{...features.config,privateUc:new PrivateUcChargeStore()},get userRID(){return 99+current().mySeat;},target:{roomID:909090,matchID:0},
  async playerStats(){return {vpip:45,pfr:20};},async playerProfile(id){return profile(id);},peekPlayerProfile:profile,
  async savePlayerRemark(id,note){notes.set(id,note);},async playerMuted(id){return muted.has(id);},async setPlayerMuted(id,v){v?muted.add(id):muted.delete(id);},
  async managePlayer(id){update({players:current().players.filter(p=>p.userRid!==id)});},async diamondBalance(){return 100000;},
  async giftDiamonds(id,amount){data.emoji.diamondGiftEvent({senderID:99+current().mySeat,receiverID:id,amount},'local');log('本地赠钻演示，无真实交易');},
  async refreshReport(){const res=new pb.ServerMessageRoomers();res.setTotalPot(12345678);res.setTotalHand(24);res.setPlayersList(current().players.map(p=>{const x=new pb.PlayerSummary();x.setUserRid(p.userRid??100);x.setName(p.name);x.setHandNum(24);x.setPoolCount(8);x.setBringInTotal(50000);x.setWin(p.seat%2?12345:-4567);x.setStoreChips(1000);x.setIsOnline(true);return x;}));data.report.applyRoomers(res.toObject());data.report.observers=Array.from({length:8},(_,i)=>({...new pb.Roomer().toObject(),userRid:900+i,name:'观众'+i,avatar:new URL('../../src/assets/raw/ui/avatar.png',import.meta.url).href}));},
  async jackpot(){data.report.jackpotRecords=current().players.map(p=>({userRid:p.userRid!,name:p.name,avatar:p.avatar??'',sex:0,contributeTotal:1000,awardTotal:20000,royalFlushCount:1,straightFlushCount:2,fourOfaKindCount:3}));data.report.jackpotFetched=true;},
  async insurance(){data.report.setInsuranceRecords(current().players.map(p=>({userRid:p.userRid!,name:p.name,handNum:1,insurBet:1000,insurWin:p.seat%2?2500:-1000,createTime:Date.now()/1000})));},
  async round(mode,round){data.report.setSquidRound(mode,round,{totalRound:3,startHand:1,endHand:10,records:current().players.map(p=>({name:p.name,in_num:2,in_amount:100,out_num:1,out_amount:200,user_random_id:p.userRid!}))});return 3;},
  async replay(hand){const value=replay(current(),hand);data.replay.pendingHandNum=hand;data.replay.applyReplay(value);return value;},async historyQuote(){return {canPeek:true,canReveal:true,privateUc:false,peekPrice:10,revealPrice:10,collectPrice:10,freeCount:1,revealRound:1,balance:100000};},
  async peek(d){data.replay.mergeWatchedHands(d.s.hand,current().players.map(p=>({user_rid:p.userRid!,data:'14,29'})));},async reveal(d){data.replay.mergeViewedPublicCards(d.s.hand,{pub_cards:'18,35,52,37,22'});},async collected(d){return saved.has(d.s.hand);},async collect(d,remove){remove?saved.delete(d.s.hand):saved.add(d.s.hand);},
  async chatHistory(){for(let i=0;i<12;i++)data.chat.addMessage({id:i+1,userID:100+i%2,name:i%2?'对手':'本人',content:`离线聊天 ${i+1}：长消息滚动与换行测试`,headUrl:'',sex:0,timestamp:Date.now()-i*1000,time:'12:00'});},
  async sendChat(text,danmu){data.chat.addMessage({id:Date.now(),userID:100,name:'本人',content:text,headUrl:'',sex:0,timestamp:Date.now(),time:'12:00'});if(danmu)data.chat.addDanmu({name:'本人',content:text});},async chatQuickMessages(){return ['你好','打得不错','下一手'];},
  safetyGuard(){log('安全卫士：离线入口，不打开外部网站');},async supportChat(){log('客服：离线入口，不发送消息');},
  async mttAddOn(){if(data.mtt){data.mtt.normalAddOnUsed=true;data.mtt.emit('STATE_CHANGED');}log('本地模拟增购完成');},async mttAutoOp(v){update({players:current().players.map(p=>p.seat===current().mySeat?{...p,isAutoop:v}:p)});},
  diamondPurchase:{async catalog(){return {list:[{id:1,gold_count:1000,give_gold_count:100,trader_type:0}],pay_types:[],balance:100000,isTrader:false,isApplying:false};},async order(){throw Error('离线演示不创建真实支付订单');},async applyTrader(){log('本地代理申请状态演示');}},
 };
 return records;
}
function replay(s:TableSnapshot,hand:number):ReplayHandData {
 const pl=s.players.map(p=>({sn:p.seat,c:20000,pot_out:100,act:'CALL',act_amt:100,ins:0}));
 return {d:[14,29],u:99+s.mySeat,s:{result:s.players.map(p=>({sn:p.seat,win:p.seat===s.mySeat?1000:-100,ins:0,fee:0,active:true,maxcard_idx:[0,1],card_type:7,card:[14,29],maxcard_idx2:[],card_type2:0,sp_detail:[]})),etime:Date.now()/1000,stime:Date.now()/1000-60,straddle:false,hand,name:'离线验收牌谱',rid:s.roomID,mid:0,unique:'AUDIT',table:{ante:0,pl:s.players.map(p=>({sn:p.seat,c:20000,avatar:p.avatar??'',name:p.name,uid:p.userRid!})),sb:{sn:2,bet:10},bb:{sn:3,bet:20},straddle:false,btn:s.dealerSeat??1,seatcount:s.seatCount},procedure:{ante:{pl:[]},preflop:{pl},flop:{pl,card:[18,35,52],showcard:true},turn:{pl,card:[37],showcard:true},river:{pl,card:[22],showcard:true,scard:[]}}}};
}
