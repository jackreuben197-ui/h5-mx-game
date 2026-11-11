import { i18nMgr } from './i18nMgr.js';
/** ActionAll data retains CC strings; resolve their existing localization keys at render time. */
const keys: Record<string,string> = {
  "弃牌": "UITexas_fold",
  "过牌": "UITexas_check",
  "跟注": "UITexas_call",
  "加注": "adaptation10045",
  "全下": "adaptation30074",
  "下注": "UITexas_Bet",
  "前注": "UIClub_RoomCreat_gmo7laWj",
  "押金": "UIFantasy_dairuyajin"
};
export function ccActionText(action: string): string { return keys[action] ? i18nMgr.Get(keys[action]!, [], action) : action; }
