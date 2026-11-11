import MagicEmojiConfig, { type MagicEmojiDefinition } from './MagicEmojiConfig.js';
import { GameplayChatPropType } from './GameplayChatPropType.js';
import type { UserPropData, ServerUserProp } from '../data/UserPropData.js';
export interface EmojiItemData { data: UserPropData; config: MagicEmojiDefinition; }
export interface EmojiCategoryData { id: number; name: string; icon: string; items: EmojiItemData[]; }
/** Copied from CC UserStoreUtils / UserStore / UIEmojiDlg. */
export class EmojiPropRules {
    static map(items: ServerUserProp[], now = Date.now() / 1000): UserPropData[] {
        return items.map(item => ({
            propID: item.prop_id, propType: item.prop_type, priceID: item.price_id, propCode: item.prop_code,
            rawPrice: item.raw_price, payPrice: item.start_time <= now && now <= item.end_time ? item.pay_price : item.raw_price,
            subscriptionName: item.subscription_name, propAmount: item.prop_amount, gamePropID: item.game_prop_id,
            propTypeCategory: item.prop_type_category, propTypeCategoryName: item.prop_type_category_name, propTypeCategoryIcon: item.prop_type_category_icon,
        }));
    }
    static isPropFree(data: UserPropData): boolean { return !!data.subscriptionName || data.propAmount > 0; }
    static categories(list: UserPropData[]): EmojiCategoryData[] {
        const categories: EmojiCategoryData[] = [];
        list.filter(item => item.propType === GameplayChatPropType.CHAT_PROP).forEach(data => {
            const config = MagicEmojiConfig.getByPropCode(data.propCode); if (!config) return;
            let category = categories.find(item => item.id === data.propTypeCategory);
            if (!category) categories.push(category = { id: data.propTypeCategory, name: data.propTypeCategoryName, icon: data.propTypeCategoryIcon, items: [] });
            if (category.items.length < 10) category.items.push({data, config});
        });
        return categories.sort((a, b) => a.id - b.id).slice(0, 5);
    }
}
