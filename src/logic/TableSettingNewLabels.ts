import type { HttpClient } from '../net/http/HttpClient.js';
/** CC new-label protocol. Three displays, snake/camel response keys, one report per opening. */
export class TableSettingNewLabels {
  static readonly keys=new Set(['room_random_seat','auto_change_room','room_bringin_equal','room_min_chip','room_bringin_limit','room_force_show_card','room_look_hand_card','room_check_pool_rate','room_only_ios','room_jackpot','room_critical_hit','room_random_ante','room_encrypt_cards','room_settle_per_hand','room_settle_per_game','room_settle_by_ratio','room_settle_by_fixed','room_settle_preflop_free','room_settle_thr_discount','room_settle_minpot_free','room_hc_total_hands']);
  private counts:Record<string,number>={};
  private loaded=false;
  private loading?:Promise<void>;
  private queue:Promise<void>=Promise.resolve();
  constructor(private http:HttpClient,private tribeID:number,private signal:AbortSignal,private changed:()=>void){}
  load():Promise<void>{
    if(this.loaded||this.tribeID<=0||this.signal.aborted)return Promise.resolve();
    return this.loading??=this.http.request<{user_new_label_num?:Record<string,number>}>('/api/org/user/new_label/read/num',{tribe_id:this.tribeID},{signal:this.signal}).then(value=>{
      this.signal.throwIfAborted();this.counts=value.user_new_label_num??{};this.loaded=true;this.changed();
    }).catch(()=>{}).finally(()=>{this.loading=undefined;});
  }
  isNew(key:string):boolean{
    const camel=key.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase());
    return this.tribeID>0&&this.loaded&&TableSettingNewLabels.keys.has(key)&&Number(this.counts[key]??this.counts[camel]??0)<3;
  }
  report(keys:Iterable<string>):Promise<void>{
    const labels=[...new Set(keys)].filter(key=>this.isNew(key));
    if(!labels.length||this.signal.aborted)return Promise.resolve();
    this.queue=this.queue.then(async()=>{
      if(this.signal.aborted)return;
      const active=labels.filter(key=>this.isNew(key));if(!active.length)return;
      await this.http.request('/api/org/user/new_label/read',{tribe_id:this.tribeID,user_read_labels:active},{signal:this.signal});
      this.signal.throwIfAborted();
      for(const key of active){const camel=key.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase());this.counts[key]=Number(this.counts[key]??this.counts[camel]??0)+1;}
      this.changed();
    }).catch(()=>{});
    return this.queue;
  }
}
