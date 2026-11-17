import { SquidIn } from '../../src/net/messages/texas/SquidIn.js';
import { MessageContext } from '../../src/net/messages/MessageContext.js';
import type {Action,RoomHost,RoomTarget,TableSnapshot,TableUpdate} from '../../src/core/types.js';
import type {BuyInSelection,BuyInQuote} from '../../src/core/Seating.js';
import type {RoomRecords} from '../../src/core/RoomRecords.js';
import type {RoomEmojis} from '../../src/core/RoomEmojis.js';
import MagicEmojiConfig from '../../src/logic/MagicEmojiConfig.js';
import {DemoFeatures} from '../../src/demo/DemoFeatures.js';
import {ProtocolRuntime} from '../../src/net/ProtocolRuntime.js';
import type {HoldemRuntime} from '../../src/net/ProtocolRuntime.js';
import Mtt from '../../src/data/TexasGameRoomDataMtt.js';
import {auditRecords} from './AuditRecords.js';
import {AuditMedia} from './AuditMedia.js';
import {makeAuditSnapshot,type AuditOptions} from './AuditScenarios.js';
export class AuditHost implements RoomHost {
 state:TableSnapshot;private receive?: (v:TableUpdate)=>void;private pb?:HoldemRuntime;private serial=0;private timer?:ReturnType<typeof setInterval>;private timers=new Set<ReturnType<typeof setTimeout>>();private signal?:AbortSignal;
 readonly features:DemoFeatures;records?:RoomRecords;private emojis?:RoomEmojis;private quote?:BuyInQuote;private failed=false;step=0;
 constructor(readonly options:AuditOptions,readonly log:(message:string)=>void){this.state=makeAuditSnapshot(options);this.features=new DemoFeatures(()=>this.state,c=>this.publish(c),()=>this.reset(false),log);}
 getSpecialOperations(){return this.features;}getRecords(){return this.records;}getEmojis(){return this.emojis;}getTableSettings(){return this.features.data.tableSettings;}
 async enter(target:RoomTarget,signal:AbortSignal,receive:(v:TableUpdate)=>void){
  this.stop();this.signal=signal;this.receive=receive;this.state={...makeAuditSnapshot(this.options),roomID:target.roomID,matchID:target.matchID,revision:++this.serial};
  signal.addEventListener('abort',()=>{if(this.signal===signal){this.stop();this.receive=undefined;this.features.clear();}},{once:true});
  this.pb=await new ProtocolRuntime().load();signal.throwIfAborted();await this.features.initialize(this.pb);this.features.clear();this.configure();
  if(this.options.scene==='entry-fail'&&!this.failed){this.failed=true;throw Error('模拟入桌失败：点击重试恢复');}
  return this.state;
 }
 private configure(){
  const pb=this.pb!,data=this.features.data;this.features.sync(this.state);
  Object.assign(data.record!,{rid:this.state.roomID,name:'离线全元素验收',gameType:1,pokerType:1,insuranceOn:1,secondPcsOn:1,viewPlayerCards:1,chatType:1,calltime:0,jackpot:1,antiCheatType:this.options.scene==='media-video'?3:this.options.scene==='media-voice'?2:0,micSeatSwitch:1,micMiddleSwitch:1,videoSeatSwitch:1,videoMiddleSwitch:1,powerSaving:1,powerSavingSeatSwitch:1,powerSavingMiddleSwitch:1});
  Object.assign(data.snapshot!.roomInfo!,{smallBlind:10,currentMinRate:100,currentMaxRate:1000,limitIp:true,limitGps:true,insuranceMode:1,antiCheatType:data.record!.antiCheatType});
  if(this.options.scene==='intro-mushroom'){data.record!.mushroomBase=100;localStorage.removeItem('mx-mushroom-intro-hidden');}
  if(this.options.scene==='intro-critical'){data.record!.criticalHit=1;data.record!.ante=100;localStorage.removeItem('mx-critical-hit-intro-hidden');}
  if(this.options.scene==='intro-squid'){data.record!.squidBase=100;localStorage.removeItem('mx-squid-intro-hidden');}
  if(this.options.scene.startsWith('insurance-rules')){
   data.snapshot!.roomInfo!.insuranceMode=this.options.scene.endsWith('-ev')?2:this.options.scene.endsWith('-standard')?0:1;
   // Synthetic odds, deliberately long to exercise scrolling; never used online.
   data.record!.insuranceOddsList=[2,3,4].map(potUserCount=>({potUserCount,oddsList:Array.from({length:20},(_,i)=>({outs:i+1,odds:Math.max(1,32-i*2)}))}));
  }
  this.syncPlayers();data.tableSettings.update(data.record,data.snapshot!.roomInfo,data.snapshot!.handInfo);data.tableSettings.roomPermissions={kick_player:1,stand_player:1,manage:1};
  this.records=auditRecords(this.features,pb,()=>this.state,c=>this.publish(c),this.log,this.options.scene);
  this.emojis={data:data.emoji,config:this.features.config.global,userRID:99+this.options.hero,canSend:()=>this.state.mySeat>0,seatForUser:id=>this.state.players.find(p=>p.userRid===id)?.seat,refresh:async()=>{data.emoji.propList=MagicEmojiConfig.DEFINITIONS.map((definition,i)=>({propID:i+1,propType:1,priceID:1,propCode:definition.propCode,rawPrice:0,payPrice:0,subscriptionName:'离线表情',propAmount:99,gamePropID:definition.type,propTypeCategory:1,propTypeCategoryName:'免费',propTypeCategoryIcon:''}));},send:async p=>{data.emoji.emojiEvent({type:p.gamePropID,userID:99+this.options.hero});},throwProp:async(id,p,type)=>{data.emoji.throwPropEvent({type:type||p.gamePropID,userID:99+this.options.hero,targetUserID:id});}};
  if(this.options.scene.startsWith('media-')){const media=new AuditMedia(data,this.features.config.global,this.signal!);data.media=media;this.records={...this.records,media};this.state.antiCheatType=data.record!.antiCheatType;}
  if(this.options.scene.startsWith('mtt-')){const m=data.mtt=new Mtt(data,pb);m.matchName='离线赛事';m.gameStarted=true;this.state.matchID=900001;
   if(this.options.scene==='mtt-wait')m.applyWillStart(Date.now()/1000+60);
   if(this.options.scene==='mtt-bubble')m.setBubbleWaiting(true);
   if(this.options.scene==='mtt-transfer')m.setTableTransferWaiting(true);
   if(this.options.scene==='mtt-break'){m.breakWindowActive=true;m.breakType=2;m.breakStartTime=Date.now()/1000-10;m.breakEndTime=Date.now()/1000+60;m.updateBreakPresentation();}
   if(this.options.scene==='mtt-addon'){m.addOnEnabled=true;m.canAddOnFromServer=true;m.addOnMode=1;m.startAddOnBlindLevel=1;m.endAddOnBlindLevel=20;m.blindLevel=2;this.state.players=this.state.players.map(p=>({...p,isAutoop:p.seat===this.state.mySeat}));}
  }
 }
 private syncPlayers(){const s=this.features.data.snapshot;if(!s||!this.pb)return;s.playersList=this.state.players.map(p=>({...new this.pb!.Player().toObject(),seatId:p.seat,userRid:p.userRid??100,name:p.name,chip:p.chips,cardsList:[...p.cards],avatar:p.avatar??'',isAutoop:p.isAutoop??false,inSquid:p.squidIn??false,squidCount:p.squidCount??0}));s.myInfo!.seatId=this.state.mySeat;s.handInfo!.handNum=this.state.handNum;s.handInfo!.publicCardsList=[...this.state.community];}
 publish(change:Partial<TableSnapshot>,presentation:TableSnapshot['presentation']='live'){if(this.signal?.aborted)return;this.state={...this.state,...change,revision:++this.serial,presentation};const roomInfo=this.features.data.snapshot?.roomInfo;this.features.sync(this.state);if(roomInfo)Object.assign(this.features.data.snapshot!.roomInfo!,roomInfo);this.syncPlayers();this.receive?.({type:'snapshot',snapshot:this.state});this.log(`手 ${this.state.handNum} · ${this.state.community.length} 张公共牌 · ${presentation}`);}
 reset(deal=true){this.stop();this.step=0;this.features.clear();this.state={...makeAuditSnapshot(this.options),handNum:this.state.handNum+1,community:[],actions:['fold','check','raise']};this.configure();this.publish({dealOrder:this.state.players.map(p=>p.seat)},deal?'deal':'sync');}
 async command(_target:RoomTarget,action:Action,signal:AbortSignal,amount?:number){signal.throwIfAborted();const s=this.state,p=s.players.find(p=>p.seat===s.mySeat);if(!p||!s.actions.includes(action))return;const paid=action==='call'?s.betting?.call??0:action==='raise'||action==='allin'?amount??p.chips:action==='straddle'?s.betting?.straddle??0:0;const label={fold:'弃牌',call:'跟注',raise:'加注',allin:'全下',check:'让牌',straddle:'抓'}[action];this.publish({actions:[],pot:s.pot+paid,players:s.players.map(x=>x===p?{...x,folded:action==='fold',chips:Math.max(0,p.chips-paid),roundBet:paid,action:label}:x)});this.log(`本地操作成功：${label}`);}
 async showdown(_t:RoomTarget,index:number){const me=this.state.mySeat;this.publish({players:this.state.players.map(p=>p.seat===me?{...p,showCardsSelection:p.cards.map((_,i)=>i===index?(p.showCardsSelection?.[i]?0:1):p.showCardsSelection?.[i]??0)}:p)});}
 next(){
  if(this.options.scene==='folded'){if(!this.state.handEnded)this.publish({handEnded:true,players:this.state.players.map(p=>p.seat===this.state.mySeat?{...p,cards:p.cards.map((c,i)=>p.showCardsSelection?.[i]?c:0)}:p)});else this.reset();return;}
  this.step=(this.step+1)%8;
  if(this.step===1){const playing=!!this.timer;this.reset();this.step=1;if(playing)this.play();return;}
  if(this.step>=2&&this.step<=5){const n=[0,0,0,3,4,5][this.step]!;this.publish({community:[18,35,52,37,22].slice(0,n),roundBet:0,pot:2000+this.step*200,actions:['fold','check','raise'],betting:{id:`audit-${++this.serial}`,call:0,min:40,max:19999,allIn:20000,step:1},actingSeat:this.state.mySeat,countdowns:[{seat:this.state.mySeat,deadline:Date.now()/1000+20,totalTime:20}],players:this.state.players.map(p=>({...p,roundBet:0,action:''}))});return;}
  if(this.step===6){this.publish({handEnded:true,actions:[],countdowns:[],actingSeat:undefined,players:this.state.players.map(p=>({...p,cards:[14,29],settlement:{cards:{highlight:[14],popup:[14]},win:p.seat===this.state.mySeat?{handValueType:7,collectedChips:4000}:undefined}}))});return;}
  this.publish({community:[],secondCommunity:[],handEnded:false,actions:[],pot:0,pots:[],players:this.state.players.map(p=>({...p,cards:[],settlement:undefined,showCardsSelection:[],action:'',roundBet:0}))});
 }
 play(){this.stop();this.timer=setInterval(()=>this.next(),2000);this.log('开始自动播放，每两秒一步');}
 stop(){clearInterval(this.timer);this.timer=undefined;this.timers.forEach(clearTimeout);this.timers.clear();}
 later(run:()=>void,ms:number){const h=setTimeout(()=>{this.timers.delete(h);if(!this.signal?.aborted)run();},ms);this.timers.add(h);}
 async activate(){const scene=this.options.scene,d=this.features.data;
  if(scene==='flow')this.reset();
  if(scene==='watch')this.features.settlement();
  if(scene==='insurance-single')this.features.insurance(1);if(scene==='insurance-multi')this.features.insurance(2);if(scene==='insurance-force')this.features.insurance(1,true);
  if(scene==='second-board')this.features.secondBoard();if(scene==='mushroom')this.features.mushroomPool();if(scene==='critical')this.features.criticalHit();if(scene==='jackpot')this.features.jackpot();if(scene==='calltime')this.features.callTime();
  if(scene==='fold-other')this.publish({players:this.state.players.map(p=>p.seat===(this.options.actor===this.state.mySeat?this.state.mySeat%this.state.seatCount+1:this.options.actor)?{...p,folded:true}:p)});
  if(scene==='countdown-expire')this.later(()=>this.publish({actions:[],countdowns:[],actingSeat:undefined,players:this.state.players.map(p=>p.seat===this.state.mySeat?{...p,folded:true}:p)}),4000);
  if(scene==='emoji'){d.emoji.emojiEvent({type:710,userID:99+this.options.hero});this.later(()=>d.emoji.emojiEvent({type:717,userID:101}),600);}
  if(scene==='gift')d.emoji.diamondGiftEvent({senderID:99+this.options.hero,receiverID:101,amount:100},'local');if(scene==='throw')d.emoji.throwPropEvent({userID:99+this.options.hero,targetUserID:101,type:600});
  if(scene==='chat')await this.records?.chatHistory?.();
  if(scene.startsWith('squid-')){d.record!.squidBase=10;d.record!.squidMode=0;d.squid.state={...d.squid.state,enabled:true,seat:this.state.mySeat,base:10,mode:0,remaining:3,showJoin:scene==='squid-join',start:0};this.publish({players:this.state.players.map(p=>({...p,squidIn:scene==='squid-join'?p.seat!==this.state.mySeat&&p.seat!==2:true,squidCount:p.seat===this.state.mySeat||p.seat===2?0:1}))});if(scene==='squid-result')d.squid.finish(this.state.players.map(p=>({userID:p.userRid!,nick:p.name,avatar:p.avatar??'',money:p.seat===this.state.mySeat?-100:20,squidNum:p.seat===this.state.mySeat?0:1,rate:1,isPunish:p.seat===this.state.mySeat})));}
  if(scene==='reconnect')this.publish({},'sync');
 }
 async prepareSeat(_t:RoomTarget,seat:number){this.quote={id:++this.serial,seat:seat||this.options.hero,roomName:'离线验收',smallBlind:10,min:this.options.scene==='bring-deposit'?106000:2100,max:this.options.scene==='bring-deposit'?406000:20100,step:100,returnOrNew:0,deposit:this.options.scene==='bring-deposit'?6000:100,canAuto:true,security:{ip:true,gps:true,delay:true,media:false},wallets:[{club_id:1,gold:this.options.scene==='bring-insufficient'?0:this.options.scene==='bring-deposit'?500000:100000,club_name:'模拟钱包A'},{club_id:2,gold:50000,club_name:'模拟钱包B'}],funding:this.options.scene==='bring-score'?'score':this.options.scene==='bring-diamond'?'diamond':'wallet',diamondBalance:100000};return this.quote;}
 async sitDown(_t:RoomTarget,v:BuyInSelection){if(this.options.scene==='bring-insufficient'||(this.quote?.funding==='wallet'&&(this.quote.wallets.find(w=>w.club_id===v.clubID)?.gold??0)<v.amount))throw Error('模拟钱包余额不足');const seat=this.quote!.seat;const p=makeAuditSnapshot(this.options).players.find(p=>p.seat===seat)!;this.publish({mySeat:seat,players:[...this.state.players.filter(p=>p.seat!==seat),{...p,cards:[],chips:v.amount-(this.quote?.deposit??0),canPlayStatus:0}]});}
 async standup(){this.publish({players:this.state.players.filter(p=>p.seat!==this.state.mySeat),mySeat:0,actions:[]});return true;}
 async storeChips(_t:RoomTarget,amount:number){this.publish({players:this.state.players.map(p=>p.seat===this.state.mySeat?{...p,chips:Math.max(0,p.chips-amount)}:p)});}
 async keepSeat(_t:RoomTarget,keep:boolean){this.publish({players:this.state.players.map(p=>p.seat===this.state.mySeat?{...p,keepSeatReason:keep?1:0,keepSeatDeadline:keep?Date.now()/1000+120:0,canPlayStatus:1}:p)});}
 async agreePost(){this.publish({players:this.state.players.map(p=>({...p,canPlayStatus:1}))});}
 async addTime(){await this.features.addTime();}async agreeSecondPcs(_t:RoomTarget,v:boolean){await this.features.agreeSecondPcs(v);}async buyInsurance(_t:RoomTarget,list:Parameters<DemoFeatures['buyInsurance']>[0],confirm:boolean){await this.features.buyInsurance(list,confirm);}async watchSettlement(_t:RoomTarget,kind:'peek'|'reveal'){await this.features.watchSettlement(kind);}
 async joinSquid(){this.squidPlayerJoin(this.state.mySeat);}
 squidPlayerJoin(seat:number){if(!this.pb)return;const d=this.features.data;const body=new this.pb.ServerMessageSquidIn();body.setSeatId(seat);body.setEnable(true);body.setFirstIn(true);SquidIn(body.toObject(),new MessageContext(d,this.pb));this.publish({players:this.state.players.map(p=>p.seat===seat?{...p,squidIn:true}:p)});d.squid.refresh(d.record!,d.snapshot!.roomInfo,d.snapshot!.playersList,this.state.mySeat,0);}

}
