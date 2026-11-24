// Ported from CC data/room/texas/TexasGamePersonalSettings.ts; engine hooks replaced only.
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import LocalStorage from './LocalStorage.js';
const StorageKey = {
    SHOW_BB:'SHOW_BB',
    TEXAS_DESKTYPE:'TEXAS_DESKTYPE',
    TEXAS_POKERCARDTYPE:'TEXAS_POKERCARDTYPE',
    SOUND_IS_OPEN:'SOUND_IS_OPEN',
    TEXAS_SHORTCUTS_3:'TEXAS_SHORTCUTS_3',
    TEXAS_SHORTCUTS_5:'TEXAS_SHORTCUTS_5',
    TEXAS_SHORTCUTS_MODE:'TEXAS_SHORTCUTS_MODE',
    TABLE_APPEARANCE:'TABLE_APPEARANCE',
    TEXAS_SLIDER_SUBMIT:'TEXAS_SLIDER_SUBMIT',
    TEXAS_CUSTOM_POT_RATIOS:'TEXAS_CUSTOM_POT_RATIOS',
};
const AssetCollectionType = { SpriteFrameCard0:1, SpriteFrameCard1:2 } as const;
type PokerCardType = 1 | 2;
import { TABLE_SIZE_STEPS, TABLE_FELT_COLORS, TABLE_CARD_BACKS } from '../config/AppearanceConfig.js';
export { TABLE_SIZE_STEPS, TABLE_FELT_COLORS, TABLE_CARD_BACKS } from '../config/AppearanceConfig.js';
export type TableLayoutId = 'original' | 'classic' | 'balanced' | 'oval';
export interface TableAppearance {
    layout: TableLayoutId;
    style: 'legacy' | 'solid';
    feltColor: string;
    cardBack: typeof TABLE_CARD_BACKS[number] | 'original';
    publicCardSize: number;
    tableTextSize: number;
    betButtonSize: number;
}
const defaultAppearance = (): TableAppearance => ({layout:'balanced',style:'solid',feltColor:TABLE_FELT_COLORS[0],cardBack:'original',publicCardSize:100,tableTextSize:100,betButtonSize:100});
export interface ShortCut {
    name: string;
    percent: number;
}

export enum shortCutMode {
    Button3 = 1,
    Button5 = 2
}

const TexasGameDfaultShortCutsList: ShortCut[] = [
    {
        name: '1/5',
        percent: 0.2
    },
    {
        name: '1/4',
        percent: 0.25
    },
    {
        name: '1/3',
        percent: 0.333
    },
    {
        name: '1/2',
        percent: 0.5
    },
    {
        name: '2/3',
        percent: 0.66
    },
    {
        name: '3/4',
        percent: 0.75
    },
    {
        name: '1.0',
        percent: 1
    },
    {
        name: '1.2',
        percent: 1.2
    },
    {
        name: '1.5',
        percent: 1.5
    },
    {
        name: '2',
        percent: 2
    }
] as const;

const defaultShortcuts3 = [3, 6, 7];

export class TexasGamePersonalSettings extends EventSource {
    static readonly APPEARANCE_CHANGE = 'APPEARANCE_CHANGE';
    static readonly ACCOUNT_CHANGE = 'ACCOUNT_CHANGE';
    @observable(TexasGamePersonalSettings.APPEARANCE_CHANGE)
    appearance: Readonly<TableAppearance> = defaultAppearance();
    get supportsLayoutCustomization(): boolean { return this.appearance.layout !== 'original'; }
    // 初代固定使用编号桌布与预设显示尺寸，其他布局保存的选择继续保留。
    get tableAppearance(): Readonly<TableAppearance> {
        if (this.supportsLayoutCustomization) return this.appearance;
        return {...this.appearance, style:'legacy', cardBack:'original', publicCardSize:100, tableTextSize:100, betButtonSize:100};
    }
    get tableCardType(): PokerCardType { return this.pokerCardType; }
    get tableSliderSubmit(): 'release' | 'confirm' { return this.supportsLayoutCustomization ? this.sliderSubmit : 'confirm'; }
    get tableShortcuts(): readonly ShortCut[] { return this.shortCuts; }
    private accountID = 0;
    private saved: Record<string, unknown> = {};
    get revision(): number { return this.accountRevision; }
    private accountRevision = 0;
    private get scopeKey(): string { return `TABLE_PREFERENCES:v1:${this.brandID}:${this.accountID}`; }
    private read<T>(key: string, fallback: T): T {
        return this.brandID ? (this.saved[key] as T ?? fallback) : LocalStorage.getItem(key, fallback);
    }
    private write(key: string, value: unknown): void {
        if (!this.brandID) { LocalStorage.setItem(key,value); return; }
        this.saved[key]=value;
        if(this.accountID) LocalStorage.setItem(this.scopeKey,this.saved);
    }
    setAccount(userID: number): void {
        const id=Number.isSafeInteger(userID)&&userID>0?userID:0;
        if(id===this.accountID)return;
        this.accountID=id;this.accountRevision++;
        const stored=id?LocalStorage.getItem<unknown>(this.scopeKey,{}):{};
        this.saved=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored as Record<string,unknown>:{};
        if(id && this.brandID==='mx' && !LocalStorage.getItem('TABLE_PREFERENCES_MIGRATED',false)) {
            for(const key of Object.values(StorageKey)) {
                const value=LocalStorage.getItem<unknown>(key,undefined);
                if(value!==undefined && !(key in this.saved))this.saved[key]=value;
            }
            LocalStorage.setItem(this.scopeKey,this.saved);
            LocalStorage.setItem('TABLE_PREFERENCES_MIGRATED',true);
        }
        this.init();this.emit(TexasGamePersonalSettings.ACCOUNT_CHANGE);
    }
    updateAppearance(patch: Partial<TableAppearance>): void {
        const next=this.validateAppearance({...this.appearance,...patch});
        if(JSON.stringify(next)===JSON.stringify(this.appearance))return;
        this.write(StorageKey.TABLE_APPEARANCE,next);this.appearance=next;
    }
    private validateAppearance(value: unknown): TableAppearance {
        let p=(value&&typeof value==='object'?value:{}) as Partial<TableAppearance>;
        const layout=this.availableLayouts.includes(p.layout as TableLayoutId)?p.layout!:(this.availableLayouts.includes('balanced')?'balanced':this.availableLayouts[0]??'original');
        const size=(v:unknown)=>TABLE_SIZE_STEPS.includes(v as 100)?v as number:100;
        if(p.feltColor==='#8b72b5')p={...p,feltColor:'#57427f'};
        return {layout,style:p.style==='solid'?'solid':'legacy',feltColor:TABLE_FELT_COLORS.includes(p.feltColor as typeof TABLE_FELT_COLORS[number])?p.feltColor!:this.defaultFelt,cardBack:p.cardBack==='original'||TABLE_CARD_BACKS.includes(p.cardBack as 'red')?p.cardBack!:'original',publicCardSize:size(p.publicCardSize),tableTextSize:size(p.tableTextSize),betButtonSize:size(p.betButtonSize)};
    }
    public static readonly SLIDER_SUBMIT_CHANGE = 'SLIDER_SUBMIT_CHANGE';
    @observable(TexasGamePersonalSettings.SLIDER_SUBMIT_CHANGE)
    public sliderSubmit: 'release' | 'confirm' = 'confirm';
    public setSliderSubmit(value: 'release' | 'confirm'): void {
        if (value === this.sliderSubmit) return;
        this.write(StorageKey.TEXAS_SLIDER_SUBMIT, value);
        this.sliderSubmit = value;
    }
    public resetQuickSettings(): void {
        this.customRatios = {};
        this.write(StorageKey.TEXAS_CUSTOM_POT_RATIOS, this.customRatios);
        this.setSliderSubmit('confirm');
        this.shortCut3ActionsIndex = [...defaultShortcuts3];
        this.shortCut5ActionsIndex = [2, 3, 4, 6, 7];
        this.shortCutMode = shortCutMode.Button3;
    }
    public static readonly SHOW_BB = 'SHOW_BB';
    public static readonly DESK_TYPE_CHANGE = 'DESK_TYPE_CHANGE';
    public static readonly POKER_CARD_TYPE_CHANGE = 'POKER_CARD_TYPE_CHANGE';
    public static readonly SOUND_ON_CHANGE = 'SOUND_ON_CHANGE';
    public static readonly SHORTCUT_MODE_CHANGE = 'SHORTCUT_MODE_CHANGE';
    public static readonly SHORTCUTS_CHANGGE = 'SHORTCUTS_CHANGGE';

    public setShowBBToStorage(b: boolean) {
        if (this.showBB == b) return;
        this.write(StorageKey.SHOW_BB, b);
        this.showBB = b;
    }

    @observable(TexasGamePersonalSettings.SHOW_BB)
    public showBB: boolean = false;

    public setDeskTypeToStorage(b: number) {
        if (this.deskType == b) return;
        this.write(StorageKey.TEXAS_DESKTYPE, b);
        this.deskType = b;
    }

    @observable(TexasGamePersonalSettings.DESK_TYPE_CHANGE)
    public deskType: number = 0;

    public setPokerCardTypeToStorage(b: PokerCardType) {
        if (this.pokerCardType == b) return;
        this.write(StorageKey.TEXAS_POKERCARDTYPE, b);
        this.pokerCardType = b;
    }

    @observable(TexasGamePersonalSettings.POKER_CARD_TYPE_CHANGE)
    public pokerCardType: PokerCardType = AssetCollectionType.SpriteFrameCard0;

    public setSoundOnToStorage(b: boolean) {
        if (b == this.soundOn) return;
        this.write(StorageKey.SOUND_IS_OPEN, b);
        this.soundOn = b;
    }

    @observable(TexasGamePersonalSettings.SOUND_ON_CHANGE)
    public soundOn: boolean = true;
    public get hasSavedSoundPreference(): boolean {
        return typeof this.read<unknown>(StorageKey.SOUND_IS_OPEN, undefined) === 'boolean';
    }
    @observable(TexasGamePersonalSettings.SHORTCUTS_CHANGGE)
    public shortCuts: ShortCut[] = [];
    private customRatios: Record<string, (number | null)[]> = {};
    public setCustomPotRatio(slot: number, percentage: number): void {
        if (!Number.isInteger(slot) || slot < 0 || slot >= this.shortCuts.length || !Number.isInteger(percentage) || percentage < 10 || percentage > 100) return;
        const stored = this.customRatios[this.shortCutMode];
        const ratios = Array.isArray(stored) ? [...stored] : [];
        if (ratios[slot] === percentage) return;
        ratios[slot] = percentage;
        this.customRatios = {...this.customRatios, [this.shortCutMode]: ratios};
        this.write(StorageKey.TEXAS_CUSTOM_POT_RATIOS, this.customRatios);
        this.shortCuts = this.applyCustomRatios(this.shortCuts, this.shortCutMode);
    }
    private applyCustomRatios(cuts: ShortCut[], mode: shortCutMode): ShortCut[] {
        const stored = this.customRatios[mode];
        const ratios = Array.isArray(stored) ? stored : [];
        return cuts.map((cut, i) => {
            const value = ratios?.[i];
            return typeof value === 'number' && Number.isInteger(value) && value >= 10 && value <= 100
                ? {name: `${value}%`, percent: value / 100} : cut;
        });
    }
    private _shortCutMode: shortCutMode = shortCutMode.Button3;
    public get shortCutMode() {
        return this._shortCutMode;
    }
    public set shortCutMode(s: shortCutMode) {
        this.write(StorageKey.TEXAS_SHORTCUTS_MODE, s);
        this._shortCutMode = s;
        this.emit(TexasGamePersonalSettings.SHORTCUT_MODE_CHANGE, s);
        this.refreshShortCuts();
    }
    private refreshShortCuts(): void {
        const indices = this._shortCutMode === shortCutMode.Button5 ? this._shortCut5ActionsIndex : this._shortCut3ActionsIndex;
        this.shortCuts = this.applyCustomRatios(indices.map(index => TexasGameDfaultShortCutsList[index]!), this._shortCutMode);
    }
    private _shortCut3ActionsIndex: number[] = [];
    public get shortCut3ActionsIndex() {
        return this._shortCut3ActionsIndex;
    }
    public set shortCut3ActionsIndex(nu: number[]) {
        this.write(StorageKey.TEXAS_SHORTCUTS_3, nu);
        this._shortCut3ActionsIndex = nu;
        if (this._shortCutMode === shortCutMode.Button3) this.refreshShortCuts();
    }
    private _shortCut5ActionsIndex: number[] = [];
    public get shortCut5ActionsIndex() {
        return this._shortCut5ActionsIndex;
    }
    public set shortCut5ActionsIndex(nu: number[]) {
        this.write(StorageKey.TEXAS_SHORTCUTS_5, nu);
        this._shortCut5ActionsIndex = nu;
        if (this._shortCutMode === shortCutMode.Button5) this.refreshShortCuts();
    }

    constructor(readonly brandID?: string, private readonly defaultFelt: string = TABLE_FELT_COLORS[0], readonly availableLayouts: readonly TableLayoutId[] = ['original','classic','balanced','oval']) {
        super();
        this.init();
    }

    public getShortCut(index: number): ShortCut {
        return TexasGameDfaultShortCutsList[index]!;
    }

    public getAllShortCuts() {
        return TexasGameDfaultShortCutsList;
    }

    private validIndices(value: number[], fallback: number[]): number[] {
        return Array.isArray(value) && value.length === fallback.length && value.every(v => Number.isInteger(v) && v >= 0 && v < TexasGameDfaultShortCutsList.length) ? value : fallback;
    }
    private init() {
        this.appearance=this.validateAppearance(this.read(StorageKey.TABLE_APPEARANCE,{...defaultAppearance(),feltColor:this.defaultFelt}));
        this.sliderSubmit = this.read<string>(StorageKey.TEXAS_SLIDER_SUBMIT, 'confirm') === 'release' ? 'release' : 'confirm';
        const custom = this.read<unknown>(StorageKey.TEXAS_CUSTOM_POT_RATIOS, {});
        this.customRatios = custom && typeof custom === 'object' && !Array.isArray(custom) ? custom as Record<string, (number | null)[]> : {};
        this._shortCut3ActionsIndex = this.validIndices(this.read(StorageKey.TEXAS_SHORTCUTS_3, defaultShortcuts3), [...defaultShortcuts3]);
        this._shortCut5ActionsIndex = this.validIndices(this.read(StorageKey.TEXAS_SHORTCUTS_5, [2, 3, 4, 6, 7]), [2, 3, 4, 6, 7]);
        // 按保存的配置恢复按钮数量，首次未配置时默认三按钮。
        this.shortCutMode = this.read<number>(StorageKey.TEXAS_SHORTCUTS_MODE, shortCutMode.Button3) === shortCutMode.Button5 ? shortCutMode.Button5 : shortCutMode.Button3;
        this.showBB = this.read<unknown>(StorageKey.SHOW_BB, false) === true;
        //初始化DeskType
        const desk = +this.read(StorageKey.TEXAS_DESKTYPE, 1);
        this.deskType = Number.isInteger(desk) && desk >= 1 && desk <= 14 ? desk : 1;
        //初始化pokerCardType
        this.pokerCardType = this.read<number>(StorageKey.TEXAS_POKERCARDTYPE, 1) === 2 ? 2 : 1;
        //初始化声音
        this.soundOn = this.read<unknown>(StorageKey.SOUND_IS_OPEN, true) !== false;
    }
}

const texasGamePersonalSettings = new TexasGamePersonalSettings();

export default texasGamePersonalSettings;
