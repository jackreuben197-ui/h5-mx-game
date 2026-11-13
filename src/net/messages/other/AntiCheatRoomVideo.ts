import type { ServerMessageUtilAntiCheatRoomVideo } from '@silenthill/agreement-web';
import type { TableMedia } from '../../../media/TableMedia.js';
/** CC 902 triggers random verification only for a seated player in random mode. */
export function AntiCheatRoomVideo(_data:ServerMessageUtilAntiCheatRoomVideo.AsObject,media?:TableMedia):void {media?.randomVerify();}
