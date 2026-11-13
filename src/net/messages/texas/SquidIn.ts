import type { ServerMessageSquidIn } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function SquidIn(body:ServerMessageSquidIn.AsObject,context:MessageContext):boolean{
 const player=context.state.playersList.find(p=>p.seatId===body.seatId);if(!player)return false;
 player.inSquid=body.enable;
 if(body.squidTotalLimit>0)context.data.squid.totalLimit=body.squidTotalLimit;
 if(body.seatId===context.state.myInfo?.seatId)context.data.squid.showJoin=context.data.squid.state.enabled&&!body.enable;
 if(body.firstIn)context.data.squid.state={...context.data.squid.state,notice:'UISquidJoinInNewTips1'};
 return true;
}
