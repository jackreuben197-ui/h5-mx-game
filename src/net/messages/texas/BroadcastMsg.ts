import type { ServerMessageBroadcastMsg } from '@silenthill/agreement-web';
import type { MessageContext } from '../MessageContext.js';
import { BroadcastCode, getMagicEmojiTypeBase, getThrowPropTypeBase, PropsID } from '../../../logic/BroadcastCode.js';
/** CC 1019 confirms the pending self animation; never play optimistically. */
export function BroadcastMsg(data: ServerMessageBroadcastMsg.AsObject, context: MessageContext): false {
    context.data.emoji.confirmPendingEmoji(data.status, userID => !!context.data.snapshot?.playersList.some(p => p.userRid === userID && p.seatId > 0));
    context.data.emoji.confirmPendingThrowProp(data.status, userID => !!context.data.snapshot?.playersList.some(p => p.userRid === userID && p.seatId > 0));
    return false;
}
/** CC 1121 ignores both self IDs so the 1019 animation cannot be played twice. */
export function handleBroadcastExtra(extra: Uint8Array | string, context: MessageContext): void {
    const inner = parseBroadcastInner(extra); if (!inner) return;
    const userID = Number(inner.user_id || 0), type = Number(inner.type || 0);
    if (!userID || userID === context.session.userRID || userID === context.session.userID) return;
    if (type >= getMagicEmojiTypeBase()) context.data.emoji.emojiEvent({type, userID});
    else if (type >= getThrowPropTypeBase() && type <= PropsID.PROPSBASEBALL) {
        const targetUserID = Number(inner.target_user_id || 0);
        if (targetUserID) context.data.emoji.throwPropEvent({type, userID, targetUserID});
    }
}
function parseBroadcastInner(extra: Uint8Array | string): Record<string, unknown> | null {
    try {
        const text = typeof extra === 'string' ? (extra.charAt(0) === '{' ? extra : new TextDecoder().decode(Uint8Array.from(atob(extra), c => c.charCodeAt(0)))) : new TextDecoder().decode(extra);
        const outer = JSON.parse(text);
        if (!outer || Number(outer.code) !== BroadcastCode.BroadcastMsg) return null;
        const inner = typeof outer.data === 'string' ? JSON.parse(outer.data) : outer.data;
        return inner && typeof inner === 'object' ? inner : null;
    } catch { return null; }
}
