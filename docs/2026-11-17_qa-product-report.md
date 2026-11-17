# reorg-qa 产品问题修复与验收记录

基线：`reorg-qa` / `35f980b`。日期：2026-11-17。本报告只记录本轮改动，不将旧分支验收当成本轮证据。外部 H5、CC 未修改；尚未提交或推送。

群内可识别37项反馈（含顺序推定的BB一项），不是已闭环40项：第8已根据用户补充的20017服务端条件修复返桌参数、实服仍待复测，第36属于H5外部删除项，17–19未独立定位。其余项目包含本轮修复和对当前分支已有实现的回归。

用户最终确认保留带入金额分项显示（例如2 + 1.40），无需改回Cocos的合计数值显示。该展示现为明确授权的迁移差异。

第8项最终方案（用户要求与Cocos一致）：问题出在MX对自动藏钱低余额返桌弹窗仍锁定旧金额，而Cocos会开放普通带入范围。现仅直接返桌固定旧金额，低于自动上桌门槛时允许重新选择带入金额；保留Cocos的AutoOnTable、AutoOnTableFix、AutoOnTableMax初始化，撤销此前统一清零方案。手动藏钱仅在直接返桌时扣除押金并将store下限限制为0。既有押金上限修复及渠道钱包隔离保留。新增Host→Controller→protobuf回归覆盖低余额选择、门槛相等/以上、不藏钱及手动藏钱返桌。下文原房间未复现记录为此前现场验收情况，不能据此替代本次修复后的实服复测。

截图扫描是98场景×4布局=392张；成功渲染不等于每个像素、每条服务端流程全部通过。对照原图采用等宽等比例，初代约440×952，其他440×782；没有拉伸成统一高度。现金桌弹窗的完整Figma原图未全部取得，不能将功能截图称为完整弹窗像素验收。

[打开图文对照与全部场景截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/index.html)

## 每条处理说明

|编号|原反馈|本轮处理/保留行为|代码范围|验证状态|截图|
|---|---|---|---|---|---|
|1|战绩字号、宽度、本人标识、入池率、保险页、离桌玩家|面板宽度改为90%，随宽度增大文字和关闭按钮；本人白字红点，离桌暗色删除线，盈利红/亏损蓝；表头本桌入池率；移除保险标签。|ReportView / ReportController / records.css|组件通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-report-departed.jpg)|
|2|弃牌按钮上的圆圈|保留用户确认的本人倒计时在弃牌按钮；核对沿按钮外框显示、不再叠加本人头像行动圈。现有分支已有该逻辑，本轮做回归。|SeatCountdownView / ActionControls|现有行为回归|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-acting-self.jpg)|
|3|关闭安全提示后继续带入|安全/规则提示的关闭动作进入金额页，不再关闭整条坐下流程；不自动提交下注或带入。|BuyInController.skipNotices / BuyInView|组件及在线通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-bring-deposit.jpg)|
|4|蘑菇/鱿鱼/暴击介绍图案和确定底框|图片与确认区禁止flex压缩；长内容内部滚动并限制最大高度，三个介绍分别补模拟。|mushroom-boom.css|组件通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-intro-mushroom.jpg)|
|5|底部导航尺寸、认证和按钮顺序|四布局复用固定尺寸底栏；认证使用原认证图，不再取俱乐部头像；普通3操作+认证、语音4操作+认证、视频6操作+认证。|NavigationView / appearance.css|三种导航交互通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-media-video.jpg)|
|6|牌谱大小、金额、输赢颜色和窗口轮廓|扩大共用窗口比例，连同字体、牌面和关闭图标等比例放大；本人强调色；沿用动作金额网格；左下直角、左上圆角，战绩同步。|RecordDialogView / records.css|组件扫描；完整弹窗设计对照未完成|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-history.jpg)|
|7|聊天宽度和软键盘挡输入|扩大聊天宽度；监听visualViewport resize/scroll，按可见视口下边缘收缩面板，销毁时移除监听。|TableChatView / config.json|组件验证；实体手机键盘待验|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-chat.jpg)|
|8|90209946鱿鱼桌坐下失败|检查带入/押金边界并补夹零；真实鱿鱼桌92460962已坐下成功。原90209946未在当前列表找到，没有复现其错误码，不能确定原报错根因或宣称修复。|BringInRules；真实测试记录|原房间待复现|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/online-squid-seated.png)|
|9|聊天毛玻璃和设计布局|统一使用当前RecordDialog玻璃效果，移除聊天旧背景覆盖；保留消息滚动、固定输入区和快捷消息。|chat.css / TableChatView|组件扫描；完整弹窗设计对照未完成|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-chat.jpg)|
|10|初代手牌和公共牌偏小/公共牌位置|初代头像/本人手牌比例增大，公共牌放大并下移到桌面中部；横向间隙缩小但不归零，中部信息避开顶部名片；保留初代横向间距，不套新版无间距规则。|LayoutOriginal|同比例截图及几何检查|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-figma.jpg)|
|11|1000+60与4000+60押金|最大带入上限增加尚未缴纳押金，最小值保持包含押金；已缴足不重复增加，超额押金夹零；UI以本金+押金展示，提交仍用协议总额。|BringInRules / BuyInView|金额回归和组件提交通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-bring-deposit.jpg)|
|12|滑杆留白、快捷字重和手牌衔接|移除range原生聚焦矩形，保留轨道可见焦点；快捷比例金额加粗；新版确认按钮保持原加注位置；经典本人手牌锚点再对齐。|table.css / action-controls / LayoutProfile|交互与多尺寸位置检查|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-raise.jpg)|
|13|初代文字、鱿鱼、等待、底池和D标|初代姓名/筹码/动作字号增大，等待加粗；鱿鱼站起文案缩为站起并放大图；D标放大；初代边池左对齐，长金额自适应。|appearance.css / SquidView / SeatView / table.css|组件场景扫描|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-squid-active.jpg)|
|14|初代头像名片尺寸与零鱿鱼|初代头像放大并调整上下座位，短屏减少顶部预留；名片字体随现有座位比例；鱿鱼数量为0时隐藏，不显示两条空标识。|LayoutOriginal / SeatIdentityView|组件通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-squid-active.jpg)|
|15|保险规则缺Outs，迁移MX弹窗|新增InsuranceRulesView，复用RecordDialog；经典/低水读取房间insuranceOddsList，按人数列Outs与赔率；EV用自身说明。菜单保险规则在MX打开，普通玩法规则仍交H5。|InsuranceRulesView / TableView|三种模式交互通过；H5清理待外部执行|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-insurance-rules.jpg)|
|16|牌谱本人颜色|本人牌谱文字使用主题强调色，战绩本人仍按反馈保持白色，两者不混用。|records.css|组件扫描|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-history.jpg)|
|17|编号未定位|群内16后直接出现20；用户说明可能为未编号图片/文字。已纳入可识别的未编号BB反馈；不虚构本项内容。|Imokay原消息|未独立定位|—|
|18|编号未定位|同上；需要能独立对应的原消息才能补充准确范围。|Imokay原消息|未独立定位|—|
|19|编号未定位|同上；不以重复条目填满40项。|Imokay原消息|未独立定位|—|
|20|初代长下注金额遮筹码图标|下注胶囊改内容宽度和flex；筹码图标不压缩，按座位左右调整图标顺序，长金额不再覆盖图标。|SeatBetView / table.css|组件扫描|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-long.jpg)|
|21|初代倒计时保留原版|初代不进入新版金色头像圈样式；本人倒计时仍遵循此前确认的弃牌按钮位置。|appearance.css / SeatCountdownView|现有分支回归|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-acting-other.jpg)|
|22|均衡Jackpot遮头像|JP锚点采用布局设计单位；440宽下均衡/椭圆约58，经典约18，避开上方玩家。|JackpotView / LayoutProfile|组件截图核对|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-jackpot.jpg)|
|23|他人手牌尺寸重叠/右下位置|保留新版18设计单位牌背及重叠；右侧玩家牌背改为头像右下相对偏移，所有偏移继续随头像变换。|LayoutProfile|同比例及多尺寸检查|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|24|均衡本人ALLIN离头像远|去掉叠加的上移量，效果根节点直接沿座位头像锚点定位，保留本人/他人各自Spine资源。|SeatEffectView/config.json|锚点回归和截图|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-allin.jpg)|
|25|POT中文|快捷比例上方使用正式词库adaptation20005；中文为底池，切语言随运行时刷新。|action-controls.ts|组件截图|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|26|均衡他人倒计时数字|将均衡纳入新版行动秒数展示；本人仅在弃牌按钮，其他玩家在头像。|appearance.css|倒计时交互通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-acting-other.jpg)|
|27|均衡动作框和字体偏小|三款新布局姓名/筹码/操作气泡按各自头像尺寸归一化到共同设计尺寸；头像大小区别仍保留。|appearance.css / LayoutProfile|同档位布局核对|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|28|底池边池毛玻璃与黑粗字|保留当前筹码胶囊视觉与黑色字重；补长金额内容自适应和BB小单位，不再固定宽度裁切。|PotView / table.css|长金额检查通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-sidepots-long.jpg)|
|29|D标放大|共用庄家标尺寸75×77→86×88设计单位，继续用头像相对坐标；四布局检查手牌/筹码不覆盖。|SeatView/config.json|48组边界检查通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-dealer-self.jpg)|
|30|未编号：BB比金额小|统一ChipLabel保留ChipFormatter金额算法，BB单独以0.65em显示；用于筹码、下注、底池、快捷金额、跟注/抓及滑杆金额。|ChipLabel / PotView / ActionControls|字体大小检查通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|31|均衡本人区域偏上|参考稿本人头像中心596锚点沿用；修正下方筹码距离，避免底栏裁切；手牌/动作/庄家全部依头像移动，不单独屏幕定位。|TableLayoutProfile / LayoutProfile|参考图复核及边界检查|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|32|WIN遮筹码、牌型金额位置|WIN时保留在桌筹码；获胜胶囊使用头像相对的已释放下注区域，本人单独侧置，避免覆盖筹码；保留牌型/手牌高亮。|SeatIdentityView / SeatView / LayoutProfile|WIN与筹码无相交检查通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-settlement-bets.jpg)|
|33|最大档按钮、头像、操作文字间距|保留经典快捷按钮按手牌上边缘抬升；修正经典手牌与头像锚点，110%和短屏验证确认按钮不换位。|LayoutProfile / TableLayoutProfile|多尺寸110%检查|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-raise.jpg)|
|34|长边池金额出框|移除固定宽度/flex-basis覆盖，内容宽度、内边距、居中换行；新增九个长金额边池模拟。|table.css / AuditScenarios|文字不溢出检查通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-sidepots-long.jpg)|
|35|三新布局公共尺寸不一致|姓名/动作/筹码按统一设计单位换算；公共牌宽50.59；三款新版单/双公共牌均保持同档宽度，经典两排保留窄缝；本人头像保留各布局区别。|LayoutClassic / LayoutProfile / appearance.css|单/双公共牌同档宽度统一；原图同比例核对|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|36|删除下载APP按钮|群内原图是H5通知面板“下载APP赢奖励1”的下载按钮；未在MX造替代入口，也未修改H5。列出H5删除按钮及无用handler的交接位置。|H5 BridgeNotificationPanel.vue|外部H5待删除|—|
|37|获胜金额与下注重叠/JP|handEnded后隐藏旧roundBet节点，防止残留快照与获胜胶囊叠加；本轮未新增收筹码动画；JP按布局锚点。新增残留下注结算模拟。|SeatBetView / SeatView / JackpotView|结算交互通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-settlement-bets.jpg)|
|38|带入字号字重/自动充值|标题、详情、钱包名、限额和确认字号增大；自动补充区域隐藏、默认false，提交autoAmount=0。|BuyInView / config.json|组件通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-bring-deposit.jpg)|
|39|返回与菜单偏小|设计单位由89增至108，仍沿用既有unit适配，不写死设备像素。|table.css|四布局截图|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)|
|40|初代缺快捷下注入口|取消按布局隐藏快捷设置标签，初代可进入三/五比例、自定义百分比及滑杆提交方式。|PersonalSettingsView|四布局标签交互通过|[截图](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-settings-quick.jpg)|

## 四布局与设计原图

所有图片保持原比例。背景、头像、牌点和金额不同不作为同像素差值；比较字体、卡牌尺寸、玩家相对坐标、按钮和间距。

### 初代

Figma 原图：![初代设计](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/reference/original-full-original.png)

当前组件：![初代实现](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/original-figma.jpg)

### 均衡环形

Figma 原图：![均衡环形设计](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/reference/balanced-100-original.png)

当前组件：![均衡环形实现](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/balanced-figma.jpg)

### 竞技椭圆

[完整 Figma 原始导出](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/reference/oval-full-original.png)。下方为从整张导出中裁切的100%单屏，尺寸未拉伸。

Figma 单屏：![竞技椭圆设计](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/reference/oval-100-crop.png)

当前组件：![竞技椭圆实现](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/oval-figma.jpg)

### 经典

[完整 Figma 原始导出](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/reference/classic-full-original.png)。下方为从整张导出中裁切的100%单屏，尺寸未拉伸。

Figma 单屏：![经典设计](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/reference/classic-100-crop.png)

当前组件：![经典实现](/Users/kongfanbing/data/h5-mx-game/docs/qa/product-2026-11-17/scenarios/classic-figma.jpg)

## 同比例实测尺寸

以下为100%档、440宽离线场景的DOM实际显示尺寸。初代高度952，其他782。尺寸包括现有适配变换，不能把源码中的设计单位直接当作显示像素。

|布局|本人头像|本人单张手牌|单张公共牌|弃牌按钮|本人筹码下边缘 / 导航上边缘|
|---|---|---|---|---|---|
|初代|66.89 × 66.89|44.37 × 65.07|51.33 × 75.29|49.41 × 49.41|863.92 / 895.00|
|均衡环形|60.00 × 60.00|40.00 × 56.00|50.59 × 71.02|44.25 × 44.25|721.02 / 725.00|
|竞技椭圆|50.00 × 50.00|40.00 × 56.00|50.59 × 71.02|44.25 × 44.25|723.68 / 725.00|
|经典|58.00 × 58.00|50.00 × 71.00|50.59 × 71.02|44.25 × 44.25|721.55 / 725.00|

新版公共牌设计宽50.59，高约71.02，三布局实测统一；本人手牌保留经典50×71、均衡/椭圆40×56的设计差异。初代保留独立手牌与公共牌比例及窄间隙。所有坐标检查使用未四舍五入值，展示表仅保留两位小数。

## 模拟补充

本轮新增13个可选场景。仍是同组件的离线合成数据；保险赔率是模拟数值，不能作为真实房间赔率依据。

|场景|用途|
|---|---|
|insurance-rules|窗口 · 保险说明与模拟房间赔率|
|insurance-rules-standard|窗口 · 经典保险说明／完整赔率表|
|insurance-rules-ev|窗口 · EV保险说明|
|sidepots-long|玩家 · 九个长金额边池|
|report-departed|窗口 · 战绩已离桌玩家|
|menu|窗口 · 侧菜单全部入口|
|settings-quick|窗口 · 快捷下注设置|
|settings-system|窗口 · 系统设置|
|intro-mushroom|玩法 · 蘑菇介绍完整图文|
|intro-critical|玩法 · 暴击介绍完整图文|
|intro-squid|玩法 · 鱿鱼介绍完整图文|
|bring-deposit|入座 · 押金不占带入限额|
|settlement-bets|流程 · 结算时旧下注仍在快照|

现有模拟包含：2–9座与本人座位轮转、庄家本人/他人、2/4/5/6手牌、亮/暗/部分亮牌、弃牌选择亮牌、补盲/留座/托管/等待/倒计时、完整一手、重连/切桌/离桌、保险/二道牌/鱿鱼/蘑菇/暴击/JP、表情/道具/赠钻、战绩/牌谱/资料/设置/聊天、语音视频占位和MTT桌内状态。音视频占位不调用摄像头/麦克风，也不是Agora实服验收。

## 在线证据及外部交接

- 测试环境实际进入竞技场2的鱿鱼桌92460962，关闭安全提示后出现2+1.40带入，测试筹码确认后服务端已坐下。截图见 `online-squid-seated.png`。离桌后回到俱乐部列表，人数显示5/9；未再进入确认自己座位为空。原反馈90209946没有找到，不能以新桌成功替代其错误复现。
- H5保险说明：`/Users/kongfanbing/data/h5-game/src/components/BridgePanel/panels/BridgeGameRulePanel.vue` 的保险专属分支需在H5后续移除/停用，先检查其他调用方；普通玩法规则仍走该面板，不应整文件删除。MX菜单保险说明已不再调用H5保险弹窗。
- H5下载按钮：`/Users/kongfanbing/data/h5-game/src/components/BridgePanel/panels/BridgeNotificationPanel.vue` 的下载APP按钮及无其他引用的onDownload由H5维护方删除；“添加桌面快捷方式”和通知步骤保留。用户要求不改H5，本轮未修改。
- 联调脚本移除强制VITE_BRIDGE_TARGET=h5-cc-game，遵循实际H5自身配置，解决本机安装桥接版本与强制目标不匹配造成的登录空白。没有修改H5源码或环境文件。

## 本轮最终验证结果

|检查|结果|说明|
|---|---|---|
|串行回归|277/277通过|包含新增押金、关闭提示及单/双公共牌尺寸回归|
|构建|通过|TypeScript check、两个Vite构建、声明类型；保留chunk及动态导入提示|
|离线组件类型检查|通过|包含新增模拟场景和保险规则面板|
|交互检查|60/60通过|四布局分别执行；不是实服全部流程|
|尺寸及座位检查|56项通过|48个布局/尺寸组合，加8个流程检查；含导航遮挡断言|
|UI几何检查|60项通过|含初代和新版公共牌/下注、倒计时和状态外框|
|键盘视口模拟|12项通过|真实系统软键盘仍待实体设备验收|
|初代信息避让|8项通过|单/双公共牌、四种尺寸、110%|
|截图场景扫描|392项无页面错误|98场景×4布局；不等同全部像素或全部实服验收|

## 验证证据

- `product-interactions.json`：60项交互，含押金上下限、提示关闭、三种保险规则、导航组合、WIN不遮筹码、倒计时、BB、长池和离桌战绩。
- `stress-verification.json`：四布局×十二尺寸、六张手牌、110%、长昵称的48组边界（含筹码与实际导航不得相交），以及8项弃牌亮牌/整手流程。
- `ui-geometry/results.json`：公共牌居中/间隔、下注避让、倒计时位置、等待外框的独立检查；以最终结果为准，不沿用未完成运行。
- `scenario-results-all.json`：392场景渲染记录，另有refresh结果覆盖最终布局/结算变化。

复现：启动项目在5173，打开 `tests/fixtures/layout-audit.html`。运行 `MX_PLAYWRIGHT_MODULE=<playwright-core入口> node tests/fixtures/verify-product-qa.mjs`；全量截图用同环境运行 `tests/fixtures/capture-product-qa.mjs`。单元回归使用 `npm test`（串行），构建使用 `npm run build`。

- `original-content-check.json`：初代单/双公共牌 × 四尺寸 × 110%，8组房间信息与公共牌/本人手牌无相交。
- 新增单元回归约束三款新版在单/双公共牌下，同一档位都保持50.59设计宽度。

## 尚未闭环的验收边界

- 原鱿鱼报错房间与错误码未复现；不能证明该条产品问题根因已消除。
- 实体iOS/Android软键盘、系统浏览器与性能未验收。
- Figma接口权限/套餐限制，原生界面可查看，但完整现金桌弹窗原图未全部导出；当前已导出四布局原图已嵌入对照。
- 17–19未独立识别，36须H5维护方执行；职业横屏和第三套牌面仍按既定范围暂缓。
