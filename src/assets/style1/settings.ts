/** Visual choices exposed by this UI package. Storage and setting behavior remain in MX. */
export const TABLE_SIZE_STEPS = [90,95,100,105,110] as const;
export const TABLE_FELT_COLORS = ['#079d80','#57427f','#3296d2','#269fa8','#78858e','#34383f','#843f50'] as const;
export const TABLE_CARD_BACKS = ['red','green','blue','indigo','black','gold'] as const;

export const demoAvatar = new URL('./resources/raw/ui/avatar.png',import.meta.url).href;
