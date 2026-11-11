import type { RoomRecord } from '@silenthill/agreement-web';
import type { HttpClient } from '../net/http/HttpClient.js';
import type { GlobalConfigStore } from '../data/GlobalConfigStore.js';
/** Port of CC GameplayTableSettingDataProvider: club/tribe permissions, global fallback. */
export class GameplayTableSettingDataProvider {
  private cache = new WeakMap<RoomRecord.AsObject, Promise<Record<string,number>>>();
  constructor(private http: HttpClient, private global: GlobalConfigStore) {}
  getData(record: RoomRecord.AsObject, clubID: number, signal: AbortSignal): Promise<Record<string,number>> {
    const cached=this.cache.get(record); if(cached)return cached;
    const pending=this.load(record,clubID,signal).catch(error=>{this.cache.delete(record);throw error;});
    this.cache.set(record,pending);return pending;
  }
  parsePermissions(raw: unknown): Record<string,number> {
    if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{return {}}}
    if(!raw || typeof raw!=='object' || Array.isArray(raw))return {};
    return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Number(v||0)]));
  }
  private async load(record: RoomRecord.AsObject, clubID: number, signal: AbortSignal): Promise<Record<string,number>> {
    if(clubID!==0 || record.tribeId>1) {
      try {
        const response=await this.http.request<{data?:{room_permissions?:unknown};room_permissions?:unknown}>(
          '/api/org/tribe/room_permissions',{club_id:clubID,tribe_id:record.tribeId},{signal});
        return this.parsePermissions((response?.data??response)?.room_permissions);
      }catch{signal.throwIfAborted();}
    }
    let raw=this.global.get('room_permissions');
    if(raw===undefined) {
      try {
        const response=await this.http.request<{data?:{room_permissions?:unknown};room_permissions?:unknown}>('/api/config/global/config',{}, {signal});
        raw=(response?.data??response)?.room_permissions;
      }catch{signal.throwIfAborted();}
    }
    return this.parsePermissions(raw);
  }
}
