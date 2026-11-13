import type { ServerMessageVideoMaskChange } from '@silenthill/agreement-web';
import type { MessageContext } from '../MessageContext.js';
/** CC 1133: update only the currently seated occupant. */
export function VideoMaskChange(data:ServerMessageVideoMaskChange.AsObject,c:MessageContext):boolean {
  const player=c.state.playersList.find(p=>p.userRid===data.userRid);
  if(!player)return false;
  player.videoMaskId=data.videoMaskId>4?1:data.videoMaskId;
  return true;
}
