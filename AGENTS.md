# h5-mx-game — 开发约定与跨机器交接

## 2026-11-18 鱿鱼结算内部卡片补齐

按用户指定748:52289原稿补齐内部白色13%透明背景、50设计单位圆角卡片及#05E7AE顶部（125设计单位），鱿鱼原素材叠在色块上方；每行含分隔线/边距统一177设计单位，末行不再缩短。沿用1242设计宽→375参考宽及DialogSurface整体缩放。仅改SquidView结构、组件配置和鱿鱼样式，金额/奖励判断、背景关闭及5秒自动关闭保持原逻辑；既有Figma验收脚本同步更新几何断言。MCP限额后通过本机Figma核对原稿。类型检查、10项相关测试、双Vite构建及声明类型通过；四布局×五种尺寸×2/7/9人共60组离线浏览器检查、背景关闭/内部点击保持及5秒自动关闭通过。截图和结果在/tmp/mx-squid-result-*，未作实服/实体机验收。

## 2026-11-18 竞技椭圆本人区域贴弧线

竞技椭圆竖屏本人区域按桌布弧线重新定位，常规尺寸头像下沿与弧线相切，底部空座同步贴线；短屏保留手牌、余额与结算信息所需空间。手牌、操作区随本人区域下移，贴边按钮继续使用独立桌面坐标。余额和D标避让底栏，牌型标签放手牌右侧。五种尺寸、40项离线场景检查及20项相关回归通过。

后续按用户要求将竞技椭圆3/5快捷加注按钮单独上移16个设计单位，复用`--mx-quick-lift`，头像、手牌、主操作按钮及贴边按钮位置不变。四种尺寸、90%/110%、普通/加注状态共32项浏览器检查及6项布局回归通过。

## 2026-11-18 初代/经典本人头像与手牌间距

按用户要求将本人头像和下注类型气泡下移，经典为8个设计单位，初代按底栏剩余空间限制并将手牌上提16个头像局部单位。`SeatPlacement.controlsY` 保留原操作锚点，操作区、下注筹码、D标维持原位置；结算信息通过 `--mx-hero-avatar-drop` 补偿，避免跟头像下移后压到底栏。调整针对竖屏本人区域。

## 2026-11-18 新版贴边按钮定位（用户最终澄清）

均衡、经典、竞技竖屏的加时、偷偷看、发发看共用经典牌桌当前正确的桌面坐标，不跟本人头像、手牌、座位或下注按钮大小移动。`layouts/side-buttons-layout.ts` 按视口独立计算锚点，`LayoutProfile.content` 输出 CSS 变量；初代和横屏保留原定位。不要再用抵消头像下移量的方式恢复均衡的旧位置，用户已明确旧位置仍然太低。已对比五种尺寸、三布局、普通操作/加注/结算共45组修改前经典坐标，另9组人数/本人座位/按钮大小变化通过；本人头像、手牌、余额保留本轮调整。
## 2026-11-18 第43/44项新Figma修订

在reorg-qa按12206:61282与12206:61820修订。MCP达到套餐限额后，用户明确授权本机Figma取图和属性；四款缩略图及结算鱿鱼为原始导出素材。设置按原稿顺序、字号间距、五列三行初代桌布和新版横滑列表调整；修复编号桌布点击未将style切回legacy导致颜色区不收起的问题。结算复用玻璃框、375参考宽度下317.03×457.13七人面板、圆头像/ID/正负金额及头像上方奖励，保留服务端金额与奖励判断、背景关闭和5秒自动关闭。DialogSurface新增可选参考宽度，其他弹窗默认480不变。

新增squid-result-figma七人场景及verify-figma-43-44.mjs。282项串行回归、37项专项浏览器检查、应用与离线类型检查、双构建和声明类型通过；仅既有构建提示。原图对照和截图在本地docs/qa/figma-43-44/index.html，说明docs/2026-11-18_qa-43-44-figma.md。保留14款已有桌布和两牌面资源，不把原稿重复编号新增成桌布；不声称逐像素/实服/实体手机验收。H5/CC未改。用户已授权将本轮代码、素材、测试和说明提交并推送到reorg-qa；截图及原图对照报告保留本地，不纳入Git。

## 2026-11-18 第42项第二道牌占位补充

用户再次澄清：只有经典第一道牌补五槽占位；第二道牌任何阶段都不补占位，实际几张就画几张。撤销showEmptyBoard参数，第二排始终setFixedSlots(false)。经典第二排恢复CC doubleRowPitch=0.5的半牌高重叠，不能再按“两排不得重叠”验收；其他布局定位保持原样。新增7个board-*离线场景和verify-board-placeholders.mjs，56项布局/阶段/尺寸检查及第二排清牌回归通过，6项布局单测、应用/离线类型检查通过。已目视核对经典双排翻牌截图。用户已授权将此次补充提交并推送到reorg-qa；未实服复测。结算J牌绿框与弹起分别依据本人牌型和获胜玩家牌型，核对Cocos一致，保持原逻辑。

## 2026-11-18 Imokay反馈41–102（reorg-qa）

从e0d738b同步后处理62个编号。新要求覆盖旧约定：参与鱿鱼但0只显示右上鱿鱼数字0，不再绑鱿鱼；三款新版公共牌保留初代式窄缝；初代允许牌面选择和3/5快捷按钮，但显示大小及编号桌布仍按初代独立规则。新版设置金额/布局固定在顶部；默认新偏好为绿色纯色，保留已有账号选择。

自动预选锁定金额，金额/类型变化、跨手跨街、身份/座位/房间改变、sync和留座托管清除；快捷按钮复用节点且提交后隐藏。房间信息点击复用GameplayTableSettingView，不走带入。修复卡牌/D标/气泡/筹码/倒计时、鱿鱼结算玻璃面板及背景关闭、战绩自然高度/单tab隐藏、四列保险赔率。局部坐标特别注意：SeatIdentity子元素已有translate用于原点转换，不能为下移鱿鱼重写translate；应改top。经典背牌右边缘锚定，左下偏移需按牌背总宽度修正，避免屏幕裁切。

282串行回归、check/双构建/types、离线类型检查通过；40反馈交互、60几何、48多尺寸通过。新增squid-revealed/room-details，现100场景。未执行本轮实服或实体机全组合验收。第47项支付看牌/加时失败仅完成CC协议对照，未发现可证实参数差异，已问用户要错误码/复现房间，不能标为修复。第66旧CC入口是空方法，MX已有请求和广播实现，不照搬空实现。

详细逐项说明docs/2026-11-18_qa-feedback-41-102.md；本地含Figma对照HTML在docs/qa/product-2026-11-18，不入Git。用户授权提交推送reorg-qa，并将生成报告发布Imokay“md,wj,kong”群且@wj。H5/CC源码本轮未修改；独立H5已迁移规则弹窗删除项在报告中交接。

## 2026-11-17 鱿鱼中途加入标记与通知

修复上一轮SeatIdentityView将squidMask永久隐藏的问题，按CC恢复squidIn且squidCount===0时显示绑鱿鱼，层级高于经典头像。SquidIn的firstIn广播增加noticeSerial，SquidView不再按相同文案去重，连续加入均提醒；普通更新及重连不重播提醒。离线squid-join模拟本人/他人尚未参与，加入通过实际SquidIn处理器，新增“模拟他人中途加入”按钮及verify-squid-ui.mjs。279项回归、应用与离线类型检查通过；四布局浏览器验证本人加入后遮罩、他人加入及连续相同提醒通过。未完成实服复测；用户已授权将本轮及返桌改动提交并推送到reorg-qa。用户明确确认保留金额“带入筹码 + 押金”分项显示（如2 + 1.40），这是相对Cocos合计显示的已确认差异。

## 2026-11-17 第8项返桌20017补充修复

用户最终要求以Cocos逻辑为准，除明确要求的迁移差异外不另造行为。第8项根因是MX沿用自动藏钱低余额返桌弹窗，却把min/max都锁为旧返桌金额；Cocos弹窗实际使用普通可选带入范围。现仅直接返桌锁定旧金额，低于自动上桌门槛的弹窗使用BringInRules范围，提交新选择金额。撤销此前返桌统一清零AutoOnTable/AutoOnTableFix/AutoOnTableMax的处理，恢复Cocos初始化；手动藏钱只在直接返桌计算时扣押金并夹零。保留已确认的押金上限修复与渠道钱包隔离。新增Host→Controller→protobuf回归覆盖低余额选择金额、门槛相等及以上直接返桌、不藏钱/手动藏钱直接返桌。原房间实服仍待复测；本次未改H5或Cocos。

## 2026-11-17 产品验收修复（reorg-qa）

用户最新要求覆盖旧分支约定：本轮切到远程同步后的 `reorg-qa`，基线 `35f980b`，在重构后的 `src/assets/style1/table` 修复。不要改 kong/main，不要迁回旧 src/table。用户随后授权将本轮代码、测试和验收说明提交并推送到 reorg-qa；截图及验收压缩包保留本地，不纳入 Git。

指定 Imokay 群的反馈可独立识别37项，17–19没有独立对应消息，不能虚构补满40项。第8原房间90209946未复现；在另一鱿鱼桌92460962已真实通过关闭安全提示、2+1.40带入和服务端坐下，离桌回到俱乐部，未重新进桌确认自己的座位已空。第36下载APP位于外部H5通知面板，未修改H5。第15保险说明已在MX新增InsuranceRulesView，复用玻璃框和房间赔率；普通玩法规则仍走H5，保险专属分支的H5删除项另列交接。

本轮调整带入押金、安全提示关闭、导航认证与尺寸、战绩/牌谱/聊天、布局坐标/字号/公共牌、长下注/边池、WIN与残留下注、ALLIN/D标/倒计时/鱿鱼及初代快捷设置。本人元素仍以头像为锚点，底部预留读取实际导航上边缘。离线新增13场景，现98场景；钱包余额和坐下后扣押金的模拟同步修正。

逐项说明见 `docs/2026-11-17_qa-product-report.md`，图片报告在 `docs/qa/product-2026-11-17/index.html`（截图目录被Git忽略）。5173是离线模拟；本轮临时5175/4180在线服务已关闭。完整现金桌弹窗Figma原图未全部取得，不能把392场景扫描称为全UI像素验收通过；实体手机键盘、系统浏览器仍未验收。最终测试数量及结果以本轮报告为准。

本轮最终：277项串行回归、60项交互、56项尺寸/流程、60项UI几何、12项键盘视口模拟、8项初代信息避让均通过；98场景×四布局扫描无页面错误。check、两个Vite构建、声明类型及离线组件类型检查通过，保留既有chunk/动态导入提示。初代按独立原图保留窄牌缝，三款新版单/双公共牌在同档位统一宽度。截图只在本地验收包，不包含实服全部组合、实体手机或未取得原图的完整弹窗像素验收。

## 2026-11-17 kong-qa 合入 reorg

已将固定 origin/kong-qa 提交 ce51d94a762f5685f1af2f167c8b5777323ca824 纳入 codex/reorg 历史；QA 是原基点 cc1dea0 的后代，先完整备份，再推进基点，保留所有工作区文件。没有创建额外提交、没有推送；用户明确最终在自己的 codex/reorg 分支手动提交未提交的改造和冲突处理。恢复快照在本机 /tmp/mx-integrated-qa-20261117-105348，不是跨机器依赖。

迁移保留 style1 目录、局部坐标盒和 TableLayout 接口，将 QA 坐标放进各 Layout 实现；加入游客坐下续接、冻结账号检查、NEW 标签、钻石定向同步、布局/有效设置、弃牌按钮倒计时及资源更新。钱包浮层通过 AnchoredPopup 显式适配坐标。274 项回归、生产双构建和 types 通过，3168 组布局与固定 QA 实现一致；后续仅调整倒计时固定外框 CSS，diff 检查通过，未重复全量构建。外部 H5 源码与锁文件未改。

本次真实 H5 5174 验证测试账号登录回原桌、竞技场2保险-1（92331122，7座）坐下、带入200测试筹码、收手牌和行动倒计时。游客登录后的自动续接在观察瞬间未出现，后续看到带入窗口，但不能据此宣称整条自动续接时序已完整验证；冻结、MTT等特殊线上场景也未重测。用户最新要求保留头像倒计时固定外框；弃牌按钮不带头像圆环，倒计时沿按钮圆角边缘走，实服计算框大小吻合（约40.63px），非离线演示。


## 2026-11-17 独立素材边界（用户确认）

Spine、表情、桌布属于独立素材及专用加载/播放能力，不要求做成通用UI组件或统一组件config。保留在style1内并严格区分资源和代码；使用方选择挂载位置、层级、尺寸和播放时机。用于打包的路径清单可保留，但不强行配置化个性化播放逻辑。这是接受的架构边界，不是“UI剥离未完成”事项；剩余解耦重点是组件间DOM查询、定位和共用CSS耦合。

## 2026-11-16 组件配置补齐（覆盖下方“首批六个”记录）

在 `codex/reorg` 完成 style1/table/components 下58个组件的 config.json；直接本地图片引用使用 resources 相对原路径，动态媒体/道具图标也通过 paths 解析。组件 CSS 的数值迁入 layout.css，通过 build/component-styles.mjs 生成 virtual:mx-component-config.css；保留原规则顺序与适配条件，不在 dev 打图集。布局算法中的面板尺寸、缩放参数与部分动画参数迁入各自 layout，原数据绑定/协议/金额逻辑保留。

独立根组件用 ComponentBox 读取响应式 w/h（auto 保留原 CSS，数值为设计像素并使用 anchor）；原固定盒仍用 LocalFrame。组合组件 sizing.mode=composite 不另造根盒，实际几何由子组件负责。sizing.root 是定位说明。paths 为空不代表遗漏：公共牌/牌谱牌使用 CardView，效果/动态桌布使用现有资源加载器。Spine/表情资源清单、桌布 image-sources.json 仍有独立职责；不要宣称全项目素材都由58份组件配置打包。共享 CSS 的颜色/阴影仍留在 style1，不声称仅改JSON能实现任意UI重构。

预加载只收配置中需提前加载的图像；原生九宫格/弹窗素材默认按需，LoadingAssets 的背景与进度条显式预载。字体也由路径扫描输出。自动操作图标判断必须使用业务值 fold/call，不能拿资源路径做动作比较。详情见 style1/README.md。

最终252项串行回归、TypeScript、双Vite生产构建及types通过，保留既有大chunk警告；17份CSS回填2408个配置值后与迁移前一致（两处图片URL改由同路径配置解析），490个原始素材哈希不变。内置浏览器真实H5 5174入口确认MX容器和配置CSS变量加载，无控制台error；页面未登录，没有本轮入桌逐窗视觉验收。仍未提交、推送，H5/CC外部源码及锁文件未修改。

## 2026-11-16 短音效合包、长音频独立

按用户确认增加自动分流：mediaPacks.maxClipSeconds默认5秒，<=阈值的非循环音效参与原分组MP3打包；长音频、loop:true、pack:false、单个解码体积超预算均保留原路径独立输出。ffprobe先探测，接近阈值再按样本数确认；两种路径在组件配置里保持一致。生产描述符playback=buffer/stream驱动播放方式：短包缓存AudioBuffer，独立音频使用HTMLAudioElement，不进入整文件fetch/decode缓存，stop/destroy释放；dev原文件均走独立播放器。表情/道具尚未配置化的原流程保持不变，不能宣称全项目音频全部迁移。

12项相关测试通过，包含阈值相等/超限、短循环独立、pack:false、单文件内存超限和独立播放器不fetch/decode及停止释放。TypeScript、双Vite生产构建及types通过；实际产物8个短音效合包，BGM独立（保留已有大chunk警告）。仍在codex/reorg，未提交推送，无浏览器听测。

## 2026-11-16 原路径配置与媒体构建（覆盖下方资源键约定）

用户明确 paths 必须是真实原文件路径、相对 style1/resources 且不带 resources/ 前缀，例如 raw/ui/fold.png。组件 config.json 已转换；CardView faces/alternate 也使用原路径。build 扫描 config.json、去重、生成以原路径为key的图集；dev直接加载原图，不依赖任何生成atlas或预打包。资源生成由 Vite buildStart 负责，npm prebuild 已移除，assets:import 也不打图集。旧生成图片已移出源码，产物仅在 resources/generated（gitignore）。旧未改造组件仍通过 sharedSprites/config.json 的薄别名适配；不要将兼容别名重新放入新 paths。

音频规则在 audio/TableSound/config.json：8个短音效按table-sfx打包，BGM独立。构建需ffmpeg，支持wav/mp3，按用户要求当前默认mp3/128kbps；写Xing/LAME信息并以FFmpeg回解码校验采样时间轴，约2.04MB WAV降为171KB MP3，解码内存不随压缩缩小。format/bitrateKbps/group/sampleRate/channels/gapSeconds/maxDecodedBytes由配置指定。AudioSpritePlayer按原路径查片段，默认静音，销毁/关音效/隐藏取消待播放；emoji/道具音频尚未迁入音频包。视频只接独立原文件+按秒片段的VideoClipView/MediaElementSegment；没有视频拼接/转码，当前无本地视频素材，不能声称视频实测完成。详细 schema、限制及命令见 style1/README.md。

本轮配置/图集/音频9项针对性回归通过（含MP3时间轴、静音间隔和体积回归，未作浏览器听测）；最终生产双构建和types通过（已有大chunk警告），dev实际HTTP模块不引用generated；生产模块按原路径查图集/音频包且不再单独导入fold原图/原音频。490个原始素材哈希不变。不能沿用上一轮235项数字称本轮全量通过。H5/CC/锁文件未改，仍在codex/reorg，未提交推送。

## 2026-11-16 UI 风格目录第一版（优先于下方旧路径记录）

本轮按用户后续明确授权，在 `codex/reorg` 将完整风格归到 `src/assets/style1/`；覆盖上文“资源目录暂不调整”的旧约定。旧 `src/table`、风格 effects/audio 和所有素材已迁入；风格内 `resources/` 只放素材，`table/`、`effects/`、`audio/` 放代码，`build/` 放资源处理工具。共享 Spine runtime 仍在 `src/effects/spine/vendor`。不改 CC 或 H5 外部源码。

选择入口为 `src/config/UiConfig.ts`（运行时）和 `AppearanceConfig.ts`（纯数据选项），接口在 `src/ui/`；业务、协议、定向数据绑定留在 MX 原层。牌桌布局偏好仍是共享功能，不因绑定风格实现而隐藏或锁死设置。所有具体坐标算法在 style1/table/layouts。单风格内部更改只改 style1；换成另一目录时需改这两个装配入口及构建包装入口，不宣称零配置切换。

组件均有独立目录。第一批实际读取 config.json 的组件是 SeatView、SeatIdentityView（头像/昵称）、HandCardsView、PublicCardsView、CardView、ActionButton，包含 w/h/anchor/paths；paths 的图集项使用逻辑资源名，不是网络地址。坐标均为直接父组件的局部坐标；anchor 是0–1的比例，默认约定0,0，保留CC中心锚点的组件显式声明。LocalFrame 明确宽高、锚点和变换原点，跨组件飞行动画通过适配函数转换，不拿兄弟元素当内部布局坐标基准。其余组件已归目录，但尚未逐一配置化，CSS仍有风格内共享规则；不要声称所有组件完全可独立替换或整套UI已完全解耦。

更多目录/配置示例见 src/assets/style1/README.md。本轮235项串行测试通过，生产构建及types通过（已有大chunk警告）；517个资源文件校验，仅ui-atlas.json的source路径变更，素材二进制不变。已恢复本机4179源码服务和5174真实H5临时挂载，并在IAB实际看到大厅（未登录，有外壳下载提示）；尚未入桌验收这次组件坐标改动，不能以构建/协议测试替代视觉回归。临时配置仅位于/tmp，H5源码未改。代码未提交、未推送。

## 2026-11-16 reorg 整理

用户最新要求：本轮在 `codex/reorg` 分支处理检查发现的问题；资源目录后续由用户另行规整，本轮不改资源分类。此约定优先于下方旧的 kong 分支要求。`deps/h5-game` 当前是 MX 跟踪的源码副本，不是有效子模块；根 `.gitmodules` 的旧声明已移除，不改 H5 源码及环境。发布脚本通过 releaseSource 区分独立仓库、MX 内副本与无 Git 目录；本机即使残留失效子模块 gitfile，也从 MX 根读取副本信息，不把 MX 提交冒充 H5 独立提交。测试脚本默认串行执行。 本轮已按现有锁文件 npm ci 恢复 Agora 等依赖；check、229项串行回归、完整 release:web-mobile 均通过，生成 version.json 的 H5 来源为 vendored，独立 h5Commit 为 null。资源/H5源码/锁文件没有变动；未提交或推送。

## 2026-11-16 UI 布局接口边界

用户明确：牌桌 layout 设置是 MX 共享功能，多个桌面共享；新项目配置固定的是 UI 实现，不是锁死布局选项。不能通过 UI 配置隐藏或改写共享设置。TableLayout 已改为 interface，布局实现位于 src/table/layouts，含原 core/seat-layout 和 landscape-layout 坐标算法。TableView 的座位/公共牌/底池/信息/操作区坐标由实现输出，原布局名称分支已移出；MountOptions.ui.createLayout 根据共享设置选择产品绑定的实现。examples/configured-layout.ts 为入口示例。原“固定布局则隐藏其他选项”的尝试已撤销，没有 fixedLayout 配置，MxGameClient 的共享设置初始化未改。迁移前后624组座位坐标完全一致；232项串行测试通过。资源目录未调整。仅完成布局能力这一部分，弹窗/整页UI/资源映射尚未全量接口化；不要宣称整个UI已完全解耦。

## 2026-11-16 协议缺口修复（kong-qa）

本轮只修用户指定的协议审计事项：冻结账号 forbid==0 的坐下/返场/补充及提交拦截；体验账号 isExperience → H5 table-sitdown 登录 → switching 清理 → 真实身份原桌恢复后续接座位；玩法设置新标签 read/num、read 与三次阈值；钻石余额定向同步到资料/牌谱/购钻并隔离旧 HTTP、关闭解绑。新增 GuestSitdownFlow / TableSettingNewLabels，未扩展举报或其他玩法。

更正审计第5项：5174实际使用 `/Users/kongfanbing/data/h5-game`（6323a2d），其 MTT 结算面板已实现 continueWatching/returnLobby 与 inTable/canContinueWatching/watchingPending。此前检查 deps/h5-game 旧副本导致误报；该目录当前没有独立 Git 元数据，不可用 git -C 的上层仓库 HEAD 冒充 H5 版本。用户再次明确禁止修改 H5 或把外壳功能搬进 MX。本轮只补 MX 的 MTT 失败/销毁/返大厅回归，H5 原样保留。

串行244项测试通过（新增11项）；最终check、双Vite构建及types通过（资源未改，跳过atlas重打包，仅既有大chunk提示）。本地浏览器组件验证 NEW 的显示/次数/关闭去重、余额2345不被迟到100覆盖、关闭解绑与320/390宽资料面板边界；独立设置页词库部分回落为key，不将其记为完整本地化/Figma验收。真实冻结、游客转正式、MTT淘汰仍未在线触发。详细记录见 docs/cocos-protocol-gap-audit-2026-11-16.md。kong 分支未动；本轮修复、测试及审计报告按用户要求一并提交到 kong-qa。


## 2026-11-16 当前个性设置任务（开发及主要验收完成）

当前结论（优先于下方过程记录中的“待完成”）：本期四款竖屏布局、外观与大小设置、快捷比例、两种滑杆提交方式已开发；新增设置 UI 已按 Figma 最终复核。双账号同 origin 隔离、真实六张奥马哈整手、真实双公共牌、下注提交与未确认金额过期/刷新清理均已补齐。四布局 × 十二尺寸的 48 组组件压力检查通过；不是全部组合的实服或实体设备验收。职业横屏和第三套牌面按用户确认暂缓。未来 AI 批量换皮本期提供布局/外观配置与品牌隔离基础，不包含自动生成、批量审核和发布流水线。

剩余验证边界：实体手机性能/系统浏览器未验收；不刷新页面的短暂断网自动返桌仍未获得有效现场证据。本轮实际停止并恢复本地 H5 5174 服务后页面在大厅，手动入二道牌-16成功（第242–243手，已是旁观、座位2为空），金背/蓝桌布/经典/三项110%仍保留，没有旧加注面板。不能将它记为原桌自动恢复通过，亦不能归因于个性设置；测试含开发服务器重启及长时间断线。已正常离桌、关闭临时页并恢复视口。5174 当前只监听127.0.0.1，4179保持运行。最终 diff 检查通过，223/223串行回归通过，最新check、双Vite构建和types通过，只有既有大chunk警告。代码保留在kong，未提交/推送。

以下为过程记录，已被上述结论覆盖的旧待办不应重复视为当前未完成项。

- kong 未提交：四款竖屏布局、六款 Figma SVG 牌背、两套现有牌面、七色桌布、三项五档缩放、滑杆两种提交模式、账号/品牌偏好隔离已接入。用户确认第三套牌面尚未设计，本期只保留两套。用户进一步确认职业横屏尚未设计，本期暂缓；保留禁用提示和既有 auto 横屏适配，不将其列入本期必交付功能。
- 最新串行全量 223/223 通过，新增四套竖屏短屏本人筹码与导航隔离回归，包含 ActionControls 旧账号请求完成隔离、DemoHost 清除压力测试底池等最终改动。完整资源构建此前通过；本轮最终 `npm --ignore-scripts run build` 再次通过 check、两个 Vite 构建和 types（仅跳过未再改动的 atlas prebuild）。既有大 chunk 警告仍在。以后测试用 `node --test --test-concurrency=1 tests/*.test.mjs`，避免并发子进程。
- 离线 UI：375×500 四布局 × 2–9 人共 32 组头像边界检查通过；实际核对设置三页、六牌背、两牌面、七色桌布、三项 90%/110% 缩放、3/5 快捷按钮、六张手牌、双公共牌和长金额。另核对 390×844、768×1024、844×390、英文及 midnight 品牌隔离。这些是同组件演示数据，不是 32 组实服或像素级验收。修复短屏底部本人筹码被裁切、横屏快捷按钮拉扁及操作按钮重叠；压力测试重置同时清 pots。Figma 均衡/椭圆加注按钮覆盖本人头像属于设计。
- 第一账号真实二道牌-14（97870010）验证带入、弃牌、经典切均衡且继续原牌局、蓝色桌布/金色牌背及返桌恢复。第二账号真实进入 93511978 和保险-7（91870010），验证椭圆布局、紫色桌布、绿色牌背、第二套牌面跨桌及整页刷新恢复；两个账号使用不同 origin，所以不能以此代替同 origin 切账号隔离测试（后者现有单元测试通过）。
- 滑杆：离线两种模式均完成交互验证。早先在线 506.40 的确认提交被自动审批拦截，未提交；用户随后明确确认仅测试筹码、无实际金钱或奖励。2026-11-15 23:01–23:03 在真实 H5 保险-7（91870010）补齐：确认模式拖动后保留 269.30，实际点击确定，服务端第 271 手回显累计投注 289.30（含既有 20）并结算；松开模式第 273 手确认按钮隐藏，拖动松手后直接回显本人加注 376.10、筹码减少，继续翻牌至河牌。未伪造服务端消息。结束后恢复第二账号的确认模式、实际弃牌并站起（座位 2 变空），退出房间和测试页。
- 本轮重启临时 H5 时，原配置 WebSocket 使用局域网地址导致回环监听下连接失败；自动审批拒绝恢复 0.0.0.0 监听。已采用更安全的替代：仅修改 `/tmp/mx-h5-login-preview.config.mts` 中临时 WS 模板为 `ws://127.0.0.1:5174/mx-ws{0}`，两个临时服务均改为 127.0.0.1 监听，恢复在线验证。外部 H5 源码及环境配置未改。此次 CPU 采样约 25–34%，未重新跑构建或并发测试。
- 本轮按 CPU <85% 目标仅开一个测试页、低优先级服务和串行构建。在线采样约 21–36%，最终构建一次采样约 76%，结束降至约 47%；不是持续硬限流或瞬时峰值保证。关闭本轮 IAB 测试页，未新存截图文件，避免重新堆积。当前代码仍未提交/推送。
- 用户要求清理负载：已停止本次并发测试和新启动的 4179 Vite，关闭 Chrome 的 4179/5174/7456 测试页及部分 IAB 页面。清理 `/tmp/mx-*.png`、`/tmp/cc-*.png` 共 361 张约 272.5 MiB，所以下文这些临时截图引用已失效；仓库图片和用户最终交付原图未动。5174 也出现连接拒绝，继续前检查两个临时 Vite 配置和服务，避免多个预览及构建同时运行。IAB 错误页关闭受 URL 策略阻止，其他页面关闭曾超时，需重新盘点。


- 2026-11-15 后续多尺寸复核：用户取消 CPU 使用率限制，并要求兼容设计稿以外尺寸。修复初代及横屏双公共牌互相重叠、第二排侵入本人手牌，以及初代/经典短屏本人筹码侵入底部导航；经典整体收缩到导航上方，保持手牌、按钮、头像相对位置。四布局 × 320×400、320×480、360×640、375×500、390×844、430×932、768×1024、568×320、667×375、844×390、1024×768、1280×720 共 48 组，使用九座/六手牌/双公共牌/长金额/三项110%/五快捷按钮，DOM 检查两排公共牌、本人手牌、本人筹码与导航未相互遮挡；不是所有节点任意组合或所有物理设备的保证。320×400、568×320 实际核对设置固定标题、滚动底部颜色、三页设置、多池保险切池/放弃、二道牌投票拒绝、横屏加注面板；逐一操作三项90/95/100/105/110%。这些均为实际组件的离线场景，不能算实服多池验收。
- 本轮实际通过 CC 既有公开 H5 创建竞技场2测试桌“MX验收-布局双人”（91990138），0.1/0.2、两座、1小时、低水保险；MX 所挂 H5 是渠道包，原 canCreateTable 明确禁止创建，未修改外部源码。两授权账号新旧端同桌带入10，第1手双方全下，MX实际触发5 outs保险弹窗并加时，390×844完整显示；结束本人站起并离桌。创建桌未主动解散，可能尚在1小时时限内；另账号0筹码留座后关闭页面。小屏保险额外验收使用离线同组件，不混记为该手在线证据。
- Figma桌面 MCP取设计上下文返回访问权限错误，原生Figma可查看；全文件搜索职业/横屏只有设置文字及缩略图，已由用户确认本期暂缓。后续仍需完成新增UI对设计稿的最终逐项对照、真实六张奥马哈/二道牌与新布局组合、操作期间重连/过期的线上复核；不要将48组组件检查或222项测试写作全部在线验收完成。最新构建（跳过未改资源打包）check、两个Vite产物、types通过，保留既有大chunk警告。4179与5174回环服务保持启动，代码未提交/推送。

- 2026-11-16 凌晨补齐同origin账号隔离：在同一IAB页、127.0.0.1:5174内，第一账号均衡/蓝色/金背→正常退出→第二账号初次进入未继承这些偏好→第二账号改椭圆/紫色/绿背→正常退出→第一账号重新登录，设置仍为均衡/蓝色/金背，滑杆松开模式也保持。全程真实H5登录及空测试桌，未读取/注入浏览器存储；结束已离桌、关闭测试页、恢复浏览器视口。此前不同origin不足以验收该项的限制现已补齐。

- 2026-11-16 再对原生 Figma 设置弹窗（11955:50043）发现自定义底池比例仍为 CC 离散1/5–2倍，与设计10%–100%不符。改为1%步进百分比滑杆，新增按账号/品牌及3/5按钮模式保存的独立百分比覆盖；未编辑的旧档位原样读取，下注继续走 ShortcutBet 原金额规则。增加非法范围、79%金额、模式/账号/刷新/重置回归；最新串行223/223通过。真实二道牌-16（97990138）第164手观察99%按钮以底池70显示69.30，随后刷新仍保留99%；在加注面板调至全下180但未确认后刷新，恢复同手180筹码、正常操作栏，无旧加注面板或误提交。该项是整页重新连接验收，不等同网络瞬断恢复。

- 同轮真实二道牌-16第164手补齐未确认加注过期：调至全下180后未确认，下一街恢复正常操作栏，筹码仍180，旧面板自动关闭。第165手翻牌前全下460，实际出现二道牌投票，点击同意后2/2通过并发两排公共牌：2♥/K♦/Q♠/8♠/3♣与6♦/9♦/K♠/3♠/A♦；均衡布局390×844中牌列、底池、房间信息、本人手牌均未遮挡。结束站起围观并离桌，关闭验收页。当前两端构建及types通过（已有大chunk警告）；仍未提交。六张奥马哈实服组合与最终UI细节核对尚未全部完成，网络瞬断与整页刷新需区分。
- 用户授权额度不足时使用一次免费重置。查询时周额度99%、免费重置1次；额度工具只读，CUA明确禁止操作com.openai.codex，因此没有执行重置，也没有购买额度，已告知用户需在Codex界面手动使用。

- 本轮末确认竞技场2现有“演-保JP-32”（94390138）是奥马哈四张，已旁观核实，不能替代六张实服验收。随后CC7456第二账号正常登录成功，尚未创建六张测试桌；已关闭临时页，无新增桌或占座。最后额度查询显示周使用100%（ordinaryUsageAllowed仍true，可能有取整余量）、免费重置仍1次；没有声称已重置。待用户在Codex中手动使用重置后继续六张建桌及最终UI细节验收。

- 后续用户继续后查询额度已恢复0%、重置剩余0次（由账户外部操作完成，非工具执行）。真实创建“MX验收-六张奥马哈”（94890074），0.1/0.2、六手牌、两座、1小时、25秒、保险及额外玩法关闭。两个授权账号分别新旧端各带入10，第1手实际走完翻牌J♣6♠Q♣、转牌4♦、河牌A♦和结算；真实牌谱核实双方六张手牌、四轮动作、对手+0.2本人-0.2。新端竞技椭圆→经典、全部110%、五快捷按钮、375×500实测未遮挡，房间与牌局不重建。结束双方站起并离桌；创建桌按1小时时限保留，未主动解散。
- 最终原生Figma设置三页复核：修复提交方式被旧按钮样式覆盖而亮底黑字的问题，恢复灰底白字/绿色选中圆环；去掉设计没有的音效卡片红色感叹号。440×782和320×400实测通过，设置页保持固定标题与滚动；本期仅两牌面、职业横屏禁用已由用户确认。此后check、双Vite构建及types再次通过，行为回归仍为最近223项。

更新：2026-11-12。新机器继续开发时先读本文件、README.md、docs/entry-flow.md，再核对代码和当前 git status。这里是唯一的 AI 交接文档，不另建 agent.md / AI.md。用户后续指令优先。

用户最新分支约定（2026-11-13）：统一在 `kong` 分支开发，不再新建任务分支。此前 player-info-dialog、second-board-insurance、squid-gameplay 的提交统一保留在该分支历史中。

## 1. 工作范围与外部引用

真正修改的项目是 **h5-mx-game（MX）**。旧会话工作目录常在 h5-cc-game，不能因此把修改写回旧项目。

以下均是外部引用；迁移机器后用户会提供实际位置，路径未确认时先查现有目录、package.json、锁文件和 .gitmodules，再向用户询问缺少的路径。不要把旧机器绝对路径写入业务代码，也不要为了恢复环境重写外部项目。

| 引用 | 作用与约束 | 当前记录（仅定位参考） |
| --- | --- | --- |
| h5-cc-game | 业务逻辑、协议、prefab、设计资源和动画的核对基准；只读参考 | 旧机器 `/Users/magicd/repos/github/h5-cc-game` |
| h5-game | 外部 Vue 大厅、登录、HTTP/WS 外壳及 bridge 宿主；原样使用，不改源码和环境配置 | MX 跟踪的 `deps/h5-game` 源码副本；上游 `git@github.com:soolary/h5-game.git`。不是有效 submodule，历史提交不能代表当前副本版本 |
| h5-cc-i18n | 正式多语言词库；沿用其 key、locale 与运行时 | `@silenthill/h5-cc-i18n`，`github:guysoup027/h5-cc-i18n#46f6c805dd2144e0c7fb8b7bd9486f3ed8edc437` |
| agreement-web | protobuf 协议、Code/Def、消息编解码 | `@silenthill/agreement-web`，`git+ssh://git@github.com/kingofake/agreement-web.git#921be247732066cdae55477ce3a81c29fbbb6b6c` |
| h5-cc-bridge | 外壳侧桥接依赖；MX 通过自己的 HostTransport 适配现有契约 | H5 package.json 引用 `@silenthill/h5-cc-bridge` / `github:soolary/h5-cc-bridge#main`，不是 MX 新建 WS 的理由 |

MX 旧机器路径是 `/Users/magicd/repos/github/h5-mx-game`。上表提交仅记录本次状态，实际版本以仓库锁文件和当前 Git 跟踪状态为准；不要擅自升级依赖。用户明确要求参考 CC，**不要参考 h5-px-game 或 CC 下的 pixi-client 作为旧版基准**。外部 `dev/h5-game` 若由用户提供，也必须保持原样。

## 2. 必须保留的架构约定

- TypeScript + HTML DOM，完整 UI 包在 `mountMxGame(container)` 创建的 DIV 内，可整体迁移。不要引入 Cocos / Pixi / Canvas 游戏引擎，不使用 mountCcGame 等新接口名。
- 数据、逻辑、UI 分层，尽量一个文件一个 class。座位、头像、手牌、公共牌、投注、底池等可单独替换 UI。
- 尽量复用用户人工审核过的 CC 代码，优先迁移原方法、字段和分支，不为改名或抽象而重写逻辑。金额处理沿用 StringHelper、ChipFormatter、BringInRules 等；整数金额到显示金额的比例和 ShowBB 都不能另造算法。
- 消息保留 `src/net/messages/texas/TexasMessageHandler.ts` 的 switch 和同名消息函数。不要迁入 `logic/messages`，不要另起 Router / XxxHandler 层。
- WS 回调更新房间数据，再经 `@observable` / `@bindEvent` / BindingScope 定向刷新组件。不是全局广播，也不是每次消息重建整个桌面。销毁、切桌、重连需要解绑与隔离旧异步结果。
- 配置项读取实际房间 basicInfo/协议字段和 roomPermissions。`GameplayTableSettingData` 是每个房间的定向数据源；相同配置不重复发事件，列表保留节点与滚动位置。不要在 UI 里硬编码功能已开/已关。
- HTTP 由 MX 直接请求，地址/超时只在 `src/config/HttpConfig.ts`，当前测试地址 `https://test2.awanptest.com/api`。身份来自 H5 同步，不能把账号、密码、token 写入文档、代码或日志。
- **WS 全部走 H5 bridge**：发 `wsSend`、收 `wsMessage`、监听 `wsReconnected`。不在 MX 配置 WS 地址，不创建 WebSocket。H5 外壳已有登录及服务器配置，不要另造 integration 外壳。
- 保留兼容桥接名 CocosBridge、ccReady、h5Ready、ccAck，它们是外部协议名，不是依赖 Cocos 引擎。曾出现登录一直转圈，排查必须包含 ready/ack 握手；不要擅改 H5 登录请求或取消客服接口来掩盖问题。

## 3. 入桌主流程与支持边界

1. Vue 挂载时调用 mountMxGame，立即开始隐藏预加载，不等点击房间。
2. 安装 bridge 并发 ccReady / 应答 h5Ready。H5 持有登录态和 WS，发送 syncUser / syncToken / enterTable。
3. 点击房间显示加载页，等资源真正加载、解码完成后发 Rooms(202) → EnterRoom(1002)，再根据服务端数据渲染牌桌。
4. 后续增量消息更新数据；重连发 SyncEnter(1025)，按完整快照恢复，不重播历史发牌动画。
5. `PreviewConfig.minimumLoadingMs=0`，用户已要求取消用于看加载页的 10 秒等待。

`RoomEntryPolicy` 当前允许 **2–9 人德州、四/五/六张奥马哈和 6+ 现金桌**；不要再加“只允许 9 人桌”的限制。默认竖屏，也提供 auto 横竖屏布局；横屏导航在右侧占满高度，竖屏导航在底部。MTT 已接独立赛事入口及桌内状态，但尚无正在进行的赛事完成在线验收；加密牌仍未接入。

普通俱乐部钱包的坐下、买入、返场、补充、站起、带出、留座已接入。视频/人脸验证桌坐下仍有明确未支持分支；其他钱包等不能因为配置/战绩里有展示就声称业务已完整。普通德州经典保险的本轮迁移与验收边界见第 8 节。

## 4. UI 核对规则与已实现内容

- 对照 CC prefab、原素材、真实牌桌截图，核对头像、昵称、筹码图标、桌布、卡背、座位朝向与牌的位置，不能用示意图替代真实流程验证。
- 发牌、弃牌、过牌、坐下座位位移用 CSS/Web Animations；倒计时是头像光圈。亮牌时保留牌型高亮、不参与的牌变暗且遮罩保持牌的圆角。
- 背景、原牌背、动态图标应使用 CC 资源；俱乐部 logo / 头像来自网络 URL。不要把俱乐部图标当固定资源。
- 所有模态窗口共用 `src/table/dialog-glass.css`：**只在弹窗打开时**用约 50% 黑色蒙版压灰桌面，关闭恢复；多层窗口避免重复加深。玻璃中心保持透明，少量 backdrop-filter，较大圆角和扩散边缘光晕。
- 菜单是例外轮廓：从左滑出，原图 `assets/textures/scene/table/sidemenu/sideMenuBg.png` 四角非对称，不可强制统一为规则圆角矩形。当前用独立的椭圆圆角参数近似原图，仍需真人视觉核对。
- 战绩左贴边，牌谱右贴边；约 240ms 滑入，保留贴边形状。标题/底部栏固定，长内容在内部滚动；切前后手不能整体抖动。战绩包含只显示桌面玩家和横排观众；牌谱包含钻石余额、翻页滑条、详情、街道、Showdown、SB/BB/UTG 等标识。
- 个性设置顶部标题/tab 固定，下面内容滚动；空间够则居中，不够则适配高度，不能拉伸牌面/桌布缩略图。
- 买入安全提示、配置读取 CC 真实字段与权限，包含红色警示、重要/额外功能、CallTime、只读开关、说明与滚动。`SpriteAtlas.paintWarning` 为原图内部透明感叹号补白，外侧保持透明。
- 表情面板、17 个原版表情 Spine、按需资源、道具资格/消耗、bridge 1019/1121 自身回声去重已经接入代码；不能因此宣称所有真实服 UI 已验收。
- 普通德州坐下后的操作已补齐 STRADDLE、自动操作预选、加时、补盲确认、摊牌选牌；头像和操作栏显示等待、留座、托管等状态，返座沿用原买入条件。后续二道牌与经典保险已另开分支迁移，见第 8 节本轮记录。
- 测试入口统一为一个 DEV 下拉菜单（语言、WIN/ALLIN 等），不要重复浮动按钮互相遮挡。没有进入牌桌就随机播放 ALLIN 的逻辑，仅手动测试按钮触发。
- 用户要求测试时关音乐：当前 DEV 的 TableView 强制初始 soundOn=false；音效/表情声音也受统一开关控制。非 DEV 和旧的本地偏好需要单独核对，不要承诺永久全局静音。

## 5. Spine 与资源

- DOM 主体不变，Spine 用松耦合透明 WebGL Canvas，分座位特效、桌布、表情渲染器；不引入游戏引擎，不采用视频替代动画。
- 已有 WIN、ALLIN（本人/他人不同资源）、动态桌布和表情。WIN/ALLIN 播放后停最后一帧，沿 CC 清桌/下一手逻辑清理；位置需要对照自己和他人座位，WIN 要稍盖头像。
- Runtime 固定在 Spine 3.8；来源、许可证及兼容补丁在 `src/effects/spine/vendor/README.md`。WebGL clipping 给 Cocos core 显式传 stride=2，否则部分表情没有几何；不可随意删改补丁或升级 runtime。
- `npm run dev` 使用散图；预加载保留解码对象，进度与实际资源加载同步。`npm run build` 通过 prebuild 合并 UI/牌面 atlas 和桌布产物，减少 HTTP 请求。不要每次改样式先重做 atlas。
- `src/assets/image-sources.json`、`emoji-sources.json` 记录 CC 来源；`npm run assets:import -- <CC目录>` 复制对应原资源，不生成 atlas。
- 严格分开资源与代码：`src/assets` 只放素材、图集和资源清单，不放 TS/JS/CSS；代码目录不放图片、音频、字体或骨骼素材。所有 Spine 素材统一在 `src/assets/spine`（win、allin-self、allin-other、desks、emoji），表情音效在 `src/assets/audio/emoji`。加载/渲染代码保留在 `src/effects/spine`，LoadingAssets 在 `src/core`；vendor runtime 与许可证仍是代码依赖。沿用原 Spine atlas，不与 UI 图集混打。素材无需原始 Spine 工程即可播放已有导出数据。
- 图片/音频/字体/`.skel` 由根 `.gitattributes` 走 Git LFS；`.json`、`.atlas`、SVG、源码仍作为普通文本。

## 6. 国际化约定（用户已确认）

正式来源是外部 `@silenthill/h5-cc-i18n`。`i18nMgr` 保留语言别名、共享运行时和 DOM 实时刷新；任何页面要能随时切换语言。

目前允许临时保留 `src/i18n/supplement.ts`（61 个 MX_* 词条，本次记录），以后由用户统一更新进 i18n 项目再移除。现有文案优先复用 CC 的 key，不要继续复制一份；确实新增的临时放 supplement。当前 Get 查询顺序是 supplement → 共享词库 → fallback，后续迁移时核对覆盖优先级。

## 7. 新机器恢复步骤

1. 用户提供 MX、CC、H5、i18n、agreement 等外部目录后先核实。MX 的 Git/npm 操作必须在 MX 根目录，切勿因工具 cwd 在 CC 就改错仓库。
2. 安装 Node >=22.12、npm、Git、Git LFS；准备私有 GitHub SSH 访问权限。MX 用 npm ci 和现有 package-lock；H5 按自己的 packageManager/锁文件安装（本次为 pnpm@11.18.0），不要为升级包管理器擅改外壳。
3. MX clone 前本机运行 `git lfs install`；clone 后执行 `git lfs install --local`、`git lfs pull`、`npm ci`。根仓库 LFS 配置不自动替子模块配置 LFS。
4. `npm run check`、`npm test`、`npm run build`。生产客户端在 `dist/client`，须整目录连同 chunk/资源/CSS 分发，不能只拷贝 mx-game.js。
5. MX 开发资源服务：`npm run dev -- --port 4179 --strictPort`。Vite 配置本身没有固定 4179；不要误称 npm run dev 不带参数就必是该端口。
6. 主流程入口使用真实 H5 的大厅/登录并挂载 MX。**MX 根 `/` 和 `/entry-preview.html` 是演示/离线回放，不是在线验收入口**。
7. 旧机器本次主流程 H5 是 `http://127.0.0.1:5174/#/club/index`（也有 #/home、#/gameList）；CC 用户提供入口是 `http://localhost:7456/#/home`。端口和路径只是本次环境，不能假定新机器仍然一致。
8. 登录态属于浏览器存储/内存，不随 Git 或本文件迁移。换机器重新登录；同账号新旧版排他登录，需交替查看。用户已确认所测筹码仅测试、无兑换或奖励。不要把历史账号密码写进文档。

### 当前 H5 主流程启动配置（跨机器必须关注）

旧机器 5174 服务实际用的是 **临时 Vite 配置 `/tmp/mx-h5-login-preview.config.mts`**，从 MX 的 `deps/h5-game` 目录启动，mode=production。它没有修改 H5 外壳，借 Vite 插件注入 MX 容器和 entry，再从 4179 动态导入 `/src/host-entry.ts`。文件名带 preview，但它挂的是**真实 H5 登录/bridge/服务器主流程**，不同于 MX 的离线 entry-preview。

这个 `/tmp` 文件不会随 Git 迁移。下方保留它的工作方式用于在用户确认新路径后重建临时配置；不是要求新增 integration 目录或改外壳。先 npm run build，原配置会读取 dist/client 的 manifest。恢复时将 `<H5_ROOT>` 和 `<MX_ROOT>` 换成用户给出的绝对路径，并核对新 H5 版本仍有这些入口导出。

```ts
import { readFileSync, createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import shellConfig from '<H5_ROOT>/vite.config.ts';
const shell = '<H5_ROOT>';
const client = '<MX_ROOT>/dist/client';
JSON.parse(readFileSync(client + '/.vite/manifest.json', 'utf8'));
export default async env => {
  const original = await shellConfig(env);
  return { ...original, root: shell, plugins: [...original.plugins, {
    name: 'temporary-mx-login-preview',
    resolveId(id) { if (id === '/mx-preview-entry.js') return '\0mx-preview-entry'; },
    load(id) {
      if (id !== '\0mx-preview-entry') return;
      return `import '/src/entry/cocos-h5-entry.ts';
        import router from '/src/router/index.ts';
        import { pinia } from '/src/stores/pinia.ts';
        import { useLoginModalStore } from '/src/stores/loginModal.ts';
        const { mountMxGame } = await import(/* @vite-ignore */ 'http://127.0.0.1:4179/src/host-entry.ts');
        const game = mountMxGame(document.getElementById('mx-table-host'), {layout:'portrait'});
        window.addEventListener('pagehide', () => game.destroy(), {once:true});
        await router.isReady();
        if (new URLSearchParams(location.search).get('login') === '1') useLoginModalStore(pinia).open();`;
    },
    configureServer(server) {
      server.middlewares.use((req,res,next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/mx-client/')) return next();
        const file = resolve(client, decodeURIComponent(pathname.slice('/mx-client/'.length)));
        if (!file.startsWith(client + sep)) { res.statusCode=403;res.end();return; }
        try {
          if (!statSync(file).isFile()) throw Error();
          res.setHeader('Content-Type', ({'.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'})[extname(file)] || 'application/octet-stream');
          createReadStream(file).pipe(res);
        } catch { res.statusCode=404;res.end(); }
      });
    },
    transformIndexHtml: {order:'pre',handler(html) {
      return html.replace('</head>', '<style>#mx-table-host{position:fixed;inset:0;height:100dvh;z-index:1;pointer-events:none}#mx-table-host>.mx-game{pointer-events:auto}</style></head>')
        .replace(/<body>[\s\S]*<\/body>/, '<body><div id="mx-table-host"></div><div id="app"></div><input id="OpenImageFile" type="file" accept=".png,.jpg,.jpeg" hidden><script type="module" src="/mx-preview-entry.js"></script></body>');
    }}
  }] };
};
```

从用户提供的 H5 根目录运行（先安装其依赖）：

```sh
pnpm exec vite --config /tmp/mx-h5-login-preview.config.mts --mode production --host 127.0.0.1 --port 5174 --strictPort
```

这份临时配置依赖外部 H5 的入口结构，不保证其他版本直接兼容。若用户已有可用 H5 挂载入口，优先用该入口。不要将“直接 pnpm dev:h5”误写成已包含 MX 挂载，当前 H5 源码里没有这项注入。

### 单命令联调（补充）

从 MX 仓库运行 `npm run dev:h5`。默认使用已安装依赖的同级 `../h5-game`，也可通过 `MX_H5_ROOT` 指定其他 H5 工作区。打开 `http://127.0.0.1:5175/#/home`，点「扑克专区」进入真实牌桌。

`scripts/dev-h5.mjs` 复用 H5 的 Vite 配置，在 HTML 中注入 MX 容器并加载 `src/host-entry.ts`。H5 持有 WebSocket，联调服务将 `/mx-ws:端口` 转发到 H5 测试服；MX 通过已有 bridge 收发。单命令流程默认监听本机 5175 和 4180，使用独立的 Vite 缓存，可与双终端流程的 5174 和 4179 同时运行。若通过 `MX_H5_PORT` 覆盖大厅端口，并行使用时请选择空闲端口。

## 8. 验证记录、未完成项与下一步

- 最近全量回归：**154 项通过**；TypeScript check 和完整 build 通过。新增一手牌消息回放测试覆盖起手、操作、翻牌、赢家和清桌，并验证开局参与者从等待状态恢复正常。
- 2026-11-12 对照 CC UIConfirmDialog prefab 修复弃牌时可让牌的确认窗：共用确认弹窗外观与蒙版，使用旧标题、提示文案、按钮素材与顺序；玩家资料里的管理确认复用同一外观，赠送钻石按旧代码点击金额直接发送，不弹确认。按 CC 的 PokerUtil/PoerkCard 数值算法显示本人翻牌后的牌型，折牌、遮牌、清手隐藏；结算看牌背景依 prefab 水平翻转，加时左贴边、结算看牌右贴边，完整显示各自一端平、一端圆的胶囊。Chrome iPhone 12 设备模拟中核对了确认操作、牌型和贴边矩形；真实服务端的这些场景仍待在线复核。
- 2026-11-12 移除“返回游戏”取带入信息时短暂出现的加载窗：请求期间保持关闭，确需带入时才展示窗口；移除站起成功后额外的悬浮提示以及带入按钮临时“正在提交”文案。赠钻恢复 CC 的 3×2 金额选择、直接请求、132 广播和原 diamond2 Spine 飞行效果；All-in 胜率按 CC 服务端计数在公共牌/亮牌/重连时更新，仅本人座位展示，清手移除。153 项测试和构建通过；Chrome iPhone 12 设备模拟验证了返场窗口隐藏、赠钻面板与原 Spine、胜率位置。赠钻实服交易和真实 All-in 牌局仍待现场验收。
- 2026-11-12 进一步按 CC BetButton、UIOperation、UIOtherBndings prefab 还原快捷下注圆形底图/比例/金额牌、加注拉杆白色金额气泡及原滑块、加时和结算后按钮的黑色双行底图。Winner 后按房间配置和权限查询 1029 次数并取价，偷偷看发 1026，发发看发 1013 并把回包公共牌追加到当前手；切手、清桌和离桌清状态。新增协议回放测试，模拟桌进行了 500×800 UI 核对；真实 H5 已重新入桌，但未在真实服务端看见适用配置的结算按钮，仍需现场完成在线购买验收。
- 2026-11-12 对照 CC 375×500 预览修正了牌桌高度/座位、普通桌底栏三按钮、语音桌四按钮和视频/人脸桌六按钮的配置分支，房间 logo 从 H5 同步的俱乐部资料取值。自己操作按钮、快捷下注、自动操作按钮改用 CC 资源及相对坐标；竖向加注拉杆沿用 CC 滑轨图，底端最小加注、顶端全下，在模拟桌验证了金额与进度同步。浏览器启动参数 `--mute-audio` 已核实。最新视觉仅是模拟桌与普通在线桌的局部对照，语音/视频桌和在线整手牌仍需现场验收。
- 2026-11-12 继续核对旧 `UIOperation.prefab`、`UITexasTableSeat.prefab`、`BetButton.prefab` 和用户提供的两张旧版截图：去掉操作提交提示层；StartInfo 将发牌玩家状态设为 NORMAL；偷偷看由 `MSG_S_SHOWCARDS` 更新桌面手牌，仅结算画面过期后提示查看牌谱；加注确认用旧文案，点遮罩可取消。加注拉杆按 CC `Operation.adjustPostion` 跟随本人座位上方 910 个设计单位，蒙版按旧节点 30/255 透明度，金额气泡在拖动后出现。快捷下注金额底图按原素材 alpha 和节点 135/255 透明度绘制。“返回游戏”使用旧贴图、字号与座位相对坐标，并补留座头像遮罩、青色计时圈和秒数。早先旧版黑屏是自动化浏览器只拉伸桌面视口造成的误判；改用 iPhone 12 设备模拟（移动 UA、390×844、DPR 3）后旧版和新版牌桌均正常显示，两个测试账号分别登录；新版保险-3真实牌桌已验证坐下、操作区和加注位置。留座按钮/偷偷看还未在真实服务端触发，位置样式仅按旧截图和新桌面视觉模拟核对，不能称这两项在线验收完成。
- 2026-11-12 加注面板再按旧 `_onRaiseClicked` 调整：只隐藏加注入口，快捷下注、弃牌、让牌/跟注和加时保留在遮罩下方的原座位位置；遮罩拦截下层点击，点击空白处取消并恢复加注入口。移动设备演示桌已核对加注前后可见性与取消状态；本次未重新等待真实服务端轮到自己。
- 一次并行测试出现现有 lifecycle 的 80ms 计时边界失败，串行 `node --test --test-concurrency=1 tests/*.test.mjs` 复核 119 项通过。不要无关修改业务以掩盖定时器抖动。
- 真实 H5 主流程已进入 10/20 二道牌桌，验证返桌坐下、补盲/等待状态、自己的过牌和加时价格显示。随后服务器以 1114 消息 reason=6 令客户端离桌，未完成在线整手对局；这部分仍需真实牌局验收。
- 近期 Codex 内置浏览器读取连续超时，**最新弹窗、菜单轮廓和表情在线视觉效果尚未完成自动现场验收**。用户截图提供了修改依据；不能把构建/协议测试通过说成像素对齐或真机性能验证。
- 原 docs/qa 图片是各阶段历史截图，其中包含演示场景，不等同当前服务器截图。原剪贴板图在旧机器临时目录，不会随仓库迁移；需要时请用户重新提供参考图。
- 继续优先在线核对：安全/配置弹窗权限与状态、所有窗口蒙版/玻璃、非对称菜单、窄屏/横屏滚动、战绩/牌谱详情与固定页脚、表情实际收发、WIN/ALLIN 位置/最后帧/清理、动态桌布及静音。
- 配置已列出并不代表相应游戏玩法已支持。MTT/其他游戏、加密牌、视频/人脸坐下、非俱乐部钱包以及 EV 保险等业务必须单独按 CC 逐项迁移。
- 用户偏好在真实主流程逐项测试，有问题再询问；不要要求安装额外浏览器插件来替代本来使用的内置浏览器。浏览器失败如实报告。
- 旧阶段已按用户新指令提交为 `c39a22a`；本次坐下后操作阶段尚未提交或推送。以后继续时重新检查 Git 状态，不把历史描述当成永久状态。
- 2026-11-12 更正偷偷看协议：旧版实际链路是 1026 购买回包 → 1127 ShowViewCards 对手亮牌，不是 1101 Showcards。旧版第 190 手实测点击前对手手牌为空、点击后填入；新版已迁入同名 ShowViewCards 与原消息 switch，跳过本人/空座/已离桌玩家。移除先前误加的同手 1018 牌谱回填。相关 11 项测试通过。弃牌确认统一 TableConfirmDialog；跨域 H5 图片采用基于 import.meta.url 的绝对地址，真实第 157 手已截图核对。
- 1127 修复后真实 H5 第 213 手已完成点击偷偷看验收：收到 1026 → 1127，三个对手头像均显示手牌，截图 /tmp/mx-live-peek-1127-fixed.png（临时文件不随 Git 迁移）。此前将偷偷看归因于 1101、推断服务端未下发手牌的结论作废。

- 2026-11-12 从 `codex/player-info-dialog` 的 `81e5e8d` 新建 `codex/second-board-insurance`，本轮未提交/推送。新增原名消息 1122/1123/1022、1115/1116/1015，1131/1030 保留 CC 空实现；二道牌状态、经典保险状态及原金额计算分离，UI 共用 DialogSurface 九宫格边框、SpriteAtlas 和 CardView。旧项目只读，H5 外壳未改。
- 本轮真实 H5：两个测试账号分别登录新旧 10/20 桌；新旧同一手二道牌投票成功并发出两排公共牌，另验证新版拒绝后关闭；新版保险实际加时成功（1014）、购买 1/3 档收到成功 1015 与非空 1116，另观察超时确认和自动背保。未通过伪造服务端消息进行在线验收。多底池、强制最低投保等代码已按 CC 迁移和计算测试，但本次真实牌局未触发这些配置分支。
- 浏览器使用静音 Chrome 设备模拟。旧版曾在切换设备模式后保留 1434px 画布、导致手机截图只有桌布；在移动模式下重新加载后画布回到 390px 并正常显示。375×500 必须同时启用 CDP mobile 和 touch；单独 agent-browser set viewport 会关闭触控模拟，不能据此宣称移动端验收。新版二道牌 375×500 实测窗口 bounds=(51.95,93.75,271.09,312.5)，未越界。
- 本轮截图（临时文件，不随 Git）：旧保险 `/tmp/cc-insurance-live-panel.png`，旧投票 `/tmp/cc-second-pcs-vote.png`，新旧同手第二排发牌 `/tmp/mx-second-full-board.png`、`/tmp/cc-second-full-board.png`，新版手机投票 `/tmp/mx-second-375x500-verified.png`。普通尺寸截图对照后修正了弹窗比例、圆形投票头像、黄色倒计时、保险金额按钮及加时圆环。157 项串行全量回归、TypeScript check、host Vite 构建通过；大协议 runtime chunk 的既有警告仍在。
- 新版保险也在 375×500、mobile=true、touch=5 的真实牌局截图 `/tmp/mx-insurance-375x500-verified.png`：窗口 bounds=(41.77,6,291.45,488)，完整显示全部按钮，点击放弃正常关闭。购买中气泡不再被 ALLIN 隐藏，特殊弹窗打开时隐藏 DEV 菜单；保险标题复用旧 prefab 的 `UIInsurance_zhuchi` 和 `adaptation10179`，排序使用圆形选中标记。最终相关 19 项回归通过，多底池/强制最低投保仍需真实服补充验收。
- 2026-11-13 对照用户提供的 Figma `T8R5QTx2OHl8zCqxoW8FkO / 11903:32385`，修复六档金额胶囊与按钮上下分离：金额绝对定位覆盖按钮上边缘，沿用 CC 按钮资源，胶囊使用设计稿绿色渐变/细边框。静音 Chrome iPhone 12 模拟截图 `/tmp/mx-insurance-embedded-amounts.png`、`/tmp/mx-insurance-second-pot.png`。使用真实 InsuranceView 加隔离两池数据验证切换、金额/outs 更新、第一池 confirm=false 自动进第二池、末池累计两条记录 confirm=true 并关闭；这是组件测试，不是实服多底池验收。临时测试页已删除，未提交/推送。
- 2026-11-13 为 MX 根演示入口补充 DemoFeatures 本地数据源，通过现有“测试”菜单提供单池/多池/强制最低投保、二道牌投票、加时、结算看牌、留座返场和重置。保险/投票共用在线组件，仅将其依赖收窄为 SpecialOperations（房间数据及配置），没有伪造历史/玩家资料 API。真实 H5 不传 demoScenarios，不显示这些数据修改按钮。修复演示页 CSS 将手机端 details 测试菜单一并隐藏的问题。Chrome iPhone 12 静音模拟已点击验证保险加时/逐池购买/放弃、二道牌同意/拒绝、偷偷看亮牌、发发看补两街、加时及返回游戏；TypeScript check 和 5 项相关测试通过，包含重置/离桌隔离延迟投票回调。截图 /tmp/mx-demo-insurance.png、/tmp/mx-demo-second-board.png、/tmp/mx-demo-peek-reveal.png 均为演示数据，不是实服截图。未提交/推送。

- 2026-11-13 按用户新要求替换保险逐池提交：InsuranceChoices 按 potId 保存档位，切换不丢失，购买一次提交全部池且 confirm=true；放弃/超时保留强制最低投保规则。结算看牌按钮文字与价格提升至原背景上层，修复暗色遮盖。记分牌 goldType=3 迁入朋友/内部桌直接带入、跳过钱包余额/自动充值、正筹码直接返桌与零筹码重新带入，仍共用原带入组件与协议。
- 本次真实 H5 在竞技场2的 0.1/0.2“主持词V型的牌桌”，两个授权测试账号均成功带入；第4手全下触发保险，实际切换数字/图形排序、加时及购买，收到 1115、1014、成功1015与非空1116。数字序列黑桃3/红桃3/梅花7/红桃7，图形序列黑桃3/红桃3/红桃7/梅花7，与 CC 算法一致。静音 Chrome iPhone12 截图 /tmp/mx-score-bringin-live.png、/tmp/mx-score-insurance-live.png。本次两人桌仅一个可保险池，多池联合购买只完成逻辑及演示交互验证，不能称实服多池验收。未执行完整构建，未提交/推送。

- 2026-11-13 已按用户要求提交前阶段为 `8a7d6e2` 并推送 `origin/codex/second-board-insurance`（含 LFS）。从该提交新建 `codex/squid-gameplay`，鱿鱼阶段暂未提交/推送。
- 鱿鱼迁移：新增房间 SquidData、原名 SquidIn(1125)/SquidInActive(1024)/NextChange(1126)，接入原 switch；StartInfo/Seated/SeatedOthers/Winner/SyncEnter 保留参与、数量、逃离、总数与加入资格。经典及血战剩余数沿 CC 规则，清手不清鱿鱼轮，重连静态恢复不重播。Winner 按 EHC_SQUID 和离桌罚金生成结算，沿原倍率表；ChipsChange 同步本人存筹码。新 SquidView 复用 DialogSurface/TableConfirmDialog，使用 CC 原图、开始动画2秒原时序、3页说明/不再提示、5秒结算自动关闭；菜单站起与玩法站起共用入口。修正配置鱿鱼价值来源和跨端口资源绝对地址，新增资源仅在 assets/raw/squid 并记录 ccSources。
- 静音 Chrome iPhone12：新旧同入竞技场2 10/20“一直经典鱿鱼-1”，新版两次实际带入（含押金），第203手前点击加入收到成功1024和1125；观察本人数量0→1、遮罩消失及包含本人+1的轮次结算。真实结算截图 `/tmp/mx-squid-settlement-layout.png`，原版参考 `/tmp/cc-squid-before.png`，资源修复后的说明 `/tmp/mx-squid-intro-fixed.png`。375×500 同一CDP会话 mobile=true/touch=5，说明窗 bounds=(35.16,23.44,304.69,453.13)，截图 `/tmp/mx-squid-mobile-verified.png`。浏览器截图均为真实H5数据，临时文件不随Git；旧Canvas触摸未成功关闭说明，最后调用已定位的原按钮click事件关闭，没有伪造服务端消息。
- 本轮 TypeScript check 与18项相关测试通过，涵盖加入消息、两模式剩余数、结算、旧手过滤、重连、开局资格、保险/带入/设置回归；未做完整构建。血战专属离桌/倍率、头尾鱿鱼等配置未在经典测试桌逐项实服触发，不能宣称这些分支实服验收完成。外壳LOG按钮可能挡住左侧站起入口，未修改外部H5源码。
- 2026-11-13 鱿鱼 UI 复核：共用 dialogConfirm 按 CC sprite-frame 九宫格绘制，保留随按钮高度缩放的端部；加入游戏改回 table_bg_jkp_pool 原图，站起围观使用 table_bg_stand_up 并置于鱿鱼图标下层，390/450 高度与加入按钮位置沿用 MorePlayTypeInfo 的 suggestScale 分支。分页当前条完整绿色；座位 SquidMask 恢复 150×108 且低于亮牌；结算大图放在列表下方，负金额行恢复原尺寸的 squid_lose，姓名/ID 左对齐。TypeScript check 和相关 18 项测试通过。静音 Chrome 手机模式真实 H5 登录/坐下，捕获三人鱿鱼结算（负金额爪子可见），实际点击偷偷看后对手手牌可见；375×500 mobile+touch=5 弹窗 bounds=(35.16,23.44,304.69,453.13)。加入游戏的最终外观使用组件演示截图核对，本次未重新触发真实中途加入按钮。截图 /tmp/mx-squid-live-result-fixed.png、/tmp/mx-squid-live-cards-fixed.png、/tmp/mx-squid-intro-375-fixed.png、/tmp/mx-squid-join-layout-fixed.png 均为临时文件。当前修复未提交。

- 2026-11-13 分支整理完成：此前鱿鱼代码及 UI 修复提交为 `8dfa82f`，所有任务分支合并到原 player-info-dialog 后改名 `kong`，已推送 origin/kong（含 LFS）；删除远端 player-info-dialog、second-board-insurance 和对应本地任务分支。保留 main；后续均在 kong 开发，不新建分支。
- 蘑菇/暴击迁移：新增 MushroomData、CriticalHitData 定向状态，EnterRoom/SyncEnter 静态恢复，StartInfo 按 CC 更新池和开场标志；清手保留蘑菇池，零池消息沿 CC 忽略。MushroomView 按旧坐标、左右朝向和 0.6 秒 cubicOut 随庄位转移；参与/押金沿原 Player 字段及已有带入、Winner、ChipsChange 通路。玩法引导共用 GameplayGuideDialog/DialogSurface，使用原素材、词库与不再提示。暴击动画按 critical_hit_start.anim 原 2 秒缩放/淡出，不以 ante 推断服务器开场标志。演示菜单增加蘑菇和暴击，重置/离桌取消延迟回调。
- 真实验证：静音 Chrome iPhone12，两个账号分别进入旧/新竞技场2的 0.2/0.4“蘑菇+暴击-1”（97204042）。满座时按用户授权通过管理弹窗移走占位玩家并实际坐下，带入 4 + 押金 0.20；第121–124手实际操作并收到公共牌与1112结算。观察蘑菇池 2.60→2.70、庄位转移及 EHC_MUSHROOM out=10；第124手 allBet=400、玩家扣40并直接进入翻牌，后续完成三街和结算。所观察 StartInfo 的 criticalHitOpen 均为 false，旧版运行时同为 false，故不能声称真实服暴击开场动画已验收，也未强行改判定。测试末尾通过站起围观退出座位。
- TypeScript check 与 15 项相关测试通过（蘑菇/暴击、鱿鱼、特殊操作、演示；新增演示延迟隔离用例单独复核），未跑完整构建。375×500 使用 CDP mobile=true/touch=5，暴击引导 bounds=(44.27,58.87,286.45,382.25)，完整显示。真实截图 /tmp/mx-mushroom-seated.png、/tmp/mx-boom-live-action.png；组件/演示截图 /tmp/mx-mushroom-guide-final.png、/tmp/mx-boom-guide-375.png、/tmp/mx-boom-animation-demo.png；临时证据 /tmp/mx-mushroom-boom-live-evidence.json。临时文件不随 Git。当前蘑菇/暴击阶段未提交/推送。
- 2026-11-13 钱包/换人清理修复：prepareSeat 原先无条件按入口 clubID 过滤钱包，普通联盟桌也被错误限制；现仅渠道包沿 CC 限制入口钱包，普通桌保留接口钱包及返桌钱包匹配。真实授权账号从竞技场2进入蘑菇+暴击-1，接口钱包 club_id=49、入口 clubID=49、channel=false；本次未复现原报错，不能断言此前报错唯一原因。修复后点击真实空座按 return_table 自动返桌至5号位，筹码9.30，截图 /tmp/mx-wallet-return-fixed.png；之后已点击站起结束测试。
- 座位头像和导航logo改用 AsyncImage：切换资源/玩家先隐藏并移除旧src，仅当前加载完成后显示，清空/销毁使旧回调失效。SeatView/HandCardsView/SeatEffectView 以 userRid 隔离同座换人，清除残留手牌动画与 ALLIN；玩家资料管理请求也以窗口代次隔离，防旧请求关闭或污染新窗口。真实站起/机器人补位后逐座头像src与当前玩家信息一致；延迟加载/旧回调通过专用回归验证。TypeScript check和12项针对性测试通过，未做完整构建，未提交。

- 2026-11-13 蘑菇/暴击及钱包、座位生命周期修复已提交为 `bae26b1`，未推送。本轮继续在 kong，按用户要求分阶段提交 Jackpot/CallTime、完整保险（含 EV）、奥马哈/6+、MTT；不另开分支。
- Jackpot/CallTime：新增房间定向数据、1129/1130 原名消息与奖池原动画，沿 CC 预取模板/记录并调用外壳 jackpotRecord/jackpotAward 面板；重连不重播开场。CallTime 使用本人 Winner 的 count/stay，站起清理，菜单离桌复用统一确认窗并发送原 1010。演示菜单补充两种场景。
- 静音 Chrome iPhone12 真实验收：新旧进入 0.1/0.2“纯自动2-50+jpot+鱿鱼-1”，奖池均显示2115；新版点击打开真实 H5 奖励记录/说明，实际坐下捕获原 Jackpot 开场动画。随后两个账号在“calltime测试”实际对局，第4手新版赢3.40，触发 Profit 10BB 1/10 hands，后续观察计数递增；实际点击离桌提示，取消留在房间，再确认留座离桌，捕获发送1010并关闭桌面。未触发真实 Jackpot 中奖广播及 CallTime 十手到期，不将协议测试当作这两项实服验收。
- 本轮 TypeScript check 与16项相关测试通过，未做完整构建。截图 /tmp/mx-jackpot-live.png、/tmp/cc-jackpot-live.png、/tmp/mx-jackpot-start-live.png、/tmp/mx-jackpot-rules-live.png、/tmp/mx-calltime-progress-live.png、/tmp/mx-calltime-leave-live.png 为真实主流程临时文件，不随 Git 迁移。

- 2026-11-13 Jackpot/CallTime 已提交 `4699760`，未推送。保险复核：当前 CC 的低水、EV、新经典共用 UIInsuranceNewPanel、1115/1015/1116；没有另一个 EV 专用窗口，购买 insurEv 沿 CC 发0，由服务端计算。保留多池联合提交、强制最低保费/自动背保、排序及重连，保险窗口手牌数量改为旧版游戏类型对应的2/4/5/6张。
- EV 实服：6424账号开桌返回无权限，使用另一个已授权账号成功开桌。外部H5专业参数的保险选项值与 payload 减1映射不一致：选择“EV保险”实际创建mode1；改用可发出mode2的现有选项建立“MX-EV协议验收”（92575058），确认服务端insuranceMode=2。未改外壳源码。两个账号实际带入/对局，旧版与新版都触发共用保险窗口；旧版购买收到非空1116（含insurEv1237）；新版第14手实际点击购买，1116成交activeAmount932、passiveAmount233、insurEv3068，窗口关闭。截图 /tmp/mx-ev-hand14-purchase.png 是真实窗口，临时文件不随Git。
- 本轮新增EV限额/成交字段保留与手牌数量回归。EV单池实际购买、无法购买提示已验证；多池联合投保仍是此前逻辑/组件验证，未声称本次触发真实多池。CC预留的1030/1131继续为空实现，不臆造协议或额外UI。外壳开桌保险标签映射问题留在外部项目范围，后续开桌务必读取服务器mode确认。

- 2026-11-13 保险阶段已提交 `c5a9b10`，未推送。奥马哈/6+迁移：现金桌入口放开协议gameType0–3、pokerType0/2；保留MTT与加密牌限制。EnterRoomMapper保留玩法字段，起手缺省卡背按2/4/5/6张恢复；下注完全使用服务器ActionLimit，PLO不放大为任意全下。牌型沿原PokerUtil，奥马哈恰用两张手牌加三张公共牌，6+采用短牌修正规则；本人最佳组合恢复旧版实时高亮。手牌按CC Cards/l2r固定270设计宽度分槽重叠，桌面名称用GameType/PokerType/BetType词库。
- 静音Chrome手机模拟两个真实账号分别进入新旧自建0.1/0.2桌：MX-PLO验收99074994（四张）、MX-PLO5验收94075122（五张）、MX-PLO6验收96075122（六张）、MX-6+验收98075122（pokerType2）。四种均实际带入、跟注/让牌到河牌并收到结算，三种奥马哈各自实际收到对应数量手牌，PLO服务端limitBetType=1。截图已逐张查看对照手牌布局；公共牌动画中截取的早期图不用于宣称静态像素对齐，最终五张第5手截图已显示公共牌和手牌最佳组合高亮。
- 本轮22项相关测试通过，最后高亮修改后6项定向回归和TypeScript check再次通过，未做完整构建。截图 /tmp/mx-plo4-flop.png、/tmp/cc-plo4-flop.png、/tmp/mx-plo5-flop.png、/tmp/cc-plo5-flop.png、/tmp/mx-plo6-flop.png、/tmp/cc-plo6-flop.png、/tmp/mx-sixplus-flop.png、/tmp/cc-sixplus-flop.png、/tmp/mx-plo5-highlight-flop.png 为临时实服证据。复杂侧池/特殊保险与这些玩法组合仍需相应真实场景补充，不把整手验收扩大为所有组合验收。

- 2026-11-13 奥马哈/6+阶段提交 `9125d99`，未推送。MTT 本轮迁入 CC TexasGameRoomDataMtt 状态字段及增购/休息规则；H5 enterMtt → MSG_R_MTT_DETAIL（当前锁定协议值204）→ EnterRoom1002（WST_NO），按同赛事的真实响应分配 roomID。现金桌请求仍精确匹配房间；被取消的分桌请求隔离迟到回包。
- MTT 新增原名 AddOn1004、AutoOpActive1007、UpBlind1120、SyncHand1124；接101按消息体分桌、107绝对开赛时间、154休息。保留普通/Plus1/Plus2增购资格、每手/总次数、4秒空闲后清牌休息、泡沫/拆桌等待；换桌和重连继续沿H5 bridge，没有额外WebSocket。MTT加时按赛事消费档位和delayTimeType控制，筹码余额沿ChipFormatter的MTT取整分支。
- MTT LR_NOCHIP区分存储筹码返桌与结算；淘汰后同桌重新订阅观战，真实回包确认无本人座位才允许继续观看。H5 mttSettlement/mttRecord复用原面板；panelRequestId隔离旧窗口回调。参赛玩家菜单离开不发现金桌Leave；淘汰后观战退出取消订阅。观众点空座转H5赛事详情报名。菜单复用托管项，隐藏现金桌买入/带出/站起。
- MTT UI沿UIRoomTexas原waitStart、Group4871、Rectangle841图片，开赛和休息共用浮层；泡沫和拆桌沿原轮播词条。图片来源已登记image-sources。静音真实H5新旧浏览器核对了赛事列表和详情：竞技场2暂无赛事；公共三场93531274/95231466/96531402分别显示11月19/26/27日开赛，牌桌总数0。没有创建MTT、没有伪造在线消息，也没有完成MTT真实入桌、换桌、增购、休息、结算UI验收。需用户提供进行中的赛事。截图 `/tmp/mx-mtt-live-empty.png`、`/tmp/cc-mtt-live-empty.png`（390×844、DPR3、CDP mobile/touch5），临时文件不随Git；离线组件截图仅确认素材加载，不是实服或像素对齐验收。
- MTT本轮TypeScript检查和42项针对性回归通过（含分桌关联、迟到消息、增购限制、休息时序、泡沫、换桌及淘汰观战）；未重复全量构建。此前各阶段真实验收限制仍保留：Jackpot中奖、CallTime到期、多池/强制保险和多玩法组合未全部在线触发，不能将代码覆盖等同全场景验收。

- 2026-11-13 MTT 实服补验：98981498 收到真实 1112、1114 reason=1、观战 1002 seat=0、1114 reason=3；94981498 两端入桌并截图，新版淘汰后观战快照正常。95981370 初始筹码 200，新旧实际入桌，新版观察到 room 2→1，升盲后正确显示下一盲注、Ante 和递减秒数。截图 `/tmp/mx-mtt-95981370-fixed.png`、`/tmp/cc-mtt-95981370-live.png`（临时文件）。
- 对照 CC PotsInfo/UIRoomTexas：主池独立居中，边池使用 168.08×41、940 宽网格、20 间距换行，最多 8 个边池；第二排出现时房间说明下移。独立离线九池测试在 mobile=true、touch=5 的 390×844 和 375×500 截图检查；该边界测试不是实服九池验收，真实赛事尚未捕获九池。截图 `/tmp/mx-pools-nine-mobile.png`、`/tmp/mx-pools-nine-375x500.png`。
- MTT 入桌补接 H5 syncCurrentClub，沿 CC 当前俱乐部优先、赛事俱乐部兜底；不修改外部 H5。MTT 数据补下一盲注/Ante/截止时间，局部 UI 每秒刷新，不重建牌桌。TypeScript check 和 MTT/H5 入口 11 项相关测试通过；未重复完整构建。
- 未完成：94981498 旧版结算 isRebuy=true、clubId=48，新版当时 false、0；俱乐部同步已补，但重购余额差异尚未证明解决。当前 deps/h5-game 的 BridgeMttSettlementPanel.vue 没有消费 inTable/canContinueWatching/watchingPending，与旧版运行页面存在版本差异；不能把拿到观战快照说成“继续观战按钮已验收”。增购、休息仍未实际触发。不要为展示重购按钮强制放开 canRebuy 的服务端余额/次数/盲级限制。

- 2026-11-13 更正“继续观战未实现”的根因：当前 MX `deps/h5-game` 实际是根仓库跟踪的旧文件副本（不是有效 gitlink），结算 Vue 缺少 `inTable/canContinueWatching/watchingPending` 分支。现有外部 `/Users/kongfanbing/data/h5-game` HEAD `e0afbd9` 的组件与 CC 所用 H5 一致，包含继续观战、返回大厅及桌内重购。已将临时 `/tmp/mx-h5-login-preview.config.mts` 的 shellConfig/root 指向该外部 H5，5174 服务已重启；4179 仍为 MX。外部 H5 源码、配置和依赖未修改。恢复此机器预览时必须使用该正确大厅，不能退回 deps 旧副本。
- 本次 95981370 真实 H5 重购进入后收到 1112 → 1114 reason=1（accountChips=0、rebuyTimes=1）→ 原桌观战 1002 seat=0；显示可点击“继续观战/返回大厅”，实点继续观战后关闭面板，仍留 room=1，继续接收升盲。移动模拟390×844/touch=5，截图 `/tmp/mx-mtt-watch-real-choice.png`、`/tmp/mx-mtt-watch-real-after-click.png`。本场 server accountChips=0 使旧版同一 canRebuy 判断为 false，因此此次不是“弹窗重购按钮”实服验收；从赛事详情用俱乐部钱包重购已实际成功。外部组件3项测试与MX相关11项测试通过。此前继续观战入口未验收的记录被本条更新；余额差异仍不可擅自放开。

- 2026-11-13 牌桌文字聊天/弹幕/客服和平台钻石桌带入：沿 CC TexasGameRoomDataChat、UIChatDlg、GetMsg/BroadcastMsg 迁入缓存、20条历史翻页、去重、未读红点、快捷文案、80字限制；文字用1121服务端最终文本，1019只确认，缺少自身广播时同步HTTP历史。发送弹幕仍按CC先普通聊天再bullet发送1019，八条滚动轨道，离桌销毁。聊天复用RecordDialogView并使用CC九宫格素材；客服沿H5 showPanel supportChat，普通币桌查询支付俱乐部，平台桌走官方客服。未修改外部H5或新建WebSocket。
- 钻石桌 goldType=4 独立于币桌钱包，读取 user_diamonds_wallet，100协议单位/钻石，隐藏俱乐部钱包和自动补充；正筹码返桌直接Seated且不以当前可用钻石余额拦截，新增带入/补充则检查余额。保持记分牌和俱乐部钱包原分支。加密桌未处理；本轮没有迁移钻石充值支付页。
- 真实H5“测试钻石桌-1”（90495058）：新版实际带入1000、再补充1000、站起后直接返桌恢复2K且无带入窗。新旧两个账号双向发送文字/弹幕，捕获新版1121/1019，旧版Label和新版DOM均显示对应消息；新版重新入桌后恢复服务端历史。实际打开官方客服，仅验证入口未向客服发送消息。快捷文案从服务端取到4条并显示选择列表；Chrome mobile/touch5的390×844及375×500截图核对聊天固定输入区。历史超过20条的翻页、钻石不足和0筹码返桌为定向测试覆盖，未制造大量真实消息或耗尽账户余额来验收。聊天记录中的表情目前文字占位，原座位Spine播放不变；非本轮文字聊天验收范围。
- 本轮TypeScript check及聊天/坐下/表情15项定向回归通过，未重复完整构建。截图 `/tmp/mx-chat-restored.png`、`/tmp/mx-chat-375x500.png`、`/tmp/cc-chat-received.png`、`/tmp/mx-danmu-live.png`、`/tmp/mx-support-live.png`、`/tmp/mx-diamond-seated.png`、`/tmp/mx-diamond-added.png`、`/tmp/mx-diamond-return.png`，均为临时文件。代码留在kong工作区，尚未提交或推送。

- 2026-11-13 补齐右上补充筹码和安全卫士：补充筹码沿原带入控制器，坐下且非赛事显示；安全卫士沿 CC tribeId 条件及 H5 safetyGuard 面板。真实保险-6 入桌未坐下可见安全卫士，实点打开原 H5 面板；钻石桌坐下后显示钻石补充图标。DEV 菜单下移避免遮挡入口。
- 预选操作对照 CC AutoOperation/ToggleButton/UIAutoOperation.prefab，恢复原“看牌/弃牌”“自动看牌”“自动跟牌”词条和方形选中/未选中素材；未选中跟牌不显示金额，选中跟牌/全下金额独立一行。真实保险-6 第31手捕获未选中→单次点击→选中“20 / 自动跟牌”，Chrome mobile390×844、DPR3、touch5，已截图查看选中态；全下选中为代码对照，未在本轮实服另行触发。
- 聊天中的原版表情改用共享 EmojiSpineRenderer 播放，按可见消息槽定位/裁剪，关闭和离桌清理。真实测试钻石桌发送表情后，经服务端历史显示原笑脸 Spine，截图 `/tmp/mx-chat-spine-live.png`。此前“聊天表情文字占位”的记录由本条替代。
- 带入窗钻石购买 tab 迁入原商品、赠钻、批发商资格/申请中状态、支付渠道/折扣/汇率及下单链路，金额沿 CC 舍入顺序；收款窗展示服务器二维码、地址、金额和15分钟倒计时。真实商品/渠道加载，普通商品下单收到收款结果，未执行外部转账；实际到账刷新及批发商付费申请未在线验收，不可称支付全链路完成。截图 `/tmp/mx-diamond-receipt-live.png`；375×500 移动模式核对9渠道与底部按钮完整显示、商品九宫格修正，截图 `/tmp/mx-purchase-short-fixed.png`。上述临时截图不随 Git 迁移。
- 本轮 TypeScript check、18项购买/聊天/表情/坐下定向回归及 git diff --check 通过，未重复全量构建。全部修改留在 kong，尚未提交或推送。

- 2026-11-13 入口预加载：warmRoomPanels 在入桌、重连、坐下时预取钻石商品/渠道/资格、补充筹码钱包/钻石余额、客服支付俱乐部和安全卫士黑名单。RoomPanelCache 按房间合并请求、30秒有效期，失败可重试、abort 隔离、请求中失效不再标记新鲜；坐下/补充成功及购买/申请后失效。补充额度仍按当前 roomInfo/myInfo 重新计算，提交原验证保留。安全卫士复用 H5 的 dzpk_h5_TRIBE_BLACK_USER_LIST_CACHE，保持其他联盟条目；外部H5不改，ccStorageOp 的 dzpk_cc_ 前缀不能用于此缓存。
- 申请批发商沿旧 ConfirmOrNotice 默认单按钮模式，在 TableConfirmDialog 增加长正文自适应、1000高亮和“支付1000钻石”；未提交付费申请。客服按 UIRoomTexas prefab 的200×100点击区、180×92.74背景、69×72图标和原九宫格修复。
- 复制地址补剪贴板失败回退，在当前复制按钮显示成功/失败，地址可长按选择。本轮真实触摸组件复制测试显示“复制成功”，不是实服收款页全链路验收：真实测试充值下单返回 no usable address，未执行外部转账。申请窗口为实际组件独立视觉核对，375×500截图 `/tmp/mx-trader-confirm-final.png`；实服客服 `/tmp/mx-support-prefetch.png`。真实进入保险-6且未打开安全卫士前已缓存9条黑名单；钻石购买页真实加载。临时截图不随Git保存。
- 本轮TypeScript检查及缓存/钻石购买/坐下13项定向回归通过；未全量构建，未提交或推送。

- 2026-11-13 安全卫士原图94×115，保留93×135点击区但background-size改为contain居中，消除纵向拉伸。Chrome mobile/touch 375×500实际组件截图 `/tmp/mx-shield-ratio.png`；本轮为组件视觉验证，未重新登录实服。
- 钻石充值审核接入全局145 MSG_S_USER_USDT_ORDER_NOTIFY（不是133奖励通知；CC对应函数为空，状态和提示沿现用H5 MineShopView）：在MxRoomHost房间过滤之前解码，命名函数UserUsdtOrderNotify交给购买服务；2通过、3失败、4取消、5超时，使用原H5词条提示。同订单同状态去重，匹配当前order_no才关闭收款窗/倒计时，刷新可见充值页余额并使补充筹码缓存失效。走既有H5 wsMessage，不增加WebSocket；离桌abort清监听。
- TypeScript check及6项定向回归通过，包括通过真实二进制bridge测试帧发送roomID=0的145、重复通知、终态过滤和离桌清理。本轮未触发真实后台审核推送，线上审核通过仍需实服补验；未提交或推送。

- 2026-11-13 Agora DOM 音视频迁移（kong，尚未提交）：固定 agora-rtc-sdk-ng 4.24.5，沿 CC rtc/VP8、240×240、15fps、bitrateMax300 和 rtc_d_1-matchID-roomID 频道名，HTTP /api/misc/agora/token，Poker WS 仍经 H5 bridge。TableMedia 按房间管理采集、发布、订阅、续期、静音、退出及异步隔离；视频直接 SDK track.play 到头像 DOM，不复制到 Canvas。普通桌不实例化媒体控制器。
- VideoModel 原配置分支保留：语音初始闭麦、全时长/强制模式不可关闭、随机 902 验证和麦序操作切换、HUMAN/EFFECT 的坐下与中途开关、四种窗花和禁止关闭规则；1133 VideoMaskChange 写入当前玩家，1132 ForceVideo 沿旧代码为空。MTT 入口保留防作弊字段。人脸验证 type4 仍未支持（旧 VideoModel 本身亦不支持），不能把视频迁移当成人脸认证完成。
- 原窗花/麦克风/底栏/远端开关/玩家资料音视频按钮图片迁入 assets/raw/media 并登记 ccSources。跨端口图片转为 import.meta.url 绝对地址；远端开关和媒体桌底栏按旧 prefab 修正。玩家资料单人媒体开关复用现有操作区域；换座先解绑旧播放容器，站起/离桌停止并关闭采集轨道。说话检测沿旧300ms/0.6阈值，只显示当前最响者。浏览器拒绝采集后沿旧提示并3秒返回，使用 supplement 补充旧硬编码文案的多语言。
- 实服验证：两授权账号分别登录 H5+MX 5174 与 CC7456，在竞技场2创建 0.1/0.2 六座“MX视频验证”（90235122，全时长+节能模式），真实坐下、Agora CONNECTED、新旧双向音视频发布订阅，双方视频240×240。实际点击窗花1→2→3→4→1，旧端玩家数据收到mask2；全桌关闭视频取消订阅后恢复，单人音频/视频开关点击生效。另在10/20“语音桌-2”（97365090）验证默认闭麦、双方开麦收发、闭麦且无摄像头轨道。最终实际站起：音视频原MediaStreamTrack均ended、DOM视频0个，并退出房间。
- 浏览器验证用静音 Chrome + 测试音视频输入，通过真实 RTC/业务服务器；不是实体手机摄像头、听感、后台恢复或热功耗验收。使用持续 CDP 会话保持 mobile/touch/UA，临时连接的设备覆盖断开会让旧 Cocos恢复桌面尺寸，不能只用拉伸窗口。截图核对含390×844、375×500，临时文件 `/tmp/mx-rtc-dual2.png`、`/tmp/cc-rtc-dual.png`、`/tmp/mx-rtc-final-ui.png`、`/tmp/cc-voice-live.png`、`/tmp/mx-rtc-375x500.png`；中间截图为修改前状态，以最新截图和代码为准。早期 `/tmp/mx-voice-live.png` 捕获区域受浏览器表面尺寸影响，不可作完整手机截图依据。
- TypeScript check和22项定向测试通过（含媒体配置、随机验证倒计时/禁关/结束保持开启、麦序、1133、换人/abort、入桌重连回归）；未跑完整构建。随机902、麦序桌、HUMAN/EFFECT配置、MTT强制视频、Token真实到期续期与真机自动播放权限尚未逐项在线触发，不能宣称这些分支已实服验收。两个账号在线互通已验收，但不代表6/9路满桌性能测试完成。

- 2026-11-14 牌桌优化（kong，未提交）：用户明确跳过第11条及所有牌桌外功能；统计接口不加时间参数，服务端控制近60天，数据tab仅增加“仅展示近60天数据”。保险快捷金额nowrap并按长度缩小；战绩每次打开重新取Roomers，1116购买广播后刷新，去掉保险tab；补充筹码步长50BB，末端不足一步仍可选最大金额；鱿鱼参与者数量0仍显示图标。强抓按房间straddleMax、已强抓人数和协议level限制，缺省1，配置展示同步缺省值。
- StartInfo发牌参与者、普通操作快照及取消留座成功清理旧暂离计时字段；牌谱概览增加翻前/翻牌/转牌/河牌各自操作和金额，详情公共牌、人数、底池禁止挤压并允许换行。下注节点先更新金额再显示；这项仅代码调整，未捕获原金额闪动现场，不宣称已实服消除。
- 刷新返桌用sessionStorage只保存本人已坐下的room target和H5端口（不存凭据），重新收到ready/token/syncUser后走原H5 wsConnect，匹配wsOpen后进入原桌。手动离桌/站起/换账号清理，初始预加载hidden及pagehide销毁不误删。真实98704898座位2刷新恢复成功；不改外部H5源码，不新建游戏WebSocket。
- Agora监听native mute/unmute、track-ended及远端user-info-updated，麦克风图标读取真实采集状态，保留300ms状态复核；隐藏全局屏蔽声音/省电入口，保留单人权限。SDK状态模拟回归通过，未做实体手机来电和本轮双账号音频现场验收。
- 本人顺子标签问题：新增逐街pair→straight定向回归，代码和真实第421/422手公共牌/手牌/标签采样未复现错误。用户确认“检查没有问题就不用改”，保留原计算实现，不能称修复了已复现的顺子故障。
- 验证：TypeScript check通过；215项串行回归通过；最后强抓收紧后追加6项定向回归通过，git diff --check通过，未做完整构建。旧重复点击测试仍断言抛提示，与现行CC静默去重约定不符，已改为验证不再次发送。真实第377手牌谱截图 `/tmp/mx-history-377.png`、`/tmp/mx-history-details-live-fixed.png`（后者DEV菜单遮住一部分，河牌/Showdown牌与人数未重叠）；真实统计说明截图 `/tmp/mx-stats-60days-live.png` 被同时到达的鱿鱼结算部分覆盖，说明文本可见。截图均临时，不随Git。
- 保险长数字为隔离组件测试：复用InsuranceView及DemoFeatures，13–15位金额单行，scrollWidth等于clientWidth。最终截图 `/tmp/mx-insurance-375-verified.png` 经同一CDP会话确认375×500、mobile=true、touch5。此前文件名含375的截图实际被agent-browser重置为390×844，不作为375验收。当前可见测试桌未提供保险购买场景；保险池真实购买后的金额、强抓上限真实服、双账号麦克风、下注金额瞬间闪动仍待针对性实服复核，不将组件/协议回归当成实服验收。
- 2026-11-14 用户澄清第17条：仅鱿鱼和保险共存时隐藏保险tab，普通保险桌保留。ReportController复用GameplayTableSettingBasic归一化配置并集中生成可用tabs；Jackpot必须RoomRecord.jackpot===1，修复关闭值2被truthiness当开启的问题，配置变更后不保留失效选中页。ReportView沿原保险词条恢复入口。此记录取代上条“去掉保险tab”的全局描述。
- 同轮牌谱详情头部改固定四列（标题/公共牌/人数/底池），五张公共牌在预留区域缩放，人数和金额各街对齐，不再使用space-between加自由换行。Chrome iPhone12组件截图 `/tmp/mx-history-columns.png`，五阶段人数起点均285.56px，五张牌右边界236.52px；战绩共存组件截图 `/tmp/mx-report-squid-insurance-tabs.png` 仅实时战况/鱿鱼记录。均为真实组件+隔离数据，非本轮实服截图。TypeScript及11项战绩相关回归通过；未构建、提交或推送。
- 2026-11-14 局域网真机预览：当前en0地址192.168.3.79；MX以 `/tmp/mx-lan.config.mts` 启动4179（host=0.0.0.0，CORS允许该地址及localhost/127.0.0.1的5174），真实H5临时配置改为按location.hostname动态导入4179资源，以 `--host 0.0.0.0 --port 5174 --strictPort` 启动。手机入口 `http://192.168.3.79:5174/`，电脑/手机需同网；IP与临时文件不保证跨机器/重启有效。外部H5源码未修改。
- 局域网HTTP没有crypto.randomUUID，新增core/uniqueId复用crypto.getRandomValues生成非秘密UI/request ID，替换牌谱弹窗、表情、MTT面板与牌谱存储的直接调用。浏览器经LAN入口确认H5登录页和MX容器正常，原生randomUUID为undefined且fallback生成32位ID；TypeScript和diff检查通过。HTTP不提供摄像头/麦克风权限，音视频真机验收需另配HTTPS。未提交或推送。
- 2026-11-14 LAN入桌修正：真实复现99消息体status=90021、message=invalid access host，随后WS 1006；原因是测试服拒绝LAN Origin。只验证登录页不足以说明入桌可用。通用/api/channel/代理在该测试服也失败，最终临时H5 Vite配置用VITE_WS_URL_TEMPLATE=ws://192.168.3.79:5174/mx-ws{0}，按大厅下发端口转发到固定test2.awanptest.com对应WSS端口，保留原路径/协议与H5 bridge，Origin沿已可用localhost预览设置。不修改外部H5源码，不在MX创建WS。H5EntryController刷新恢复识别同源/mx-ws:原端口的wsOpen。
- 真实LAN验证：另一授权测试账号登录并进入98704898，202和1002均status=0，牌桌持续收消息；截图 `/tmp/mx-lan-room-connected.png`。手机须刷新加载新代理配置。TypeScript及H5入口回归通过。临时代理配置重建时以本条为准，旧/api/channel/尝试已移除；未提交/推送。
- 2026-11-14 对照CC main b51c541迁移侧边弹窗适配：RecordDialogView共用visibleHeight*designTop/2703规则，战绩185、牌谱220、聊天200；CSS max合并H5 --mx-safe-top或设备safe-area-inset-top。侧边面板扣除顶部间距，聊天移除旧的按宽度210单位偏移及独立高度计算。保持固定头尾、内部滚动，DOM布局自动调整，不重建列表/重置滚动；未改外部H5或首页图标。
- 静音Chrome同一CDP连接mobile=true/touch5，390×844、375×500、375×500+64px安全区共9个组件场景验证：面板顶边符合原公式，底边及页脚不越界，内容区域高度为正，重排保留scrollTop。375×500三窗顶部34.22/40.69/36.98px；safe64时均64px。截图 `/tmp/mx-top-{report,history,chat}-375-500-safe0.png` 及汇总 `/tmp/mx-dialog-top-short-review.png`（隔离数据与共用真实组件，非实服截图）。TypeScript、14项战绩/牌谱/聊天回归、git diff --check通过；未完整构建。
- 2026-11-14 新增 `npm run release:web-mobile`：默认读取仓库内 deps/h5-game，也可通过 MX_H5_ROOT 指定已安装依赖的外部 H5。在临时副本中检查协议、同步词库、组合正式 H5 入口与 MX；外壳源码/环境文件不改。输出 dist/web-mobile，包含 H5 大厅登录、原 bridge、MX CSS/chunk/资源、version.json；MX 放在 buildId 子目录，词库 URL 同样带版本。HttpConfig 支持 VITE_MX_API_BASE_URL，发布默认与 H5 API 同源配置；WS 仍由 H5 管理，无本地 Vite 代理或开发端口依赖。实际 deps/h5-game 当前是仓库跟踪文件，不应再依据旧记录直接认定为独立 submodule。
- 静态发布验证：完整 release:web-mobile 成功（MX TypeScript 检查、H5 协议检查、MX/H5 生产构建），1591 条 HTML/manifest 本地资源引用均存在。普通 Python HTTP 服务 4188 打开真实大厅与登录窗，确认 MX DOM、CocosBridge、版本化 CSS 已加载，没有 4179/5174/@vite/client 请求，无浏览器异常或静态资源404。截图 /tmp/mx-web-mobile-static-login.png；本轮只做发布入口冒烟，不代表生产域名下在线对局验收。默认 API/WS 仍为测试环境，生产部署须使用目标环境和允许的域名；详见 README 发布说明。未提交/推送发布脚本，未修改发布仓库或服务器。

- 2026-11-16 按用户要求从 main 修复入桌失败及弃牌亮牌：H5EntryController 记录入桌前 hash 路由并随坐下恢复记录保存，失败后取消房间会话，通过 h5Navigate 返回来源，无记录回 /home，过期失败回调不能关闭新会话。参考 CC 新路径 /Users/kongfanbing/data/www/cocos/h5-cc-game 的 TexasTableEvent.Showdown 与 CardSyncBig：允许 FOLD 选牌/取消，成功回包后更新眼睛标记，清手/新手清选择，旧回包不恢复已清手选择。未修改 H5 或 CC。16项入口/回合回归通过；本条是协议测试，不是本轮实服亮牌广播验收。
- 同轮 main 修复提交为 8ae9bf4，已合并到 kong（db347fb）；只在 kong 调整均衡/椭圆/经典的确认按钮，位置和尺寸跟随原加注按钮，拉杆底端按按钮尺寸留间距并整体上移，初代不改。实际组件演示页在390×844、375×500、320×400、按钮110%共9组验证确认按钮矩形与原按钮误差小于0.01px，最终320×400截图复核轨道、按钮和本人牌未重叠。225项串行回归通过。未在本轮真实服务端验证弃牌后对手收到亮牌；不将合成协议回包记成实服验收。当前两分支的本轮提交未推送。
- 2026-11-16 弃牌亮牌实服补验并修复两处遗漏：操作栏及自动操作栏的透明区域挡住本人手牌，导致点击不进入 Showdown；actions 模式改为空白穿透、仅可用按钮接收事件，加注遮罩继续拦截下层。眼睛图标原 CSS 相对地址在跨端口 H5 被解析到5174而未加载，改由 HandCardsView 用 import.meta.url 生成4179/生产chunk对应的绝对资源URL。未新增WS或修改外部H5。
- 同轮两个授权账号通过真实H5进入竞技场2“二道牌-2”（95280106），实际截图及DOM核实：第228手第二账号弃牌后选方块10，第一账号结算前看到牌背、结算时看到方块10+牌背；第233手弃牌后选择数1→再次点击0，仍同一手且两张手牌保留；第235手弃牌后选方块5/梅花J，两个眼睛标记可见，对手结算时确实显示这两张牌；第236手选中数0。未伪造消息。此前仅协议测试通过却点击被遮挡的结论已被本条纠正。本轮已站起，两个账号均离桌，临时页关闭、视口恢复。截图仅工具内联，没有新增临时截图文件。

- 2026-11-16 kong 四布局细节验收：新增 DEV 离线夹具 tests/fixtures/layout-audit.ts，使用真实 GameClient/组件和合成快照，不连实服。用户已明确允许 Playwright 保存本地测试页截图。初代、均衡、椭圆、经典各自出表，共188条记录、36组前后图、68张补充图；报告 docs/qa/layout-audit-2026-11-16/index.html 与 CSV，目录按原规则忽略，不随Git；可复现脚本和跟踪说明 docs/layout-ui-audit-2026-11-16.md 留在仓库。
- 本轮修复仅kong：新布局昵称/操作气泡分开，顶部双座下注各自下置并避开110%筹码文字；均衡/椭圆本人牌型移到手牌下方；新布局赢家板避开亮牌，均衡/椭圆本人赢家板放手牌左侧。头像与加注按钮覆盖按椭圆设计保留，六张手牌叠放也不当作错误。未改初代、CC、H5或网络协议。
- TypeScript主项目及夹具检查、8项布局相关测试通过；最终36场景+68补充场景的516对指定节点交叠检查通过，149个报告本地链接有效。检查限昵称/操作气泡、赢家板/同座手牌、本人手牌/操作按钮，不能扩大为任意节点或动画都不相交。真实双账号逐布局、完整Figma节点复核、动画全过程、多玩法弹窗、多语言/安全区/真机等仍有28条逐布局待验记录；本轮没有重新做实服验收。均衡牌型位置采用与椭圆相同的手牌区规则，待其完整稿复核。未完整构建、提交或推送。

- 2026-11-16 继续 kong 布局验收：用户要求以 Figma 原图对照、以头像为玩家元素坐标原点。均衡取得原生 PNG（12026:53752，440×782），本人牌改为 40×56、头像下方65，庄家(-54,118)；经典牌50×71、庄家(-107,-7)。TableLayoutProfile 集中局部偏移，短屏整体移动本人头像组；操作按钮和拉杆跟随头像，保留原缩放。未机械替换 px 为 rem。
- 离线 `tests/fixtures/layout-audit.html` 扩展85场景，另提供逐玩家字段编辑器、完整一手单步/播放/暂停、切桌/重连/离桌。DemoFeatures 特殊玩法读取 mySeat，修正固定第一座。四布局五视口的庄家/牌/筹码边界、确认按钮同位与亮牌选牌流程共28条通过；四布局多池购买、二道牌、牌谱详情、带入、编辑器共20条交互通过。全量227项测试通过，新增非第一座测试另行通过；fixture TypeScript、完整构建通过。
- 新报告生成器 `tests/fixtures/build-figma-audit-report.mjs`，本地报告 `docs/qa/layout-audit-2026-11-16/index.html`；原稿/当前图并列，区分截图采集、几何通过、业务通过，不能称全像素通过。初代搜索仅找到设置文字，未取得独立完整设计稿。音视频仅占位；外壳客服、安全卫士、支付等外部流程未伪装成功。具体范围与复现见 docs/layout-ui-audit-2026-11-16.md。本轮未提交、未推送。

- 2026-11-16 第二轮六项 UI 修复：初代原稿已补取 Figma 748:23506；紫色独立桌布导出 12026:53753 至 assets/raw/table-personal，原稿来源同目录 JSON。公共牌按实际张数零间距居中；对手下注在头像局部坐标上避让单/双排公共牌；普通操作气泡改青色并贴头像上沿；用户确认本人行动倒计时移至弃牌按钮，对手及留座计时仍围绕头像；等待/留座遮罩继承头像圆角。四布局×三尺寸×五场景共60项离线几何检查通过，另12项倒计时清理/重启/结算/超时/auto横屏检查通过。现有228项全量测试和新增1项倒计时数据测试通过，TypeScript/fixture check及完整build通过（原有大chunk警告）。本轮非真实服验收。最新Figma原图对照在 docs/qa/layout-audit-2026-11-16/round2/index.html，旧340图保留为历史；报告目录仍按原规则忽略Git，ZIP为本机交付物。当前未提交推送。
- 2026-11-16 用户澄清六项反馈主要针对非初代：已恢复初代 PublicCardsView 原固定五牌位及间距、下注坐标和普通气泡配色；新布局通过 CSS 单独应用无缝居中与青色气泡，动态切布局不依赖重建公共牌。本人弃牌按钮计时仍按此前明确确认保留。新布局昵称底边改为头像局部上沿锚定，不再跟随筹码容器高度。round3 报告含四布局×三尺寸×五档共60项验证及24张截图，检查昵称/头像/气泡分离和各布局公共牌间距；前两轮报告已标历史。未提交推送。

- 2026-11-16 用户最新分支要求：本轮布局 UI / 离线工作台修改改存新分支 `kong-qa` 并推送；不得移动或合并到 `kong`。分支从 `fbb94eff1126c2a04e90b19751bd2713eae51274` 创建。此前统一在 kong 的约定对本次任务由此覆盖。最近229项测试、60项布局区分检查及完整构建通过。
- 2026-11-16 将 origin/kong-ui 的 f4a331b 合入 kong-qa（合并前 e6d7b4e）。6个冲突文件已按兼容原则处理：保留QA原稿位置/昵称间隔/初代公共牌间距/本人弃牌按钮计时，合入UI经典样式、设置面板、工具聊天图标、有效设置与安全区；整组本人元素避让实际底栏。deps/h5-game/.env保持QA原样，dev:h5通过进程环境设置桥接。233项全量测试、TS/fixture、完整build和离线60+28+12+20项检查通过。无待确认冲突；详见docs/layout-ui-audit-2026-11-16.md合并表。kong仍为fbb94ef，不合入kong。
