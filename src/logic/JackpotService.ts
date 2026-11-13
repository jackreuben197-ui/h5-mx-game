import type {ProtocolRoomData} from '../data/ProtocolRoomData.js';
import {JackpotData} from '../data/JackpotData.js';
import type {HttpClient} from '../net/http/HttpClient.js';
import type {HostTransport} from '../host/HostTransport.js';
/** CC JackpotFeature panel bridge and room-scoped preloading. */
export class JackpotService {
  private cache?:{id:number;key:string;template:unknown;items:unknown[];top:unknown};
  private task?:Promise<void>;
  constructor(private data:ProtocolRoomData,private http:HttpClient,private transport:HostTransport,private signal:AbortSignal){
    const off=data.jackpot.on(JackpotData.AWARD,awardUsersList=>{if(!signal.aborted)this.transport.send('showPanel',{panelType:'jackpotAward',title:'',props:{awardUsersList}});});
    signal.addEventListener('abort',off,{once:true});
  }
  private filters(){const r=this.data.record!,s=this.data.snapshot?.roomInfo;return {game_type:r.gameType||0,poker_type:r.pokerType||0,limit_bet_type:r.limitBetType||0,bombpot:s?.ignorePreflop&&s.isAlwaysSecondPcs?1:0};}
  preload():Promise<void>{
    if(this.task)return this.task;
    if(!this.data.jackpot.enabled)return Promise.resolve();
    const id=this.data.jackpot.state.id,f=this.filters(),key=Object.values(f).join('_');
    if(this.cache?.id===id&&this.cache.key===key)return Promise.resolve();
    return this.task=(async()=>{
      const [template,awards]=await Promise.allSettled([
        this.http.request<{item?:unknown}>('/api/org/jackpot/template/info',{jackpot_id:id},{signal:this.signal}),
        this.http.request<{items?:unknown[];top_cards_type_data?:unknown}>('/api/stats/jackpot/award_logs',{jackpot_id:id,game_type:[f.game_type],poker_type:[f.poker_type],limit_bet_type:[f.limit_bet_type],bombpot:[f.bombpot],start_time:0,end_time:0,limit:15,offset:0},{signal:this.signal})
      ]);
      if(this.signal.aborted||this.data.jackpot.state.id!==id)return;
      this.cache={id,key:awards.status==='fulfilled'?key:'',template:template.status==='fulfilled'?template.value?.item??null:null,items:awards.status==='fulfilled'?awards.value?.items??[]:[],top:awards.status==='fulfilled'?awards.value?.top_cards_type_data??null:null};
    })().finally(()=>{this.task=undefined;});
  }
  open():void{
    if(this.signal.aborted||!this.data.jackpot.enabled)return;
    const j=this.data.jackpot,s=this.data.snapshot?.roomInfo,c=this.cache?.id===j.state.id?this.cache:undefined;
    this.transport.send('showPanel',{panelType:'jackpotRecord',title:'',props:{jackpot_id:j.state.id,...this.filters(),small_blind:s?.smallBlind??0,jackpot_gold:j.state.gold,jackpot_parent_gold:j.displayPool,initial_template:c?.template??null,initial_records:c?.items??[],initial_top_record:c?.top??null,initial_record_request_key:c?.key??''}});
  }
}
