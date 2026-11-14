import { StringHelper } from './StringHelper.js';
import type { TableSettingBasic } from './GameplayTableSettingBasic.js';
import type { RoomJackpotConfig } from '@silenthill/agreement-web';
export interface TableSettingRow { id:string; title:string; value:string; color:string; enabled?:boolean; tips?:string; detail?:string; }
/** CC UIGameplayTableSetting.RefreshUI, with prefab setters replaced by row descriptions. */
export class GameplayTableSetting {
  private rows: TableSettingRow[]=[];
  private _roomData: {basicInfo:TableSettingBasic};
  constructor(basicInfo:TableSettingBasic, private roomPermissions:Record<string,number>, private L:(key:string)=>string) {this._roomData={basicInfo};}
  private IsPermitted(key:string):boolean {return Number(this.roomPermissions[key])===1;}
  private FillData(id:string,title:string,value:string,color:string,tips=''):void {this.rows.push({id,title,value,color,tips});}
  private FillDataByOpen(title:string,open:boolean,tipsKey=''):void {
    this.rows.push({id:title,title:this.L(title),value:this.L(open?'6digit_password_opened':'UIMine_AccountNotOpen'),color:open?'#7ED27E':'#FF6666',enabled:open,tips:tipsKey?this.L(tipsKey):''});
  }
  private FillDataByLanguageOpen(title:string,open:boolean,tipsKey=''):void {this.FillDataByOpen(title,open,tipsKey);}
  private FillTipsAndDetailData(id:string,title:string,value:string,color:string,tips:string,detail:string):void {
    this.rows.push({id,title,value,color,tips,detail:detail.replace(/<[^>]*>/g,'')});
  }
  private FillJackpotData(state:string,color:string,cfg?:RoomJackpotConfig.AsObject):void {
    this.FillData('room_jackpot','Jackpot',state,color);
    if(color!=='#7ED27E'||!cfg)return;
    const add=(key:string,values:(number|string)[]=[],tip='')=>this.FillData(key,StringHelper.Format(this.L(key),values),'','#FFFFFF',tip?this.L(tip):'');
    if(cfg.contributePotSwitch===1)add('UITexasTableSetting_JackpotMin',[cfg.contributePotLimit],'UICreateClubJackpotTemplate_JackpotMinWhy');
    if(cfg.awardBetSwitch===1)add('UITexasTableSetting_JackpotPut',[cfg.awardBetLimit],'UICreateClubJackpotTemplate_JackpotPutWhy');
    if(cfg.awardOtherSwitch===1)add('UICreateClubJackpotTemplate_AllTableTriggerTip',[],'UICreateClubJackpotTemplate_AllTableWhy');
    if(cfg.contributeType===2)add('UITexasTableSetting_TrProfit',[cfg.contributeRatio/10]);
    else if(cfg.contributeType===3)add('UITexasTableSetting_Jackpot_PotGold',[cfg.contributePotRatio/10]);
    else add('UITexasTableSetting_ProfitTr',[cfg.contributeFixedLimit,cfg.contributeFixedRate]);
    if(cfg.awardRoundType===1)add('UICreateClubJackpotTemplate_jackpot_PlayCards',[],'UICreateClubJackpotTemplate_jackpot_PlayCards_why');
    if(cfg.awardRoundType===2)add('UICreateClubJackpotTemplate_jackpot_Flop',[],'UICreateClubJackpotTemplate_jackpot_Flop_why');
  }
    getRows(): TableSettingRow[] {
        this.rows=[];

        const callTime = this._roomData.basicInfo.hasCallTime;
        const roomName = this._roomData.basicInfo.roomName || '-';
        this.FillData('room_name', this.L('UIClub_RoomCreat_0HvQkjkd'), roomName, '#FFFFFF');
        this.FillData('game_type', this.L('UIData_game'), this.GetTableTypeName(), '#FFFFFF');
        const smallBlind = this._roomData.basicInfo.sbante.sb;
        const bigBlind = smallBlind * 2;
        const sixPlusAndBombpot =
            (this._roomData.basicInfo.gameType === 0 && this._roomData.basicInfo.pokerType === 2) ||
            this._roomData.basicInfo.hasBombPot;
        if (!sixPlusAndBombpot) {
            this.FillData(
                'blind',
                this.L('UITexas_smallBigBlind'),
                `${StringHelper.GetLongString(smallBlind)}/${StringHelper.GetLongString(bigBlind)}`,
                '#FFFFFF'
            );
        } else {
            this.FillData('blind', this.L('UIMatchFilter_ALmevl'), StringHelper.GetLongString(smallBlind * 2), '#FFFFFF');
        }
        const currentMinRate = this._roomData.basicInfo.curMinRate || 0;
        const currentMaxRate = this._roomData.basicInfo.curMaxRate || this._roomData.basicInfo.curMinRate;
        const bringMin = currentMinRate * bigBlind;
        const bringMax = Math.max(currentMaxRate, currentMinRate) * bigBlind;
        this.FillData(
            'bring_value',
            this.L('UITableSetting_bringValue'),
            `${StringHelper.GetLongString(bringMin)}-${StringHelper.GetLongString(bringMax)}`,
            '#FFFFFF'
        );
        if (this.IsPermitted('room_jackpot')) {
            const jackpotOpen = this._roomData.basicInfo.jackpot;
            this.FillJackpotData(
                jackpotOpen ? this.L('6digit_password_opened') : this.L('UIMine_AccountNotOpen'),
                jackpotOpen ? '#7ED27E' : '#FF6666',
                this._roomData.basicInfo.jackpotConfig
            );
        }
        if (this.IsPermitted('room_bringin_equal')) {
            const value = Number(this._roomData.basicInfo.bringinEqualLeaderPercent || 0);
            this.FillData(
                'room_bringin_equal',
                this.L('UICreateTable_chipinLeader'),
                value === 0 ? this.L('UIClub_CreateRoom23') : `${value}%`,
                '#FFFFFF',
                this.L('UICreateTable_chipinLeaderTips')
            );
        }
        if (this.IsPermitted('room_min_chip')) {
            const value = Number(this._roomData.basicInfo.minPlayerChipRate || 0);
            this.FillData(
                'room_min_chip',
                this.L('UICreateTable_chipinMinChip'),
                value === 0 ? this.L('UIClub_CreateRoom23') : StringHelper.GetLongString(value),
                '#FFFFFF',
                this.L('UICreateTable_chipinMinChipTips')
            );
        }
        if (this.IsPermitted('room_bringin_limit')) {
            const value = Number(this._roomData.basicInfo.maxBringinTotalRate || 0);
            this.FillData(
                'room_bringin_limit',
                this.L('UICreateTable_chipinMaxChip'),
                value === 0 ? this.L('UIClub_CreateRoom23') : StringHelper.GetLongString(value),
                '#FFFFFF',
                this.L('UICreateTable_chipinMaxChipTips')
            );
        }
        const criticalHitEnabled = this._roomData.basicInfo.hasCriticalHit;
        if (this.IsPermitted('room_critical_hit')) {
            if (criticalHitEnabled) {
                const criticalHitRound = this._roomData.basicInfo.criticalHitRounds;
                const subAnteBB = this._roomData.basicInfo.criticalHitAnte / bigBlind;
                this.FillTipsAndDetailData(
                    'room_critical_hit',
                    this.L('UIHitGamePlayTips1'),
                    this.L('6digit_password_opened'),
                    '#7ED27E',
                    this.L('UIHitGamePlayTips6'),
                    StringHelper.Format(this.L('UIHitGamePlayTips2'), [criticalHitRound, subAnteBB])
                );
            } else {
                this.FillData('room_critical_hit', this.L('UIHitGamePlayTips1'), this.L('UIMine_AccountNotOpen'), '#FF6666', this.L('UIHitGamePlayTips6'));
            }
        }
        if (this.IsPermitted('room_random_ante')) {
            // MTT/旧协议可能不下发 randomAnte；只有完整的三段配置才按开启展示。
            const randomAnte = this._roomData.basicInfo.randomAnte || [];
            const randomAnteEnabled = randomAnte.length >= 3;
            if (randomAnteEnabled) {
                const detail = this.BuildRandomAnteDetail(randomAnte);
                this.FillTipsAndDetailData(
                    'room_random_ante',
                    this.L('UIAnteRandomJump1'),
                    this.L('6digit_password_opened'),
                    '#7ED27E',
                    this.L('UIAnteRandomJump6'),
                    detail
                );
            } else {
                this.FillData('room_random_ante', this.L('UIAnteRandomJump1'), this.L('UIMine_AccountNotOpen'), '#FF6666', this.L('UIAnteRandomJump6'));
            }
        }
        if (this.IsPermitted('auto_change_room')) {
            const autoChangeTable = this._roomData.basicInfo.autoChangeTableLimitHand;
            const isAutoChangeTable = this._roomData.basicInfo.isAutoChangeTable;
            if (isAutoChangeTable) {
                const num = `<color=#FFC706>${autoChangeTable}</color>`;
                this.FillTipsAndDetailData(
                    'auto_change_room',
                    this.L('UIAutoChangeTable4'),
                    this.L('6digit_password_opened'),
                    '#7ED27E',
                    this.L('UIAutoChangeTable2'),
                    StringHelper.Format(this.L('UIAutoChangeTable3'), [num])
                );
            } else {
                this.FillData('auto_change_room', this.L('UIAutoChangeTable4'), this.L('UIMine_AccountNotOpen'), '#FF6666', this.L('UIAutoChangeTable2'));
            }
        }
        this.FillDataByOpen('AOF', false);
        if (this.IsPermitted('room_encrypt_cards')) {
            const blockchain = this._roomData.basicInfo.encryptCards;
            this.FillData(
                'room_encrypt_cards',
                this.L('UIBlockchain'),
                this.L(blockchain ? '6digit_password_opened' : 'UIMine_AccountNotOpen'),
                blockchain ? '#7ED27E' : '#FF6666'
            );
        }
        const squidEnabled = !!this._roomData.basicInfo.squidStatusEnabled;
        this.FillDataByLanguageOpen('UISquid', squidEnabled);
        if (squidEnabled) {
            this.FillData('squid_open_number', this.L('UICreateTableSquidOpenNumTip'), String(this._roomData.basicInfo.squidPlayerCountLimit || 0), '#FFFFFF');
            this.FillData('squid_round', this.L('UISquidGameRounds'), String(this._roomData.basicInfo.squidStatusRounds || 0), '#FFFFFF');
            this.FillData('squid_base', this.L('UIGameTableSquidShow'), StringHelper.GetLongString(Number(this._roomData.basicInfo.squidBase || 0)), '#FFFFFF');
            this.FillData('squid_max_count', this.L('UISquidGetCap'), String(this._roomData.basicInfo.squidMax || 0), '#FFFFFF');
            if (Number(this._roomData.basicInfo.squidMostGet || 0) === 1) {
                this.FillDataByLanguageOpen('UISquidAll', true);
            }
            if (Number(this._roomData.basicInfo.squidBetGet || 0) === 1) {
                this.FillDataByLanguageOpen('UISquidNothing', true);
            }
            if (Number(this._roomData.basicInfo.squidHead || 0) === 1) {
                this.FillDataByLanguageOpen('UISquidHeadDouble', true);
            }
            if (Number(this._roomData.basicInfo.squidTail || 0) === 1) {
                this.FillDataByLanguageOpen('UISquidTailDouble', true);
            }
        }
        const mushroomEnabled = !!this._roomData.basicInfo.hasMushroom;
        this.FillDataByLanguageOpen('UITableSetting_mushRoom', mushroomEnabled);
        if (mushroomEnabled) {
            const mushroomBase = Number(this._roomData.basicInfo.mushroomBase || 0);
            const mushroomMode = Number(this._roomData.basicInfo.mushroomMode || 0);
            this.FillData('mush_mode', this.L('UIMushMoneyMode'), StringHelper.GetLongString(mushroomBase * mushroomMode), '#FFFFFF');
            this.FillData('mush_rule', this.L('UIMushMoneyRule'), StringHelper.GetLongString(mushroomBase), '#FFFFFF');
        }
        const isLimitIP = this._roomData.basicInfo.limitIP;
        const isLimitGPS = this._roomData.basicInfo.limitGPS;
        const isAntiCheatOpen = this._roomData.basicInfo.antiCheatType > 1;
        const isSafeRoom = this._roomData.basicInfo.seatedMessage;
        this.FillDataByLanguageOpen('UIClub_RoomCreat_noh7zoAE', isLimitIP);
        this.FillDataByLanguageOpen('UIClub_RoomCreat_OMKEvaor', isLimitGPS);
        this.FillDataByOpen('Safe', isSafeRoom);
        if (this.IsPermitted('room_force_show_card')) {
            const forceShowCard = Number(this._roomData.basicInfo.forceShowCard || 0) === 1;
            this.FillDataByLanguageOpen('UICreateTable_FouceShowCard', forceShowCard, 'UICreateTable_FouceShowCardTips');
        }
        if (this.IsPermitted('room_random_seat')) {
            const randomSeat = this._roomData.basicInfo.randomSeated;
            this.FillDataByLanguageOpen('UICreateTable_randSeat', randomSeat, 'UICreateTable_randSeatTips');
        }
        this.FillDataByLanguageOpen('adaptation20088', !!this._roomData.basicInfo.delaySeeCard);
        if (this.IsPermitted('room_only_ios')) {
            const onlyIOS = this._roomData.basicInfo.onlyIOS;
            this.FillDataByLanguageOpen('UICreateTable_iosTitle', onlyIOS, 'UICreateTable_iosTitleTips');
        }
        if (this.IsPermitted('room_check_pool_rate')) {
            const poolRate = Number(this._roomData.basicInfo.hcPoolRate || 0);
            const title = this.TrimTailColon(this.L('UIClub_CreateRoom20'));
            this.FillData(
                'room_check_pool_rate',
                title,
                poolRate === 0 ? this.L('UIClub_CreateRoom23') : `${poolRate}%`,
                '#FFFFFF',
                this.L('UICreateTable_poolRules')
            );
        }
        if (callTime) {
            this.FillData('call_time', 'CallTime', this.L('6digit_password_opened'), '#7ED27E', this.L('UICreateRoomCallTimeTip'));
        }
        const antiCheatOpen = Number(this._roomData.basicInfo.antiCheatType || 0) > 1;
        this.FillDataByLanguageOpen('UISecuritySetting_limitVideo', antiCheatOpen);
        const insuranceMode = Number(this._roomData.basicInfo.insuranceMode || 0);
        const insuranceOpen = !!this._roomData.basicInfo.hasInsurance;
        this.FillData(
            'insurance',
            this.L('UIMatchFilter_CfZdLJ'),
            insuranceOpen ? this.GetInsuranceModeText(insuranceMode) : this.L('UIMine_AccountNotOpen'),
            insuranceOpen ? '#7ED27E' : '#FF6666'
        );
        const secondPcsOn = !!this._roomData.basicInfo.secondPcsOn;
        this.FillDataByLanguageOpen('UIGuildcreateroomtoggledoublecard', secondPcsOn);
        if (this.IsPermitted('room_look_hand_card')) {
            const lookHandCard = this._roomData.basicInfo.viewPlayerCards;
            this.FillData(
                'room_look_hand_card',
                this.L('UICreateTable_PayShowCard'),
                lookHandCard === 0
                    ? this.L('UICreateTable_PayShowCardClose')
                    : lookHandCard === 1
                      ? this.L('UICreateTable_PayShowCardAll')
                      : this.L('UICreateTable_PayShowCardSingle'),
                lookHandCard === 0 ? '#FF6666' : '#7ED27E',
                this.L('UICreateTable_PayShowCardTips')
            );
        }
        const chatType = Number(this._roomData.basicInfo.chatType ?? 1);
        this.FillData('chat_type', this.L('UITableSetting_chat'), chatType === 0 ? this.L('UIClub_CreateRoom7') : this.L('UIOpen'), '#7ED27E');
        const straddle = Number(this._roomData.basicInfo.straddle || 0);
        const straddleMax = Number(this._roomData.basicInfo.straddleMax || 1);
        this.FillData('straddle', 'Straddle', straddle === 1 ? String(straddleMax) : this.L('UIClub_CreateRoom7'), '#7ED27E');
        for(const row of this.rows) {
            if(row.enabled===undefined && (row.value===this.L('6digit_password_opened') || row.value===this.L('UIMine_AccountNotOpen')))
                row.enabled=row.color==='#7ED27E';
        }
        const insurance=this.rows.find(row=>row.id==='insurance');if(insurance)insurance.enabled=insuranceOpen;
        const chat=this.rows.find(row=>row.id==='chat_type');if(chat)chat.enabled=chatType!==0;
        const straddleRow=this.rows.find(row=>row.id==='straddle');if(straddleRow)straddleRow.enabled=straddle===1;
        return this.rows;
    }

    private GetTableTypeName(): string {
        if (this._roomData.basicInfo.gameType === 0 && this._roomData.basicInfo.pokerType === 0) {
            return this.L('adaptation10022');
        }
        if (
            this._roomData.basicInfo.gameType >= 1 &&
            this._roomData.basicInfo.gameType <= 3 &&
            this._roomData.basicInfo.pokerType === 0
        ) {
            return this.L('UIFriendsTable_Create_PLO');
        }
        if (this._roomData.basicInfo.gameType === 0 && this._roomData.basicInfo.pokerType === 2) {
            return this.L('UIGame_Type6p');
        }
        return this.L('UITexasTotalResult');
    }

    /** 构建随机前注详情文本 */
    private BuildRandomAnteDetail(values: number[]): string {
        if (!values || values.length < 3) return this.L('UIAnteRandomJump7');
        const min = (values[0]! / 100).toFixed(1);
        const max = (values[1]! / 100).toFixed(1);
        const interval = (values[2]! / 100).toFixed(1);
        return StringHelper.Format(this.L('UIAnteRandomJump7'), [min, max, interval]);
    }
    private GetInsuranceModeText(mode: number): string {
        switch (mode) {
            case 0:
                return this.L('UICreateClassicInsurances');
            case 1:
                return this.L('UICreateTable_LowWaterIns');
            case 2:
                return this.L('UIEVInsurance');
            case 3:
                return this.L('UICreateClassicInsurancesNew');
            default:
                return this.L('UICreateClassicInsurances');
        }
    }

    /** 去掉标题尾部冒号 */
    private TrimTailColon(text: string): string {
        if (!text) return '';
        if (text.endsWith('：') || text.endsWith(':')) {
            return text.slice(0, text.length - 1);
        }
        return text;
    }

}
