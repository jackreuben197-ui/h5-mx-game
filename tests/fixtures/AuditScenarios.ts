import type { TableSnapshot, Player } from '../../src/core/types.js';
export interface AuditOptions {layout:string;scene:string;seats:number;hero:number;cards:number;dealer:number;actor:number;long:boolean;scale:number;}
export interface AuditScenario {id:string;group:string;label:string;covers:string[];steps:string;}
const s=(id:string,group:string,label:string,covers:string[],steps='选择场景；切换本人/他人及座位数；检查元素；执行页面中的操作。'):AuditScenario=>({id,group,label,covers,steps});
export const auditScenarios:AuditScenario[]=[
 s('figma','设计','Figma 八人桌／本人庄家',['8人桌','本人庄家','BB','完整玩家区']),
 s('actions','行动','面对下注／五档快捷下注',['弃牌','跟注','加注','加时','快捷下注']),
 s('check','行动','可让牌／弃牌确认',['让牌','可让牌时弃牌确认']),
 s('allin-call','行动','筹码不足跟注／全下',['跟注全下','金额边界']),
 s('straddle','行动','抓／不抓',['straddle','强抓位置']),
 s('auto','行动','等待他人／自动操作预选',['自动弃牌','自动让牌','自动跟注','自动全下']),
 s('raise','行动','滑杆确认方式',['滑杆','金额气泡','确认','取消'],'点击加注；拖动滑杆；确认或点空白取消；在设置切换松手下注。'),
 s('dealer-self','玩家','本人庄家／手牌和标记',['dealerSeat','本人庄家','手牌间隔']),
 s('dealer-other','玩家','他人庄家／轮转',['dealerSeat','他人庄家']),
 s('revealed','手牌','所有玩家亮牌',['亮牌','牌背','左右方向']),
 s('four','手牌','四张奥马哈',['4张手牌','奥马哈']),s('five','手牌','五张奥马哈',['5张手牌','奥马哈']),s('six','手牌','六张牌／双排公共牌',['6张手牌','第二排公共牌']),
 s('folded','手牌','本人弃牌／选择亮牌',['暗牌','眼睛','取消选择'],'点击任一手牌选择/取消；下一步进入结算；再下一步清桌。'),
 s('fold-other','手牌','他人弃牌动画',['弃牌回收','本人不受影响']),
 s('partial','手牌','一张亮牌／一张牌背',['部分亮牌']),
 s('status','玩家','等待／补盲／托管组合',['canPlayStatus','isAutoop','keepSeatReason']),
 ...[0,2,3].map(n=>s(`waiting-${n}`,'玩家',`等待状态 ${n}／指定玩家`,['canPlayStatus','状态蒙版'])),
 ...[1,2,3,4].map(n=>s(`keep-${n}`,'玩家',`留座原因 ${n}／指定玩家`,['留座','返回游戏','留座计时'])),
 s('reserved','玩家','本人留座返场',['返回游戏'],'点击本人返回游戏；再通过菜单留座；检验位置和状态恢复。'),
 s('acting-self','玩家','本人行动倒计时',['actingSeat','countdowns','弃牌按钮光圈','清理']),s('acting-other','玩家','他人行动倒计时',['actingSeat','countdowns','头像光圈','秒数']),
 s('countdown-expire','玩家','倒计时结束／自动弃牌',['超时','清理光圈']),
 s('allin','玩家','本人及他人 ALLIN／胜率',['ALLIN','winPercent100','无剩余筹码']),
 s('insurance-buying','玩家','购买保险气泡与ALLIN共存',['insuranceDeadline','保险倒计时']),
 s('long','玩家','长昵称／大筹码／最大文字',['昵称省略','K/M金额','110%']),s('zero','玩家','零筹码／无头像',['零筹码','头像fallback']),
 ...['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺','皇家同花顺'].map((name,i)=>s(`handtype-${i}`,'结算',name,['牌型标签','WIN','高亮','获胜金额'])),
 s('settlement','结算','本人及他人赢家',['WIN','牌型','获胜金额','高亮','暗牌']),
 ...['preflop','flop','turn'].map(phase=>s(`early-win-${phase}`,'结算',`${phase}直接获胜／无手牌`,['公共牌未发完','结算清手牌','获胜金额位置'])),
 s('no-cards','玩家','本人无手牌／在桌筹码',['无手牌','头像下方余额']),
 s('split','结算','平分底池／边池赢家',['多人赢家','主池','边池']),s('watch','结算','偷偷看／发发看',['购买按钮','价格','补发公共牌'],'依次点偷偷看、发发看；本地回执更新牌面和按钮可用性。'),
 s('empty','入座','全部空座',['2–9人空座','加号','坐下']),s('observer','入座','观众／点击空座带入',['观战','带入','钱包'],'点击空座；调整带入金额；提交后坐下；菜单站起。'),
 s('bring-wallet','入座','钱包带入／押金',['带入金额','钱包选择','自动补充','押金']),s('bring-score','入座','记分牌带入',['记分牌','免钱包']),s('bring-diamond','入座','钻石带入',['钻石余额','充值入口']),s('bring-insufficient','入座','余额不足',['余额不足','带入错误']),
 s('post-blind','入座','坐下后等待补盲',['补盲确认','等待']),s('bring-out','入座','带出筹码',['带出滑杆','存筹码']),
 ...['preflop','flop','turn','river','dual-flop','dual-turn','dual-river'].map(phase=>s('board-'+phase,'公共牌','公共牌占位／'+phase,['第一排占位','第二排不补占位','经典半牌高重叠'])),
 s('flow','流程','完整一手／单步与自动播放',['发牌','翻前','翻牌','转牌','河牌','结算','清桌','下一手'],'用下一步或播放控制推进；每步保存日志；暂停后可切换布局。'),
 s('reconnect','流程','重连快照／不重播发牌',['sync','静态恢复']),s('entry-fail','流程','入桌失败／重试',['错误页','重试']),s('switch-room','流程','切桌／旧回调隔离',['切桌','清理旧状态']),s('exit','流程','离桌／重新进入',['离桌','解绑','重进']),
 s('insurance-single','玩法','单池保险',['保险金额','outs','排序','购买','放弃','加时']),s('insurance-multi','玩法','多池保险',['切池','保存选项','联合购买']),s('insurance-force','玩法','强制最低保险',['最低投保','超时']),
 s('second-board','玩法','二道牌投票',['投票头像','同意','拒绝','超时','双排发牌']),
 s('squid-revealed','玩法','鱿鱼参与者亮牌与零标记',['亮牌不遮挡','数量0','本人及他人']),
 s('room-details','窗口','桌面房间配置入口',['点击房间信息','配置数据','关闭弹窗']),
 s('squid-result-figma','玩法','鱿鱼结算／Figma七人对照',['七人列表','正负长金额','5X奖励','十位ID']),
 s('squid-join','玩法','鱿鱼加入／零数量标记',['加入游戏','站起围观','鱿鱼数量0']),s('squid-active','玩法','鱿鱼标记／数量',['鱿鱼爪子','数量','剩余数']),s('squid-result','玩法','鱿鱼结算／正负金额',['鱿鱼结算','惩罚','分页说明']),
 s('mushroom','玩法','蘑菇随庄位移动',['蘑菇池','庄位动画']),s('critical','玩法','暴击开场',['暴击动画','自动翻牌']),s('jackpot','玩法','Jackpot开场／金额更新',['奖池','玩法入口']),s('calltime','玩法','盈利留桌／离桌确认',['CallTime','离桌确认']),
 s('emoji','附属元素','本人及他人表情',['17款表情','座位定位']),s('gift','附属元素','赠钻飞行',['赠钻','起点终点']),s('throw','附属元素','道具投掷',['道具','目标玩家']),
 s('chat','窗口','聊天／弹幕／未读',['聊天面板','长文本','滚动','弹幕']),s('report','窗口','战绩／观众／多个页签',['战绩','观众','保险','鱿鱼','Jackpot']),s('history','窗口','牌谱／各街／收藏',['牌谱','翻页','详情','Showdown','收藏']),s('profile','窗口','玩家资料／备注／管理',['本人资料','他人资料','备注','禁言','移走','赠钻']),s('settings','窗口','个性设置所有页签',['布局','牌面','牌背','桌布','字号','快捷加注']),s('rules','窗口','房间配置／安全提示',['房间配置','权限','安全卫士']),
 s('media-voice','音视频','语音／静音／发言图标',['麦克风','发言标记','四按钮底栏']),s('media-video','音视频','视频占位／窗花／开关',['视频槽','四款窗花','六按钮底栏'],'本地占位画面，不访问摄像头、麦克风或 Agora；使用底栏开关。'),
 s('mtt-wait','赛事','等待开赛',['赛事倒计时']),s('mtt-break','赛事','休息／决赛调整',['赛事休息']),s('mtt-bubble','赛事','泡沫同步',['泡沫提示']),s('mtt-transfer','赛事','拆合桌等待',['换桌提示']),s('mtt-addon','赛事','增购／托管',['ADD-ON','取消托管']),
];
auditScenarios.push(
 s('profile-admin','窗口','管理员资料／音视频／道具',['站起','踢出','禁言','音视频','三页签','12款道具']),
 s('profile-video','窗口','他人资料／音视频',['音视频','三页签','12款道具']),
 s('observer-bottom','玩家','旁观底部玩家下注',['底部非本人','头像上方下注','长金额']),
 s('settlement-all','玩家','全座位结算面板',['相邻昵称避让','本人底栏层级']),
 s('action-transition','流程','本人操作气泡与按钮切换',['大小盲','抓','操作按钮']),
 s('insurance-rules','窗口','保险说明与模拟房间赔率',['规则','Outs赔率表','毛玻璃']),
 s('insurance-rules-standard','窗口','经典保险说明／完整赔率表',['经典规则','多人赔率','内部滚动']),
 s('insurance-rules-ev','窗口','EV保险说明',['EV规则','无Outs表']),
 s('sidepots-long','玩家','九个长金额边池',['长金额','换行','不压筹码图标']),
 s('report-departed','窗口','战绩已离桌玩家',['删除线','暗色','本人红点','输赢颜色']),
 s('report-mushroom','窗口','蘑菇记录／轮次翻页',['上一轮','下一轮','轮次滑杆']),
 s('menu','窗口','侧菜单全部入口',['返回','设置','保险规则','带入']),
 s('settings-quick','窗口','快捷下注设置',['初代入口','三五按钮','百分比','提交模式']),
 s('settings-system','窗口','系统设置',['音效','金额显示']),
 s('intro-mushroom','玩法','蘑菇介绍完整图文',['图片','确认按钮','长文本']),
 s('intro-critical','玩法','暴击介绍完整图文',['图片','确认按钮','长文本']),
 s('intro-squid','玩法','鱿鱼介绍完整图文',['图片','确认按钮','不再提示']),
 s('bring-deposit','入座','押金不占带入限额',['1000+60','4000+60','关闭提示续带入']),
 s('settlement-bets','流程','结算时旧下注仍在快照',['赢家筹码','旧下注清理']),
);
export function makeAuditSnapshot(o:AuditOptions):TableSnapshot {
 const count=Math.min(9,Math.max(2,o.seats)),hero=Math.min(count,Math.max(1,o.hero)),scene=o.scene;
 const n=scene==='four'?4:scene==='five'?5:scene==='six'?6:o.cards;
 const names=['本人昵称','左下玩家','长昵称ABCDEFGHIJKLMN','左上玩家','顶部甲','顶部乙','右上玩家','右侧玩家','右下玩家'];
 const players:Player[]=Array.from({length:count},(_,i)=>({seat:i+1,userRid:100+i,name:o.long||scene==='long'?'Long nickname 玩家ABCDEFGHIJK':names[i]!,chips:o.long||scene==='long'?123456789:20000+i*137,avatar:scene==='zero'?'':new URL('../../src/assets/style1/resources/raw/ui/avatar.png',import.meta.url).href,cards:i+1===hero?[14,29,44,59,13,28].slice(0,n):Array(n).fill(0),roundBet:i===0?200:100+i*17,action:['跟注','下注','跟注','让牌','全下','小盲','大盲','补盲','抓'][i]!,canPlayStatus:1}));
 let state:TableSnapshot={roomID:909090,matchID:0,handNum:12,revision:1,presentation:'sync',name:'离线验收',mySeat:hero,seatCount:count,dealerSeat:o.dealer||hero,pot:2040,pots:[2040,1020],smallBlind:10,roundBet:200,community:[18,35,52,37,22],actions:[],betting:{id:'audit-1',call:200,min:400,max:19999,step:1,allIn:20000},players,menu:{insurance:true,retainType:1,retainMinRate:1,storeChips:1000,keepingSeat:false,keepSeatDuration:180},uniqueID:'AUDIT-LOCAL'};
 if(scene==='observer-bottom'){state.mySeat=0;state.actions=[];}
 if(scene==='action-transition'){state.actions=['fold','call','raise'];}
 if(scene==='bring-out')state.menu!.retainType=2;
 const actor=Math.min(count,Math.max(1,o.actor||hero));
 const update=(fn:(p:Player)=>Player)=>{state.players=state.players.map(fn);};
 if(['actions','figma','check','raise','dealer-self','dealer-other','long','six'].includes(scene))Object.assign(state,{actions:['fold','call','raise','allin'],canAddTime:true,addTimeCost:10});
 if(scene==='check'){state.actions=['fold','check','raise','allin'];state.betting!.call=0;}
 if(scene==='allin-call'){state.actions=['fold','allin'];state.betting!.allIn=100;update(p=>p.seat===hero?{...p,chips:100}:p);}
 if(scene==='straddle'){state.actions=['straddle','check'];state.betting!.straddle=40;}
 if(scene==='dealer-other')state.dealerSeat=hero%count+1;
 if(['revealed','four','five','six','settlement','split'].includes(scene))update((p)=>({...p,cards:[14,29,44,59,13,28].slice(0,n)}));
 if(scene==='six')state.secondCommunity=[17,34,51,36,21];
 if(scene==='folded'){update(p=>p.seat===hero?{...p,folded:true,showCardsSelection:[],action:''}:p);}
 if(scene==='partial')update(p=>({...p,cards:[14,0],action:''}));
 if(scene==='status')update(p=>({...p,action:'',cards:[],canPlayStatus:p.seat%3===0?0:1,keepSeatReason:p.seat%3===1?1:0,keepSeatDeadline:Date.now()/1000+120,isAutoop:p.seat%3===2}));
 if(scene.startsWith('waiting-')||scene==='post-blind')update(p=>p.seat===actor?{...p,cards:[],action:'',canPlayStatus:scene==='post-blind'?2:Number(scene.split('-')[1])}:p);
 if(scene.startsWith('keep-')||scene==='reserved')update(p=>p.seat===actor?{...p,cards:[],action:'',keepSeatReason:scene==='reserved'?1:Number(scene.split('-')[1]),keepSeatDeadline:Date.now()/1000+120}:p);
 if(scene.startsWith('acting-')||scene==='countdown-expire'){const seat=scene==='acting-other'?hero%count+1:hero;state.actingSeat=seat;state.countdowns=[{seat,deadline:Date.now()/1000+(scene==='countdown-expire'?4:30),totalTime:30}];if(seat===hero){state.actions=['fold','call','raise'];state.canAddTime=true;state.addTimeCost=10;}}
 if(scene==='allin'||scene==='insurance-buying')update(p=>({...p,action:'全下',chips:0,cards:[14,29],winPercent100:p.seat===hero?6789:undefined,insuranceDeadline:scene==='insurance-buying'&&p.seat===actor?Date.now()/1000+30:undefined}));
 if(scene==='sidepots-long'){state.pot=123456789;state.pots=Array.from({length:9},(_,i)=>123456789+i*1000);}
 if(scene==='zero')update(p=>({...p,chips:0,roundBet:0,action:''}));
 if(scene==='settlement-all'||scene==='settlement'||scene==='split'||scene==='settlement-bets'){state.handEnded=true;update(p=>({...p,action:'',roundBet:0,settlement:{cards:{highlight:[14],popup:[14]},win:scene==='settlement-all'||p.seat===hero||p.seat===actor||p.seat===count?{handValueType:7,collectedChips:12345}:undefined}}));}
 if(scene==='settlement-bets')update(p=>({...p,roundBet:123456}));
 if(scene.startsWith('early-win-')){
  const count=scene.endsWith('preflop')?0:scene.endsWith('flop')?3:4;
  state.community=[2,18,36,39].slice(0,count);state.handEnded=true;state.actions=[];
  update(p=>({...p,cards:[],action:'',roundBet:0,settlement:p.seat===hero?{cards:{},win:{handValueType:0,collectedChips:12345}}:undefined}));
 }
 if(scene==='no-cards')update(p=>p.seat===hero?{...p,cards:[],action:''}:p);
 if(scene==='empty'||scene==='observer'||(scene.startsWith('bring-')&&scene!=='bring-out')){state.mySeat=0;state.actions=[];state.players=scene==='empty'?[]:players.filter(p=>p.seat!==hero);}
 if(scene.startsWith('handtype-')){state.handEnded=true;update(p=>({...p,cards:[14,29],action:'',roundBet:0,settlement:{cards:{highlight:[14],popup:[]},win:{handValueType:Number(scene.split('-')[1])+1,collectedChips:12345}}}));}
 if(scene==='figma'){if(o.layout==='classic')state.secondCommunity=[10,57,45,38,29];state.showBB=true;state.dealerSeat=hero;state.community=[8,2,57,38,11];state.pot=400;state.pots=[400];state.roundBet=240;state.betting={id:'figma',call:240,min:480,max:1999,step:1,allIn:2000};update(p=>({...p,cards:p.seat===hero?[29,10]:[0,0],action:p.seat===count?'下注':'',roundBet:p.seat===hero?460:p.seat%3?40:240}));}
 if(scene.startsWith('board-')){const phase=scene.replace('board-',''),n=phase.endsWith('preflop')?0:phase.endsWith('flop')?3:phase.endsWith('turn')?4:5;state.community=[2,24,43,38,11].slice(0,n);state.secondCommunity=phase.startsWith('dual-')?[10,57,45,38,29].slice(0,n):[];}
 return state;
}
