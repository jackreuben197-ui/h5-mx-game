# h5-mx-game — 开发约定与跨机器交接

更新：2026-11-12。新机器继续开发时先读本文件、README.md、docs/entry-flow.md，再核对代码和当前 git status。这里是唯一的 AI 交接文档，不另建 agent.md / AI.md。用户后续指令优先。

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

`RoomEntryPolicy` 当前允许 **2–9 人普通德州现金桌**；不要再加“只允许 9 人桌”的限制。默认竖屏，也提供 auto 横竖屏布局；横屏导航在右侧占满高度，竖屏导航在底部。MTT、奥马哈、6+、加密牌仍不是当前完整入桌支持范围。

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
