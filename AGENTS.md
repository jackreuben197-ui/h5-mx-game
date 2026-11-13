# h5-mx-game — 开发约定与跨机器交接

更新：2026-11-12。新机器继续开发时先读本文件、README.md、docs/entry-flow.md，再核对代码和当前 git status。这里是唯一的 AI 交接文档，不另建 agent.md / AI.md。用户后续指令优先。

用户最新分支约定（2026-11-13）：统一在 `kong` 分支开发，不再新建任务分支。此前 player-info-dialog、second-board-insurance、squid-gameplay 的提交统一保留在该分支历史中。

## 1. 工作范围与外部引用

真正修改的项目是 **h5-mx-game（MX）**。旧会话工作目录常在 h5-cc-game，不能因此把修改写回旧项目。

以下均是外部引用；迁移机器后用户会提供实际位置，路径未确认时先查现有目录、package.json、锁文件和 .gitmodules，再向用户询问缺少的路径。不要把旧机器绝对路径写入业务代码，也不要为了恢复环境重写外部项目。

| 引用 | 作用与约束 | 当前记录（仅定位参考） |
| --- | --- | --- |
| h5-cc-game | 业务逻辑、协议、prefab、设计资源和动画的核对基准；只读参考 | 旧机器 `/Users/magicd/repos/github/h5-cc-game` |
| h5-game | 外部 Vue 大厅、登录、HTTP/WS 外壳及 bridge 宿主；原样使用，不改源码和环境配置 | MX 的 `deps/h5-game` submodule，远端 `git@github.com:soolary/h5-game.git`；当前锁定 `53b61bb24a8fae2e271013765f00e54b91bb82e9` |
| h5-cc-i18n | 正式多语言词库；沿用其 key、locale 与运行时 | `@silenthill/h5-cc-i18n`，`github:guysoup027/h5-cc-i18n#46f6c805dd2144e0c7fb8b7bd9486f3ed8edc437` |
| agreement-web | protobuf 协议、Code/Def、消息编解码 | `@silenthill/agreement-web`，`git+ssh://git@github.com/kingofake/agreement-web.git#921be247732066cdae55477ce3a81c29fbbb6b6c` |
| h5-cc-bridge | 外壳侧桥接依赖；MX 通过自己的 HostTransport 适配现有契约 | H5 package.json 引用 `@silenthill/h5-cc-bridge` / `github:soolary/h5-cc-bridge#main`，不是 MX 新建 WS 的理由 |

MX 旧机器路径是 `/Users/magicd/repos/github/h5-mx-game`。上表提交仅记录本次状态，实际版本以仓库锁文件和 submodule gitlink 为准；不要擅自升级依赖。用户明确要求参考 CC，**不要参考 h5-px-game 或 CC 下的 pixi-client 作为旧版基准**。外部 `dev/h5-game` 若由用户提供，也必须保持原样。

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
3. MX clone 前本机运行 `git lfs install`；clone 后执行 `git lfs install --local`、`git lfs pull`、`git submodule update --init --recursive`、`npm ci`。根仓库 LFS 配置不自动替子模块配置 LFS。
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
