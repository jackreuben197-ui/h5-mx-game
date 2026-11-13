import type {ServerMessageJackpotAward} from '@silenthill/agreement-web';
import type {MessageContext} from '../MessageContext.js';
export function JackpotAward(body:ServerMessageJackpotAward.AsObject,context:MessageContext):boolean {
  context.data.jackpot.award(body.awardUsersList);return true;
}
