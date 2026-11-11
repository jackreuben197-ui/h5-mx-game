/** CC UserStore.UserPropData. */
export interface UserPropData {
    propID: number; propType: number; priceID: number; propCode: string;
    rawPrice: number; payPrice: number; subscriptionName: string;
    propAmount: number; gamePropID: number; propTypeCategory: number;
    propTypeCategoryName: string; propTypeCategoryIcon: string;
}
export interface ServerUserProp {
    prop_id: number; prop_type: number; price_id: number; prop_code: string;
    raw_price: number; pay_price: number; start_time: number; end_time: number;
    subscription_name: string; prop_amount: number; game_prop_id: number;
    prop_type_category: number; prop_type_category_name: string; prop_type_category_icon: string;
}
