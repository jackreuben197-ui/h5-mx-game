import type { SpecialOperations } from '../core/RoomRecords.js';
import type { TableSnapshot } from '../core/types.js';
import type { PotInsuranceBuy } from '@silenthill/agreement-web';
import { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import { GlobalConfigStore } from '../data/GlobalConfigStore.js';
import { DiamondModel } from '../data/DiamondModel.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';

/** Synthetic scenarios only. Uses the same state sources and views as the online table. */
export class DemoFeatures implements SpecialOperations {
  readonly data = new ProtocolRoomData();
  readonly config = {
    global: new GlobalConfigStore(),
    diamonds: new DiamondModel(async () => Array.from({length:5},(_,i)=>({
      config_type:2, type_ext:(i+1)*1000, status:1, setting:[{sb:10,price:10*(i+1)}],
    }))),
  };
  private pb?: HoldemRuntime;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  readonly scenarios = [
    {label:'布局验收 · 六张手牌 / 双公共牌 / 长金额',run:()=>this.appearanceStress()},
    {label:'保险 · 单池',run:()=>this.insurance(1)},
    {label:'保险 · 多池',run:()=>this.insurance(2)},
    {label:'保险 · 强制最低投保',run:()=>this.insurance(1,true)},
    {label:'二道牌 · 投票与发牌',run:()=>this.secondBoard()},
    {label:'Jackpot · 开场与奖池',run:()=>this.jackpot()},
    {label:'CallTime · 盈利留桌',run:()=>this.callTime()},
    {label:'蘑菇 · 随庄位移动',run:()=>this.mushroomPool()},
    {label:'暴击 · 开场与翻牌',run:()=>this.criticalHit()},
    {label:'轮到自己 · 加时',run:()=>this.turn()},
    {label:'结算 · 偷偷看 / 发发看',run:()=>this.settlement()},
    {label:'留座 · 返回游戏',run:()=>this.reserve()},
    {label:'重新发牌 / 重置演示',run:()=>this.resetHand()},
  ];
  constructor(
    private current:()=>TableSnapshot|undefined,
    private update:(changes:Partial<TableSnapshot>)=>void,
    private resetHand:()=>void,
    private log:(message:string)=>void,
  ) {}
  async initialize(pb:HoldemRuntime):Promise<void>{
    this.pb=pb;
    this.config.global.setConfig({game_delay_times:2});
    await this.config.diamonds.reqDiamondConfig(2);
  }
  clear():void{
    this.timers.forEach(clearTimeout);this.timers.clear();this.data.clear();
  }
  sync(state:TableSnapshot):void{
    if(!this.pb)return;
    const pb=this.pb, snapshot=new pb.ServerMessageEnterRoom(), hand=new pb.HandInfo(), mine=new pb.MyGameInfo(), room=new pb.RoomInfo();
    hand.setHandNum(state.handNum);hand.setPublicCardsList([...state.community]);mine.setSeatId(state.mySeat);room.setSmallBlind(10);
    snapshot.setHandInfo(hand);snapshot.setMyInfo(mine);snapshot.setRoomInfo(room);
    snapshot.setPlayersList(state.players.filter(p=>p.seat<=state.seatCount).map(p=>{
      const player=new pb.Player();player.setSeatId(p.seat);player.setName(p.name);player.setChip(p.chips);player.setCardsList([...p.cards]);
      // Local CC fallback avatars keep the demo entirely offline.
      player.setAvatar(new URL('../assets/raw/ui/avatar.png',import.meta.url).href);
      return player;
    }));
    this.data.snapshot=snapshot.toObject();
    if(!this.data.record){const record=new pb.RoomRecord();record.setInsuranceOpDuration(30);record.setInsuranceForceBuyRatio(0);this.data.record=record.toObject();}
  }
  private start():TableSnapshot|undefined{
    if(!this.current()||!this.pb)return;
    this.resetHand();return this.current();
  }
  private later(run:()=>void,ms:number):void{
    const timer=setTimeout(()=>{this.timers.delete(timer);run();},ms);this.timers.add(timer);
  }
  appearanceStress():void {
    const s=this.start();if(!s)return;
    this.update({community:[18,20,36,42,54],secondCommunity:[17,19,35,41,53],pot:123456789,pots:[123456789,98765432],players:s.players.map(p=>({...p,name:'Long player nickname 测试',chips:123456789,cards:[14,29,44,59,13,28]}))});
  }
  jackpot():void {
    if(!this.start())return;
    Object.assign(this.data.record!,{jackpot:1,jackpotId:1,jackpotGold:1000000,jackpotParentGold:1500000});
    this.data.jackpot.restore(this.data.record);this.data.jackpot.start();
    this.later(()=>this.data.jackpot.update(1,1100000,1600000),5500);
  }
  callTime():void {
    if(!this.start())return;
    Object.assign(this.data.record!,{calltime:1,calltimeWinLine:10,calltimeLimit:10});
    this.data.callTime.update(3,true);this.update({});
  }
  mushroomPool():void {
    const s=this.start();if(!s||!this.pb)return;
    this.data.record!.mushroomBase=10;this.data.record!.mushroomMode=2;
    const hand=new this.pb.HandInfo().toObject();hand.buSeatId=2;
    hand.pools={...this.data.snapshot!.handInfo!.pools,mushroomPool:260} as NonNullable<typeof hand.pools>;
    this.data.mushroom.update(hand,10,false);
    this.update({dealerSeat:2});
    this.later(()=>{hand.buSeatId=7;hand.pools!.mushroomPool=270;this.data.mushroom.update(hand,10,true);this.update({dealerSeat:7});},1200);
  }
  criticalHit():void {
    const s=this.start();if(!s||!this.pb)return;
    this.data.record!.criticalHit=1;this.data.record!.ante=40;this.data.record!.rounds=1;
    const hand=new this.pb.HandInfo().toObject();hand.criticalHitOpen=true;
    this.data.criticalHit.update(hand,true);
    this.update({actions:[],betting:undefined,pot:s.players.length*40,players:s.players.map(p=>({...p,chips:p.chips-40,roundBet:0}))});
    this.later(()=>this.update({community:[18,20,36],actions:['fold','check','raise'],actingSeat:1,betting:{id:'demo-boom',call:0,min:40,max:1960,step:1,allIn:1960}}),2000);
  }
  insurance(count:number,force=false):void{
    const s=this.start();if(!s||!this.pb)return;
    const pb=this.pb,deadline=Date.now()/1000+30;
    this.update({community:[18,20,36],actions:[],betting:undefined,canAddTime:false,pot:100000,
      players:s.players.map(p=>({...p,chips:p.seat<=2?0:p.chips,folded:p.seat>2,action:p.seat<=2?'全下':'弃牌',cards:p.seat===1?[14,29]:p.seat===2?[13,28]:[0,0],insuranceDeadline:p.seat===1?deadline:undefined})),
      countdowns:[{seat:1,deadline,totalTime:30}],actingSeat:1});
    this.data.record!.insuranceForceBuyRatio=force?333:0;
    const op=new pb.Operator();op.setSeatId(1);op.setIsInsurance(true);op.setLeftOpTime(30);op.setOpDeadline(deadline);
    op.setInsuranceLimitList(Array.from({length:count},(_,i)=>{
      const pot=new pb.InsurancePotLimit();pot.setPotId(i+1);pot.setPotAmount(i===0?100000:60000);pot.setPotLeaderCount(1);pot.setPotUserCount(2);
      pot.setBet(10000);pot.setMin(force?6660:0);pot.setMax(100000);pot.setOdds(5);
      const detail=new pb.UserOuts();detail.setSeatId(2);
      const card=new pb.OutsCard();card.setCard(i===0?13:28);card.setIsEqual(false);detail.setOutsCardsList([card]);pot.setOutsDetailList([detail]);return pot;
    }));
    this.data.insurance.start(op.toObject(),pb.Def.Round.FLOP);
    this.log(`演示：${count} 池保险${force?'（强制最低投保）':''}，可选金额、排序、加时、购买或放弃；30 秒后自动结束`);
  }
  async buyInsurance(list:PotInsuranceBuy.AsObject[],confirm:boolean):Promise<void>{
    if(!this.data.insurance.state.operator)return;
    this.data.insurance.purchases.set(1,{round:this.data.insurance.state.round,buyList:list});
    this.log(`演示投保：累计 ${list.length} 池，${confirm?'最终确认':'继续下一池'}（不扣费）`);
    if(confirm){this.data.insurance.finish();this.update({countdowns:[],actingSeat:undefined,players:this.current()!.players.map(p=>({...p,insuranceDeadline:undefined})),community:[18,20,36,42,55]});}
  }
  secondBoard():void{
    const s=this.start();if(!s)return;
    this.update({actions:[],betting:undefined,community:[18,20,36],players:s.players.map(p=>({...p,chips:p.seat<=2?0:p.chips,folded:p.seat>2,action:p.seat<=2?'全下':'弃牌'}))});
    this.data.secondPcs.start([1,2],Date.now()/1000+20);this.data.secondPcs.vote(2,true);
    this.log('演示：对手已同意二道牌；点击同意后发出两排公共牌，拒绝则仅发一排');
    this.later(()=>{if(this.data.secondPcs.state.active){this.data.secondPcs.finish();this.update({community:[18,20,36,42,55]});this.log('二道牌演示投票超时');}},20000);
  }
  async agreeSecondPcs(agree:boolean):Promise<void>{
    if(!this.data.secondPcs.state.active)return;
    this.data.secondPcs.vote(1,agree);this.data.secondPcs.requestResult(0);
    this.later(()=>{this.data.secondPcs.finish();this.update({community:[18,20,36,42,55],secondCommunity:agree?[18,20,36,43,56]:[]});},700);
  }
  turn():void{
    const s=this.start();if(!s)return;
    this.update({actingSeat:1,countdowns:[{seat:1,deadline:Date.now()/1000+20,totalTime:20}],canAddTime:true,addTimeCost:10,delayTimes:0});
    this.log('演示：点击左侧 +30s 加时；第二次 +20s，两次后隐藏加时入口');
  }
  async addTime():Promise<void>{
    const s=this.current();if(!s)return;
    const op=this.data.insurance.state.operator,used=op?.delayTimes??s.delayTimes??0;
    if(used>=2||(!op&&!s.canAddTime))return;
    const seconds=used===0?30:20;
    const deadline=Math.max(Date.now()/1000,op?.opDeadline??s.countdowns?.find(c=>c.seat===1)?.deadline??0)+seconds;
    this.update({delayTimes:used+1,canAddTime:!op&&used+1<2,addTimeCost:20,countdowns:[{seat:1,deadline,totalTime:20+30+(used?20:0)}],
      players:s.players.map(p=>p.seat===1&&op?{...p,insuranceDeadline:deadline}:p)});
    if(op)this.data.insurance.start({...op,opDeadline:deadline,delayTimes:used+1},this.data.insurance.state.round);
    this.log(`演示加时 +${seconds}s（不扣费）`);
  }
  settlement():void{
    const s=this.start();if(!s)return;
    this.update({handEnded:true,actions:[],betting:undefined,community:[18,20,36],watch:{peek:true,reveal:true,peekCost:100,revealCost:10},
      players:s.players.map(p=>({...p,action:'',cards:p.seat===1?[14,29]:[0,0]}))});
    this.log('演示：点击右侧偷偷看翻开对手手牌；发发看依次补发转牌、河牌');
  }
  async watchSettlement(kind:'peek'|'reveal'):Promise<void>{
    const s=this.current();if(!s?.handEnded||!s.watch?.[kind])return;
    if(kind==='peek')this.update({watch:{...s.watch,peek:false},players:s.players.map(p=>p.seat===1?p:{...p,cards:[13+(p.seat%4)*15,12+(p.seat%4)*15]})});
    else {const count=Math.min(5,s.community.length+1);this.update({community:[18,20,36,42,55].slice(0,count),watch:{...s.watch,reveal:count<5}});}
    this.log(`演示：${kind==='peek'?'对手手牌已亮出':'补发公共牌'}（不扣费）`);
  }
  reserve():void{
    const s=this.start();if(!s)return;
    this.update({actions:[],betting:undefined,players:s.players.map(p=>p.seat===1?{...p,cards:[],keepSeatReason:1,keepSeatDeadline:Date.now()/1000+180}:p)});
    this.log('演示：留座 180 秒；点击返回游戏恢复操作');
  }
  async keepSeat(keep:boolean):Promise<void>{if(keep)this.reserve();else this.turn();}
}
