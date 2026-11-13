import type {ServerMessageJackpotGoldChange} from '@silenthill/agreement-web';
import type {MessageContext} from '../MessageContext.js';
export function JackpotGoldChange(body:ServerMessageJackpotGoldChange.AsObject,context:MessageContext):boolean {
  const data=context.data;
  const id=body.jackpotId??data.jackpot.state.id,gold=body.jackpotGold||0,parent=body.jackpotParentGold||gold;
  if(data.record)Object.assign(data.record,{jackpotId:id,jackpotGold:gold,jackpotParentGold:parent});
  data.jackpot.update(id,gold,parent);return true;
}
