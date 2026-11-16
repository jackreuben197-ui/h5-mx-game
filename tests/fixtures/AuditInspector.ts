import type {AuditHost} from './AuditHost.js';
import type {Player,TableSnapshot} from '../../src/core/types.js';
/** Explicit local editor for combinations absent from the design; never installed in H5. */
export function installAuditInspector(container:HTMLElement,host:AuditHost):void {
 const panel=document.createElement('details');panel.style.cssText='padding:8px;max-width:1050px';const title=document.createElement('summary');title.textContent='逐元素模拟编辑器（修改当前指定座位；仅本地数据）';panel.append(title);container.after(panel);
 const form=document.createElement('div');form.style.cssText='display:flex;flex-wrap:wrap;gap:8px';panel.append(form);
 const controls=new Map<string,HTMLInputElement>();
 function input(key:string,label:string,type='text'){const wrap=document.createElement('label');wrap.textContent=label+' ';const node=document.createElement('input');node.type=type;node.style.width=type==='checkbox'?'auto':'100px';node.dataset.auditField=key;wrap.append(node);form.append(wrap);controls.set(key,node);return node;}
 const actor=input('seat','座位','number');actor.min='1';actor.max=String(host.options.seats);actor.value=String(host.options.actor);
 const textFields:readonly [keyof Player,string][]=[['name','昵称'],['avatar','头像URL（本地）'],['action','操作类型']];
 const numFields:readonly [keyof Player,string][]=[['chips','筹码'],['roundBet','下注'],['sex','性别值'],['winPercent100','胜率×100'],['canPlayStatus','等待状态'],['keepSeatReason','留座原因'],['keepSeatDeadline','留座截止秒'],['insuranceDeadline','保险截止秒'],['costMushroom','蘑菇押金'],['squidCount','鱿鱼数量']];
 const boolFields:readonly [keyof Player,string][]=[['folded','弃牌'],['isAutoop','托管'],['roundActioned','本轮已行动'],['inMushroom','参与蘑菇'],['squidIn','参与鱿鱼'],['squidEscaped','鱿鱼逃离']];
 for(const[k,l]of textFields)input(k,l);for(const[k,l]of numFields)input(k,l,'number');for(const[k,l]of boolFields)input(k,l,'checkbox');input('cards','手牌值（逗号）');input('showCardsSelection','亮牌选中0/1');input('handValueType','赢家牌型1–10','number');input('collectedChips','赢取金额','number');input('highlight','高亮牌值');input('popup','上浮牌值');
 const buttons=document.createElement('div');panel.append(buttons);const button=(label:string,run:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.onclick=run;buttons.append(b);};
 const get=(k:string)=>controls.get(k)!;const list=(k:string)=>get(k).value.split(',').map(v=>v.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
 const chosen=()=>host.state.players.find(p=>p.seat===Number(actor.value));
 function read(){const p=chosen();if(!p)return;for(const[k]of [...textFields,...numFields])get(k).value=p[k]===undefined?'':String(p[k]);for(const[k]of boolFields)get(k).checked=!!p[k];get('cards').value=p.cards.join(',');get('showCardsSelection').value=p.showCardsSelection?.join(',')??'';get('handValueType').value=String(p.settlement?.win?.handValueType??'');get('collectedChips').value=String(p.settlement?.win?.collectedChips??'');get('highlight').value=p.settlement?.cards?.highlight?.join(',')??'';get('popup').value=p.settlement?.cards?.popup?.join(',')??'';}
 button('读取座位',read);button('应用玩家元素',()=>{const p=chosen();if(!p)return;const changes:Record<string,unknown>={};for(const[k]of textFields)changes[k]=get(k).value;for(const[k]of numFields)changes[k]=get(k).value===''?undefined:Number(get(k).value);for(const[k]of boolFields)changes[k]=get(k).checked;changes.cards=list('cards');changes.showCardsSelection=list('showCardsSelection');changes.settlement={cards:{highlight:list('highlight'),popup:list('popup')},win:get('handValueType').value?{handValueType:Number(get('handValueType').value),collectedChips:Number(get('collectedChips').value)}:undefined};host.publish({players:host.state.players.map(x=>x.seat===p.seat?{...x,...changes}:x)});});
 button('设为庄家',()=>host.publish({dealerSeat:Number(actor.value)}));button('轮到该玩家',()=>host.publish({actingSeat:Number(actor.value),countdowns:[{seat:Number(actor.value),deadline:Date.now()/1000+30,totalTime:30}]}));button('清除行动光圈',()=>host.publish({actingSeat:undefined,countdowns:[]}));
 for(const[k,l]of [['willStandup','下手站起'],['privateUc','私局币'],['handEnded','一手结束']]as const){const check=input(k,l,'checkbox');check.onchange=()=>host.publish({[k]:check.checked} as Partial<TableSnapshot>);}
 button('播放该座位表情',()=>{const p=chosen();if(p)host.features.data.emoji.emojiEvent({type:710,userID:p.userRid!});});
 actor.onchange=read;read();
}
