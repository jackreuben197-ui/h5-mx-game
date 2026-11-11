// Ported from CC data/room/texas/TexasGamePersonalSettings.ts; engine hooks replaced only.
import { EventSource } from '../binding/EventSource.js';
import { observable } from '../binding/observable.js';
import LocalStorage from './LocalStorage.js';
const StorageKey = { SHOW_BB:'SHOW_BB', TEXAS_DESKTYPE:'TEXAS_DESKTYPE', TEXAS_POKERCARDTYPE:'TEXAS_POKERCARDTYPE', SOUND_IS_OPEN:'SOUND_IS_OPEN', TEXAS_SHORTCUTS_3:'TEXAS_SHORTCUTS_3', TEXAS_SHORTCUTS_5:'TEXAS_SHORTCUTS_5', TEXAS_SHORTCUTS_MODE:'TEXAS_SHORTCUTS_MODE' };
const AssetCollectionType = { SpriteFrameCard0:1, SpriteFrameCard1:2 } as const;
type PokerCardType = 1 | 2;
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

export class TexasGamePersonalSettings extends EventSource {
    public static readonly SHOW_BB = 'SHOW_BB';
    public static readonly DESK_TYPE_CHANGE = 'DESK_TYPE_CHANGE';
    public static readonly POKER_CARD_TYPE_CHANGE = 'POKER_CARD_TYPE_CHANGE';
    public static readonly SOUND_ON_CHANGE = 'SOUND_ON_CHANGE';
    public static readonly SHORTCUT_MODE_CHANGE = 'SHORTCUT_MODE_CHANGE';
    public static readonly SHORTCUTS_CHANGGE = 'SHORTCUTS_CHANGGE';

    public setShowBBToStorage(b: boolean) {
        if (this.showBB == b) return;
        LocalStorage.setItem(StorageKey.SHOW_BB, b);
        this.showBB = b;
    }

    @observable(TexasGamePersonalSettings.SHOW_BB)
    public showBB: boolean = false;

    public setDeskTypeToStorage(b: number) {
        if (this.deskType == b) return;
        LocalStorage.setItem(StorageKey.TEXAS_DESKTYPE, b);
        this.deskType = b;
    }

    @observable(TexasGamePersonalSettings.DESK_TYPE_CHANGE)
    public deskType: number = 0;

    public setPokerCardTypeToStorage(b: PokerCardType) {
        if (this.pokerCardType == b) return;
        LocalStorage.setItem(StorageKey.TEXAS_POKERCARDTYPE, b);
        this.pokerCardType = b;
    }

    @observable(TexasGamePersonalSettings.POKER_CARD_TYPE_CHANGE)
    public pokerCardType: PokerCardType = AssetCollectionType.SpriteFrameCard0;

    public setSoundOnToStorage(b: boolean) {
        if (b == this.soundOn) return;
        LocalStorage.setItem(StorageKey.SOUND_IS_OPEN, b);
        this.soundOn = b;
    }

    @observable(TexasGamePersonalSettings.SOUND_ON_CHANGE)
    public soundOn: boolean = true;
    @observable(TexasGamePersonalSettings.SHORTCUTS_CHANGGE)
    public shortCuts: ShortCut[] = [];
    private _shortCutMode: shortCutMode = shortCutMode.Button3;
    public get shortCutMode() {
        return this._shortCutMode;
    }
    public set shortCutMode(s: shortCutMode) {
        let shortCuts: ShortCut[] = [];
        if (s == shortCutMode.Button3) {
            this.shortCut3ActionsIndex.forEach(v => shortCuts.push(TexasGameDfaultShortCutsList[v]!));
        } else {
            this.shortCut5ActionsIndex.forEach(v => shortCuts.push(TexasGameDfaultShortCutsList[v]!));
        }
        LocalStorage.setItem(StorageKey.TEXAS_SHORTCUTS_MODE, s);
        this._shortCutMode = s;
        this.emit(TexasGamePersonalSettings.SHORTCUT_MODE_CHANGE, s);
        this.shortCuts = shortCuts;
    }
    private _shortCut3ActionsIndex: number[] = [];
    public get shortCut3ActionsIndex() {
        return this._shortCut3ActionsIndex;
    }
    public set shortCut3ActionsIndex(nu: number[]) {
        LocalStorage.setItem(StorageKey.TEXAS_SHORTCUTS_3, nu);
        let shortCuts: ShortCut[] = [];
        this._shortCut3ActionsIndex = nu;
        this._shortCut3ActionsIndex.forEach(v => shortCuts.push(TexasGameDfaultShortCutsList[v]!));
        this.shortCuts = shortCuts;
    }
    private _shortCut5ActionsIndex: number[] = [];
    public get shortCut5ActionsIndex() {
        return this._shortCut5ActionsIndex;
    }
    public set shortCut5ActionsIndex(nu: number[]) {
        LocalStorage.setItem(StorageKey.TEXAS_SHORTCUTS_5, nu);
        let shortCuts: ShortCut[] = [];
        this._shortCut5ActionsIndex = nu;
        this._shortCut5ActionsIndex.forEach(v => shortCuts.push(TexasGameDfaultShortCutsList[v]!));
        this.shortCuts = shortCuts;
    }

    constructor() {
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
        this._shortCut3ActionsIndex = this.validIndices(LocalStorage.getItem(StorageKey.TEXAS_SHORTCUTS_3, [3, 6, 7]), [3, 6, 7]);
        this._shortCut5ActionsIndex = this.validIndices(LocalStorage.getItem(StorageKey.TEXAS_SHORTCUTS_5, [2, 3, 4, 6, 7]), [2, 3, 4, 6, 7]);
        this.shortCutMode = LocalStorage.getItem<number>(StorageKey.TEXAS_SHORTCUTS_MODE, shortCutMode.Button3) === 2 ? shortCutMode.Button5 : shortCutMode.Button3;
        this.showBB = LocalStorage.getItem(StorageKey.SHOW_BB, false);
        //初始化DeskType
        const desk = +LocalStorage.getItem(StorageKey.TEXAS_DESKTYPE, 1);
        this.deskType = Number.isInteger(desk) && desk >= 1 && desk <= 14 ? desk : 1;
        //初始化pokerCardType
        this.pokerCardType = LocalStorage.getItem<number>(StorageKey.TEXAS_POKERCARDTYPE, 1) === 2 ? 2 : 1;
        //初始化声音
        this.soundOn = LocalStorage.getItem(StorageKey.SOUND_IS_OPEN, true);
    }
}

const texasGamePersonalSettings = new TexasGamePersonalSettings();

export default texasGamePersonalSettings;
