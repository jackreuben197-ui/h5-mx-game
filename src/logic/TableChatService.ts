import type { ProtocolRoomData } from '../data/ProtocolRoomData.js';
import Chat, { type TexasChatMessage } from '../data/TexasGameRoomDataChat.js';
import type { HostSessionData } from '../data/HostSessionData.js';
import type { RoomTarget } from '../core/types.js';
import type { ProtocolClient } from '../net/ProtocolClient.js';
import type { HoldemRuntime } from '../net/ProtocolRuntime.js';
import type { HttpClient } from '../net/http/HttpClient.js';
import { CPErrorCode } from '../i18n/CPErrorCode.js';
/** CC UIChatDlg history and TexasTableEvent.SendChatMessage; no optimistic text echo. */
export class TableChatService {
  private sending = false;
  constructor(private data:ProtocolRoomData,private target:RoomTarget,private session:HostSessionData,
    private client:ProtocolClient,private pb:HoldemRuntime,private http:HttpClient,private signal:AbortSignal) {}
  async send(text:string,danmu:boolean):Promise<void>{
    const content=text.trim();if(!content||this.sending||this.data.mtt)return;
    this.sending=true;
    const timestamp=Date.now(),s=this.session;
    this.data.chat.setPendingMessage({userID:s.userID,name:s.nickname,content,headUrl:s.avatar,sex:s.sex,timestamp,time:Chat.formatTimestamp(timestamp)});
    try{
      for(const bullet of danmu?[false,true]:[false]){
        const room=new this.pb.Room();room.setRoomId(this.target.roomID);room.setMatchId(this.target.matchID);
        const body=new this.pb.ClientMessageBroadcastMsg();body.setRoom(room);body.setConsume(this.pb.Def.ConsumeType.CT_NONE);
        body.setMsgType(bullet?this.pb.Def.BroadcastMsgType.BC_MSG_BULLET:this.pb.Def.BroadcastMsgType.BC_MSG_AVATAR);body.setMessage(content);
        const inner={name:s.nickname,type:0,user_id:s.userID,target_user_id:0,message:content,msgType:2,time:timestamp,sex:s.sex,headUrl:s.avatar,...(bullet?{isDanmu:true,danmuType:1}:{})};
        body.setExtra(new TextEncoder().encode(JSON.stringify({code:1000,data:JSON.stringify(inner)})));
        const result=await this.client.request(this.pb.Code.MSG_D_BROADCAST_MSG,this.target.roomID,this.target.matchID,body,this.pb.ServerMessageBroadcastMsg,this.signal);
        if(result.status!==0)throw new Error(CPErrorCode.ServerErrorDescription(result.status));
      }
      await this.history(false,true).catch(() => { /* Sending succeeded; leave history dirty for the next open. */ });
    }finally{this.sending=false;}
  }
  async history(older=false,force=false):Promise<void>{
    const chat=this.data.chat;
    const org=[2,3].includes(this.data.record?.originType??0);
    const prologue=org?this.session.roomPrologue(this.data.record?.clubId??0):null;
    if(prologue!==undefined)chat.setDefaultPrologue(prologue);
    if(!chat.beginHistoryLoad(older,force))return;
    const revision=chat.latestHistoryRevision;
    try{
      const result=await this.http.request<{data:Record<string,unknown>[];prologue?:string}>('/api/chat/room/message/sync',{
        room_id:this.target.roomID,block_user_random_ids:[],is_cowboy:0,msg_types:[0,1,3],limit:20,...(older?{before_id:chat.oldestHistoryID}:{})
      },{signal:this.signal});this.signal.throwIfAborted();
      if(!Array.isArray(result.data))throw new Error('聊天记录格式错误');
      const organization=[2,3].includes(this.data.record?.originType??0);
      const messages:TexasChatMessage[]=[];let oldest:number|null=null,prologue:string|null=null;
      for(const row of result.data){
        const id=Number(row.id);if(id>0)oldest=oldest===null?id:Math.min(oldest,id);
        try{
          const outer=JSON.parse(String(row.extra??''));if(![1000,10001].includes(outer.code))continue;
          const m=typeof outer.data==='string'?JSON.parse(outer.data):outer.data;if(!m||m.msgType===3)continue;
          if(m.is_prologue){if(organization)prologue=m.message||'';continue;}
          const timestamp=Chat.normalizeTimestamp(m.time||row.create_time);
          if(m.msgType!==1&&!m.message)continue;
          messages.push({id:id>0?id:undefined,userID:Number(m.user_id||row.user_id)||undefined,name:m.name||'',headUrl:m.headUrl||'',sex:m.sex||0,timestamp,time:Chat.formatTimestamp(timestamp),content:m.msgType===1?'':m.message,emojiType:m.msgType===1?m.type:undefined});
        }catch{/* Skip malformed history entries, preserving cursor progress. */}
      }
      chat.mergeHistoryPage(messages,prologue??(organization?result.prologue??null:null),prologue!==null,oldest,result.data.length>=20,!older);
      if(!older){chat.markLatestHistorySynced(revision);if(chat.needsLatestHistorySync)await this.history(false,true);}
    }catch(error){chat.failHistoryLoad();throw error;}
  }
  async quickMessages():Promise<unknown>{
    const data=await this.http.request<{game_quick_message_config?:unknown}>('/api/config/global/config',{}, {signal:this.signal});
    this.signal.throwIfAborted();return data.game_quick_message_config;
  }
}
