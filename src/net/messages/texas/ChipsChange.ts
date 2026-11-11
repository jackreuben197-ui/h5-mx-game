import type { ServerMessageChipsChange } from '@silenthill/agreement-web';
import { MessageContext } from '../MessageContext.js';
export function ChipsChange(body: ServerMessageChipsChange.AsObject, context: MessageContext): boolean {
  for (const item of body.changesList) {
    const player = context.player(item.seatId);
    if (item.reason === context.pb.Def.ChipChangeReason.CC_NONE && player.userRid > 0 && item.change > 0)
      context.data.report.applyChipChange(player.userRid, item.change, player.name, player.avatar);
    player.chip = item.chips;
  }
  return true;
}
