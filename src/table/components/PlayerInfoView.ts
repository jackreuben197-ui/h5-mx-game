import { mediaImage } from './TableMediaView.js';
import type { Player } from '../../core/types.js';
import type { PlayerProfile } from '../../core/PlayerProfile.js';
import type { RoomRecords } from '../../core/RoomRecords.js';
import type { RoomEmojis } from '../../core/RoomEmojis.js';
import { GameplayChatPropType } from '../../logic/GameplayChatPropType.js';
import { EmojiPropRules } from '../../logic/EmojiPropRules.js';
import { i18nMgr } from '../../i18n/i18nMgr.js';
import { StringHelper } from '../../logic/StringHelper.js';
import { SpriteAtlas } from '../SpriteAtlas.js';
import { element } from '../dom.js';
import { RecordDialogView } from './RecordDialogView.js';
import type { TableConfirmDialog } from './TableConfirmDialog.js';

const t = (key: string, fallback: string) => i18nMgr.Get(key, [], fallback);
const props = [
  ['kiss_Button',602,'亲吻','💋'],['money_Button',609,'撒钱','💸'],['boxing_Button',608,'拳击','🥊'],
  ['touch_Button',605,'摸头','👋'],['tomato_Button',600,'番茄','🍅'],['fish_Button',610,'鱼头','🐟'],
  ['baseball_Button',611,'棒球','⚾'],['good_Button',603,'点赞','👍'],['cheers_Button',604,'干杯','🍻'],
  ['chicken_Button',607,'抓鸡','🐔'],['flower_Button',601,'花环','🌺'],['shark_Button',606,'鲨鱼','🦈'],
] as const;

/** Seat avatar -> CC PlayerInfo's read-only header, Data and All-in pages. */
export class PlayerInfoView {
  readonly dialog = new RecordDialogView(() => t('MX_PlayerStats', '玩家资料'), () => this.close());
  readonly root = this.dialog.root;
  private player?: Player;
  private profile?: PlayerProfile | null;
  private tab: 'data' | 'allin' | 'gift' = 'data';
  private generation = 0;
  private muted = false;
  private balance?: number;
  private busy = false;
  get currentSeat(): number { return this.root.hidden ? 0 : this.player?.seat ?? 0; }
  get currentUserRID(): number | undefined { return this.player?.userRid; }

  constructor(private records?: RoomRecords, private emojis?: RoomEmojis, private onRemark?: (userRID: number, remark: string, nickname: string) => void, private confirmDialog?: TableConfirmDialog) {
    this.root.classList.add('mx-player-profile-overlay');
    this.dialog.panel.setAttribute('aria-label', t('MX_PlayerStats', '玩家资料'));
    i18nMgr.register(this);
  }

  async open(player: Player): Promise<void> {
    const generation = ++this.generation;
    this.busy = false;
    this.player = player;
    this.profile = this.records?.peekPlayerProfile?.(player.userRid ?? 0);
    this.tab = 'data';
    this.muted = false; this.balance = undefined;
    this.dialog.show(true);
    this.render();
    if (!this.records || !Number.isSafeInteger(player.userRid) || (player.userRid ?? 0) <= 0) return;
    if (this.profile === undefined) this.dialog.status.textContent = t('MX_Loading', '加载中…');
    try {
      const profile = await this.records.playerProfile(player.userRid!);
      if (generation !== this.generation) return;
      this.profile = profile;
      if (profile?.basic?.remark_name !== undefined) this.onRemark?.(player.userRid!, profile.basic.remark_name, profile.basic.nick_name || player.name);
      this.dialog.status.textContent = profile ? '' : t('MX_NoData', '暂无数据');
      this.render();
      if (this.canGift()) void this.records.diamondBalance().then(value => {if (generation === this.generation) {this.balance = value; this.render();}}).catch(() => undefined);
      if (this.canManage()) void this.records.playerMuted(player.userRid!).then(value => {if (generation === this.generation) {this.muted = value; this.render();}}).catch(() => undefined);
      if (this.canUseProps()) void this.emojis?.refresh().then(() => {if (generation === this.generation) this.render();}).catch(() => undefined);
    } catch (error) {
      if (generation === this.generation)
        this.dialog.status.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  private isOther(): boolean { return !!this.records && !!this.player?.userRid && this.player.userRid !== this.records.userRID; }
  private seated(): boolean { return !!this.records?.data.snapshot?.playersList.some(p => p.userRid === this.records?.userRID && p.seatId > 0); }
  private canUseProps(): boolean { return this.isOther() && this.seated() && !!this.emojis?.seatForUser(this.player!.userRid!); }
  private canGift(): boolean { return this.isOther() && this.seated() && !this.records!.config.global.isChannelDiamondFreeMode; }
  private canManage(): boolean { return this.isOther() && !!this.records?.data.record?.roomAdmin?.isAdmin; }
  private async run(action: () => Promise<void>, done?: () => void): Promise<void> {
    if (this.busy) return;
    const generation = this.generation;
    this.busy = true; this.dialog.status.textContent = '';
    const giftButtons=this.dialog.panel.querySelectorAll<HTMLButtonElement>('.mx-player-profile-gift-grid button');
    giftButtons.forEach(button=>button.disabled=true);
    try { await action(); if(generation === this.generation) done?.(); }
    catch (error) { if(generation === this.generation) this.dialog.status.textContent = error instanceof Error ? error.message : String(error); }
    finally { if(generation === this.generation) this.busy = false; giftButtons.forEach(button=>button.disabled=false); }
  }
  private confirm(message: () => string, action: () => void): void {
    this.confirmDialog?.open({
      owner: 'player-admin', message,
      cancel: () => t('MX_Cancel','取消'),
      commit: () => t('MX_Confirm','确定'),
      onCancel: () => {}, onCommit: action,
    });
  }

  private render(): void {
    const player = this.player;
    if (!player || this.root.hidden) return;
    const basic = this.profile?.basic;
    const avatar = basic?.avatar || player.avatar;
    const header = this.dialog.header;
    header.querySelector('.mx-player-profile-header')?.remove();
    const identity = element('div', 'mx-player-profile-header');
    const avatarFrame = element('div', 'mx-player-profile-avatar-frame');
    const fallback = element('div', 'mx-player-profile-avatar-fallback');
    SpriteAtlas.paint(fallback, player.seat % 2 ? 'avatar' : 'avatarAlt');
    const photo = element('img', 'mx-player-profile-avatar');
    photo.alt = '';
    photo.onerror = () => { photo.hidden = true; };
    if (avatar) photo.src = avatar;
    else photo.hidden = true;
    const details = element('div', 'mx-player-profile-details');
    const name = element('div', 'mx-player-profile-name', StringHelper.LengthNick(basic?.nick_name || player.name, 16));
    const sex = basic?.sex ?? player.sex;
    if (sex === 1 || sex === 2) {
      const symbol = element('span', 'mx-player-profile-sex', sex === 1 ? '♀' : '♂');
      symbol.setAttribute('aria-label', sex === 1 ? t('MX_Female', '女') : t('MX_Male', '男'));
      name.append(symbol);
    }
    const id = element('div', 'mx-player-profile-id');
    id.append(element('span', 'mx-player-profile-id-label', 'ID'), element('span', '', String(basic?.random_num || player.userRid || '—')));
    details.append(name, id);
    if (this.isOther()) {
      const remark = element('button', 'mx-player-profile-remark', `${t('UIUserRemarks_7S612w03','备注')}: ${basic?.remark_name || t('MX_AddRemark','添加备注名')} ✎`);
      remark.type = 'button';
      remark.onclick = () => {
        const input = element('input', 'mx-player-profile-remark-input') as HTMLInputElement;
        input.value = basic?.remark_name || ''; input.maxLength = 40; input.setAttribute('aria-label', t('UIUserRemarks_7S612w03','备注'));
        remark.replaceWith(input); input.focus(); input.select();
        const save = () => {
          const value = input.value.trim();
          if (value === (basic?.remark_name || '')) {input.replaceWith(remark); return;}
          void this.run(() => this.records!.savePlayerRemark(player.userRid!, value), () => {
            if (this.profile?.basic) this.profile.basic.remark_name = value;
            this.onRemark?.(player.userRid!, value, this.profile?.basic?.nick_name || player.name);
            this.render();
          });
        };
        input.onkeydown = event => {if (event.key === 'Enter') save(); if (event.key === 'Escape') input.replaceWith(remark);};
        input.onblur = save;
      };
      details.append(remark);
    }
    avatarFrame.append(fallback, photo);
    identity.append(avatarFrame, details);
    header.append(identity);

    const tabs = this.dialog.footer;
    tabs.replaceChildren();
    const tabItems: Array<['data' | 'allin' | 'gift', string]> = [['data', t('MX_PlayerData', '数据')], ['allin', t('MX_PlayerAllIn', 'All-in')]];
    if (this.canGift()) tabItems.push(['gift', t('MX_GiftDiamonds','赠送钻石')]);
    for (const [key, label] of tabItems) {
      const button = element('button', '', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(this.tab === key));
      button.onclick = () => { this.tab = key; this.renderBody(); this.renderTabs(); };
      tabs.append(button);
    }
    this.renderBody();
    this.renderActions();
  }

  private renderTabs(): void {
    [...this.dialog.footer.querySelectorAll('button')].forEach(button => button.setAttribute('aria-pressed', String(button.textContent === (this.tab === 'data' ? t('MX_PlayerData','数据') : this.tab === 'allin' ? t('MX_PlayerAllIn','All-in') : t('MX_GiftDiamonds','赠送钻石')))));
  }

  private renderBody(): void {
    const body = this.dialog.body;
    body.replaceChildren();
    const stats = this.profile?.stats;
    if (this.tab === 'gift') {
      if (!this.canGift()) {this.tab = 'data'; this.renderBody(); return;}
      const gift = element('div','mx-player-profile-gift');
      const choices = element('div','mx-player-profile-gift-grid');
      for (const amount of [10,50,100,200,500,1000]) {
        const button = element('button','mx-player-profile-gift-choice'); button.type = 'button';
        const icon=element('span','mx-player-profile-gift-icon');SpriteAtlas.paint(icon,'giftDiamond');
        button.append(icon,element('span','mx-player-profile-gift-amount',String(amount)));
        button.onclick = () => void this.run(() => this.records!.giftDiamonds(this.player!.userRid!,amount), () => this.close());
        choices.append(button);
      }
      const balance=element('div','mx-player-profile-balance');
      const balanceIcon=element('span','mx-player-profile-balance-icon');SpriteAtlas.paint(balanceIcon,'recordDiamond');
      balance.append(balanceIcon,element('span','',`${t('MX_DiamondBalance','钻石余额')}: ${this.balance === undefined ? '—' : this.balance.toLocaleString('en-US')}`));
      gift.append(choices,balance); body.append(gift); return;
    }
    if (this.tab === 'data') {
      const room = stats?.room_data;
      const values: Array<[string, string]> = [
        [t('UITexasInfo_games', '总局数'), room ? String(room.total_game_cnt || 0) : '—'],
        [t('UITexasInfo_poolrate', '入池率'), room ? `${room.vpip || 0}%` : '—'],
        [t('UITexasInfo_flop', '翻牌前加注率'), room ? `${room.prf || 0}%` : '—'],
        [t('UITexasInfo_allhands', '总手数'), room ? String(room.total_hand || 0) : '—'],
        [t('UITexasInfo_poolwin', '入池胜率'), room ? `${room.wins || 0}%` : '—'],
        [t('UIPlayerInfo_TablePoolRate', '本桌入池率'), stats ? `${((Number(stats.pool_rate || 0) / 1000) * 100).toFixed(0)}%` : '—'],
      ];
      const grid = element('div', 'mx-player-profile-grid');
      for (const [label, value] of values) {
        const item = element('div', 'mx-player-profile-stat');
        item.append(element('span', '', label), element('strong', '', value));
        grid.append(item);
      }
      body.append(grid,element('p','mx-player-profile-period',()=>t('MX_PlayerStatsPeriod','仅展示近60天数据')));
      return;
    }
    const allin = stats?.allin_data;
    const values: Array<[string, number | undefined, number | undefined]> = [
      [t('LabelPositive', 'Positive'), allin?.active_count, allin?.active_profit_count],
      [t('LabelPassive', 'Passive'), allin?.passive_count, allin?.passive_profit_count],
      [t('LabelBehind', 'Behind'), allin?.behind_count, allin?.behind_profit_count],
      [t('LabelLeading', 'Leading'), allin?.ahead_count, allin?.ahead_profit_count],
    ];
    const chart = element('div', 'mx-player-profile-chart');
    const rates: number[] = [];
    for (const [label, count, profit] of values) {
      const rate = count && count > 0 ? (profit || 0) / count : 0;
      rates.push(rate);
      const pct = allin ? `${Math.trunc(rate * 100)}%` : '—';
      const item = element('div', `mx-player-profile-chart-label mx-player-profile-chart-label-${rates.length}`);
      item.append(element('span', '', label), element('strong', '', pct));
      chart.append(item);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('mx-player-profile-radar');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('MX_PlayerAllIn', 'All-in'));
    const polygon = (points: string, className: string) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      node.setAttribute('points', points);
      node.setAttribute('class', className);
      svg.append(node);
    };
    for (const radius of [20, 40, 60, 80]) polygon(`100,${100-radius} ${100+radius},100 100,${100+radius} ${100-radius},100`, 'mx-player-profile-radar-grid');
    polygon('100,20 180,100 100,180 20,100', 'mx-player-profile-radar-axis');
    // CC uses active, behind, ahead, passive around the four compass points.
    const [active = 0, passive = 0, behind = 0, ahead = 0] = rates.map(rate => Math.max(0, Math.min(1, rate)));
    polygon(`100,${100-80*active} ${100+80*behind},100 100,${100+80*ahead} ${100-80*passive},100`, 'mx-player-profile-radar-value');
    chart.prepend(svg);
    body.append(chart);
  }

  private renderActions(): void {
    this.dialog.panel.querySelector('.mx-player-profile-actions')?.remove();
    if (!this.player || !this.isOther()) return;
    const actions = element('div','mx-player-profile-actions');
    if (this.canUseProps()) {
      const list = element('div','mx-player-profile-props');
      for (const [index,[code,type,label]] of props.entries()) {
        const prop = this.emojis?.data.propList.find(item => item.propType === GameplayChatPropType.THROW_PROP && item.propCode === code);
        if (!prop) continue;
        const price = Number(prop.payPrice) || 0;
        const cost = EmojiPropRules.isPropFree(prop) || price <= 0 ? '' : this.records?.config.global.isChannelDiamondFreeMode ? StringHelper.GetLongString(price) : String(price);
        const button = element('button','mx-player-profile-prop'); button.type = 'button'; button.setAttribute('aria-label',`${label}${cost}`);
        const icon = element('span','mx-player-profile-prop-icon');
        // The CC prefab places sprites 4 and 2 in the money/touch button slots.
        const spriteNumber = index === 1 ? 4 : index === 3 ? 2 : index + 1;
        SpriteAtlas.paint(icon, `playerProp${spriteNumber}` as Parameters<typeof SpriteAtlas.paint>[1]);
        button.append(icon);
        if (cost) {
          const badge = element('span','mx-player-profile-prop-cost');
          const currency = element('span','mx-player-profile-prop-currency');
          SpriteAtlas.paint(currency, this.records?.config.global.isChannelDiamondFreeMode ? 'emojiUc' : 'emojiDiamond');
          badge.append(currency, document.createTextNode(cost)); button.append(badge);
        }
        button.onclick = () => void this.run(() => this.emojis!.throwProp(this.player!.userRid!,prop,type));
        list.append(button);
      }
      if (list.childElementCount) actions.append(list);
    }
    if (this.canManage()) {
      const controls = element('div','mx-player-profile-controls');
      const add = (label: string, click: () => void) => {const button = element('button','',label); button.type='button'; button.onclick=click; controls.append(button);};
      const admin = this.records!.data.record!.roomAdmin!;
      if (admin.userStandUp === 1) add(t('MX_AdminStand','站起玩家'), () => this.confirm(() => t('UITexasRoomManagerOpTips7','确认让该玩家站起？'), () => void this.run(() => this.records!.managePlayer(this.player!.userRid!,'stand'), () => this.close())));
      if (admin.userLeave === 1) add(t('MX_AdminLeave','踢出玩家'), () => this.confirm(() => t('UITexasRoomManagerOpTips8','确认踢出该玩家？'), () => void this.run(() => this.records!.managePlayer(this.player!.userRid!,'leave'), () => this.close())));
      add(this.muted ? t('MX_Unmute','取消禁言') : t('MX_Mute','禁言'), () => void this.run(() => this.records!.setPlayerMuted(this.player!.userRid!,!this.muted), () => {this.muted = !this.muted; this.renderActions();}));
      actions.append(controls);
    }
    const media=this.records?.media;
    if(media?.config.isInVideoRoom&&this.isOther()&&this.player.userRid){
      const uid=this.player.userRid;
      const row=element('div','mx-player-profile-controls mx-player-media');
      for(const kind of (media.setting.enableCamera?['audio','video']:['audio']) as Array<'audio'|'video'>){
        const state=media.remoteState(kind,uid);
        const button=element('button','',()=>i18nMgr.Get(`MX_${state.blocked?'Open':'Close'}${kind==='video'?'Video':'Audio'}`));
        button.style.backgroundImage=`url("${mediaImage('btnbg')}")`;
        const icon=element('img','');icon.src=mediaImage(kind==='video'?'videoicon':'sndicon');icon.alt='';button.prepend(icon);
        button.disabled=!state.available;
        button.onclick=()=>void this.run(()=>media.toggleRemote(kind,uid),()=>this.render());row.append(button);
      }
      actions.append(row);
    }
    if (actions.childElementCount) this.dialog.panel.append(actions);
  }

  refreshLanguage(): void { this.dialog.refreshTitle(); this.render(); }
  onFrameResize(width: number, height: number): void {
    // The admin controls and two rows of props share this frame with the stats.
    // Fit the complete CC-style dialog, rather than clipping its last row.
    const scale = Math.min(width / 340, height / 680, 1);
    this.root.style.setProperty('--player-profile-unit', `${scale}px`);
  }
  close(): void { ++this.generation; this.dialog.show(false); this.player = undefined; this.profile = undefined; this.confirmDialog?.close('player-admin'); this.dialog.panel.querySelector('.mx-player-profile-actions')?.remove(); this.dialog.status.textContent = ''; }
  destroy(): void { this.close(); this.dialog.destroy(); }
}
