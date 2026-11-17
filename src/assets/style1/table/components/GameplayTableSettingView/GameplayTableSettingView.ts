import { componentBox } from '../../ComponentBox.js';
import config from './config.json';
import { element } from '../../dom.js';
import { SpriteAtlas } from '../../SpriteAtlas.js';
import { BindingScope } from '../../../../../binding/BindingScope.js';
import { bindEvent } from '../../../../../binding/bindEvent.js';
import { GameplayTableSettingData } from '../../../../../data/GameplayTableSettingData.js';
import { GameplayTableSetting, type TableSettingRow } from '../../../../../logic/GameplayTableSetting.js';
import { StringHelper } from '../../../../../logic/StringHelper.js';
import { i18nMgr } from '../../../../../i18n/i18nMgr.js';
import { TableSettingRowView } from '../TableSettingRowView/TableSettingRowView.js';
/** Bound to this room's basicInfo/permissions, independently of the buy-in amount UI. */
export class GameplayTableSettingView {
  readonly root=componentBox(element('section','mx-room-settings'),config);
  private viewed=new Set<string>();
  private mode:'security'|'rules'='security';
  private warning=element('div','mx-room-settings-warning');
  private warningLabel=element('span','');
  private callTime=element('p','mx-room-settings-calltime');
  private list=element('div','mx-room-settings-list');
  private tooltip=element('div','mx-room-settings-tooltip');
  private tipTitle=element('strong','');
  private tipText=element('p','');
  private rows=new Map<string,TableSettingRowView>();
  private headings=new Map<string,HTMLElement>();
  private bindings=new BindingScope(this);
  constructor(private data:GameplayTableSettingData) {
    const icon=element('span','mx-room-settings-warning-icon');SpriteAtlas.paintWarning(icon, config.paths.infoTip);
    this.warning.append(icon,this.warningLabel);
    const dismiss=element('button','mx-room-settings-tip-close','×');dismiss.type='button';dismiss.onclick=()=>this.tooltip.hidden=true;
    this.tooltip.append(this.tipTitle,this.tipText,dismiss);this.tooltip.hidden=true;
    this.root.append(this.warning,this.callTime,this.list,this.tooltip);this.root.hidden=true;
    this.bindings.bind({basic:data});i18nMgr.register(this);
  }
  show(mode:'security'|'rules'|null):void {
    if(mode===null&&!this.root.hidden){void this.data.newLabels?.report(this.viewed);this.viewed.clear();}
    this.root.hidden=mode===null;if(mode===null){this.tooltip.hidden=true;return;}
    if(this.mode!==mode){this.mode=mode;this.tooltip.hidden=true;}
    void this.data.newLabels?.load();
    this.refresh();
  }
  @bindEvent(GameplayTableSettingData.BASIC_CHANGED,'basic')
  private onBasicChanged():void {this.refresh();}
  @bindEvent(GameplayTableSettingData.PERMISSIONS_CHANGED,'basic')
  private onPermissionsChanged():void {this.refresh();}
  @bindEvent(GameplayTableSettingData.LABELS_CHANGED,'basic')
  private onLabelsChanged():void {this.refresh();}
  refreshLanguage():void {this.tooltip.hidden=true;this.refresh();}
  private refresh():void {
    const b=this.data.basicInfo;if(!b || this.root.hidden)return;
    const L=(key:string)=>i18nMgr.Get(key);
    this.warning.hidden=b.randomSeated&&b.delaySeeCard&&b.limitIP&&b.limitGPS&&b.antiCheatType>1&&b.seatedMessage;
    this.warningLabel.textContent=L('UITableSetting_tips');
    this.callTime.hidden=this.mode!=='security'||!b.hasCallTime;
    this.callTime.textContent=b.hasCallTime?StringHelper.Format(L('UICreateCallTimeTips'),[b.callTimeWinline,b.callTimeLimit,b.callTimeWinline]):'';
    const rows:TableSettingRow[]=[];
    const status=(key:string,enabled:boolean,tips='')=>rows.push({id:key,title:L(key),value:L(enabled?'6digit_password_opened':'UIMine_AccountNotOpen'),color:enabled?'#7ED27E':'#FF6666',enabled,tips:tips?L(tips):''});
    if(this.mode==='security') {
      if(Number(this.data.roomPermissions.room_random_seat)===1)status('UICreateTable_randSeat',b.randomSeated,'UICreateTable_randSeatTips');
      status('adaptation20088',b.delaySeeCard);
      status('UIClub_RoomCreat_noh7zoAE',b.limitIP);status('UIClub_RoomCreat_OMKEvaor',b.limitGPS);
      status('UISecuritySetting_limitVideo',b.antiCheatType>1);status('Safe',b.seatedMessage);
    }else rows.push(...new GameplayTableSetting(b,this.data.roomPermissions,L).getRows());
    const nodes:HTMLElement[]=[];
    const heading=(key:string)=>{let node=this.headings.get(key);if(!node){node=element('h3','mx-room-settings-heading');this.headings.set(key,node)}node.textContent=L(key);nodes.push(node);};
    if(this.mode==='security')heading('UITableSetting_importantFeatures');
    const retained=new Set<string>();
    for(const row of rows) {
      if(this.mode==='security'&&row.id==='Safe')heading('UITableSetting_additionalFeatures');
      retained.add(row.id);let view=this.rows.get(row.id);
      if(!view){view=new TableSettingRowView((title,text)=>{this.tipTitle.textContent=title;this.tipText.textContent=text;this.tooltip.hidden=false;});this.rows.set(row.id,view);}
      const key=({UICreateTable_randSeat:'room_random_seat',UICreateTable_FouceShowCard:'room_force_show_card',UICreateTable_iosTitle:'room_only_ios'} as Record<string,string>)[row.id]??row.id;
      row.isNew=this.data.newLabels?.isNew(key)??false;
      if(row.isNew)this.viewed.add(key);
      view.update(row);nodes.push(view.root);
    }
    for(const [id,view] of this.rows)if(!retained.has(id)){view.root.remove();this.rows.delete(id);}
    for(const node of [...this.list.children])if(!nodes.includes(node as HTMLElement))node.remove();
    nodes.forEach((node,index)=>{if(this.list.children[index]!==node)this.list.insertBefore(node,this.list.children[index]??null);});
  }
  destroy():void {this.show(null);this.bindings.destroy();this.root.remove();}
}
