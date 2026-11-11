import type { WebRoomCenterHistoryReplay } from '../net/http/ReplaySchema.js';
export type ReplayHandData = typeof WebRoomCenterHistoryReplay.Data & {pub_cards?: string; pub_cards2?: string; collected?: boolean};
