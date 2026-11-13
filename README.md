# h5-mx-game

TypeScript + HTML DOM 德州客户端，参考 h5-cc-game 的业务逻辑、协议与设计资源。完整 UI 由 `mountMxGame(container)` 挂载在一个 DIV 内；Spine 特效使用独立透明 WebGL Canvas，不引入 Canvas 游戏引擎。

**继续开发及换机器前先读 [AGENTS.md](AGENTS.md)。** 外部 CC、H5、i18n、agreement、bridge 的来源、约束、版本、当前进度和真实 H5 启动方式都记录在那里。外部目录由使用者在新机器上提供，不依赖旧机器绝对路径。

## 环境与 Git LFS

- Node >=22.12、npm、Git 和 Git LFS。
- 私有 GitHub 依赖/submodule 需要相应 SSH 访问权限。
- MX 使用 package-lock.json / npm ci；H5 外壳使用自己的 packageManager 和锁文件。

克隆前在新机器执行一次 `git lfs install`。克隆 MX 后在仓库根执行：

```sh
git lfs install --local
git lfs pull
git submodule update --init --recursive
npm ci
npm run check
npm test
npm run build
```

根 `.gitattributes` 跟踪图片、音频、Spine `.skel` 和字体，覆盖 `src/assets` 中的素材（历史 QA 截图目录已忽略）。JSON、Spine `.atlas`、SVG、代码保留普通文本。LFS 不改变工作区中的原图，不影响 Vite/Sharp；子模块按自己的规则管理。

提交时必须包含 `.gitattributes`、原资源和相关源码。正常 `git push` 由 LFS pre-push hook 上传对象；新机器用 `git lfs pull` 下载。若资源文件开头是 `version https://git-lfs.github.com/spec/v1`，说明拿到的是指针，应先拉取 LFS 内容再运行项目。请保证远端支持 LFS、账号有相应权限/存储额度。

## 开发、构建与主流程

```sh
npm run dev -- --port 4179 --strictPort
npm run check
npm test
npm run build
```

| 入口/产物 | 用途 |
| --- | --- |
| MX `/` | DemoHost 演示；不是服务器联调入口 |
| `/entry-preview.html` | 离线二进制协议回放；不登录真实服务器 |
| 真实 H5 大厅 + mountMxGame | 登录、bridge、WS 和真实入桌验证 |
| `dist/client/` | 外部 Vue 挂载所需的完整生产客户端，包含 chunk、资源、CSS、类型 |

演示入口进入房间后，打开右上角“测试”菜单：可体验单池/多池/强制最低投保、二道牌投票与双排发牌、蘑菇随庄位移动、暴击开场与翻牌、操作加时、结算偷偷看/发发看、留座返回游戏及重新发牌。`/?table` 可直接打开全屏演示。场景复用在线组件，但数据与交互反馈由本地 DemoFeatures 提供，不连接游戏服务器、不扣费，也不代替实服验收。

当前机器的真实 H5 页面在 5174，MX 源码服务在 4179，旧 CC 在 7456。端口不是业务代码固定值；**5174 当前依赖 `/tmp/mx-h5-login-preview.config.mts` 注入挂载，不是仅启动 H5 就自动有 MX**。临时配置的重建说明已收录 [AGENTS.md](AGENTS.md)。新机器不能依赖旧 `/tmp` 或浏览器登录态。

H5 外壳、源码和环境文件原样使用。只在外部容器上挂载：

```ts
import { mountMxGame } from './client/mx-game.js';
const game = mountMxGame(containerDiv, { layout: 'portrait' });
// Vue 挂载后立即调用，开始隐藏预加载；现有 H5 继续同步 bridge 消息。
// 组件卸载时：game.destroy();
```

同时加载 `dist/client/.vite/manifest.json` 中的 CSS，部署时复制整个 `dist/client`。更详细的调用链、替换组件和消息约定见 [docs/entry-flow.md](docs/entry-flow.md)。

## 外部系统与数据流程

- `deps/h5-game` 为外部 submodule，负责登录、导航、WS 及双工 bridge；不要修改其源码来适配 MX。
- MX 只有 HTTP 直连配置：`src/config/HttpConfig.ts`，当前为测试环境。WS 不配置地址、不直接连接。
- H5 挂载 → MX 隐藏预加载/ccReady → h5Ready/ccAck → enterTable → 等资源加载 → Rooms/EnterRoom → 数据驱动 UI。
- WS 增量经 `net/messages/texas/TexasMessageHandler.ts` 的 switch 和原名消息函数更新数据，再由定向装饰器绑定刷新组件。重连 SyncEnter 静态恢复，不重复播放发牌。
- 同一测试账号可能排他登录，新旧版交替验证；账号密码不入库。

## 目录与维护入口

| 目录 | 职责 |
| --- | --- |
| `src/host` / `src/core` | H5 挂载、bridge、入桌生命周期、公共接口 |
| `src/net` | HTTP、二进制协议、请求、原名消息函数与 switch |
| `src/data` / `src/binding` | 房间模型、observable、bindEvent、BindingScope |
| `src/logic` | 复用 CC 的金额、操作、买入、配置、战绩/牌谱/表情逻辑 |
| `src/table/components` | 可替换的 DOM 组件，尽量一文件一 class |
| `src/table/dialog-glass.css` | 统一弹窗蒙版、透明玻璃和扩散光晕；菜单保留非对称例外 |
| `src/effects/spine` | WIN/ALLIN、桌布、表情渲染及锁定的 Spine 3.8 runtime |
| `src/i18n` | 共享 i18n 适配和临时 supplement，未来归并外部词库 |
| `src/assets` | 只放原资源、图集和来源清单；Spine 在 `spine/`，表情音效在 `audio/emoji/` |
| `scripts` | 资源复制与构建图集脚本 |

`components` 工厂支持替换座位、公共牌、底池等 UI。金额沿用 CC 工具类，ShowBB 不重复实现。配置弹窗读取当前房间数据与权限，不能手填展示状态。

## 资源与国际化

`npm run dev` 使用原始散图；`npm run build` 的 prebuild 才打包 UI/牌面图集和桌布。Spine 自带 atlas 保持原样，相关动画和声音按需加载。网络头像及俱乐部 logo 直接用动态地址。

```sh
npm run assets:import -- /实际的/h5-cc-game
npm run assets:pack
```

第二条只在明确要重做图集时使用；日常 UI 开发无需执行。`image-sources.json` 和 `emoji-sources.json` 记录来源。

国际化沿用 `@silenthill/h5-cc-i18n`；用户已同意暂时保留 `src/i18n/supplement.ts` 的新增词条，以后统一迁入 i18n 项目。所有界面应支持即时切语言。

## 当前实现与验证边界

已接入 2–9 人普通德州的主流程、持续消息、俱乐部钱包坐下/买入/站起/补充/带出/留座、设置与配置、战绩/牌谱、WIN/ALLIN、动态桌布及表情代码。默认竖屏，auto 支持横竖屏；横屏导航在右侧。DEV 初始关闭声音，测试效果通过单一下拉菜单手动触发；没有 10 秒加载等待。

MTT、其他扑克类型、加密牌、视频/人脸坐下、其他钱包及其他非普通德州业务仍有边界。显示玩法配置不等于已实现该玩法。

2026-11-12 新增普通德州二道牌投票和经典保险：多池按用户要求保留各池选择并一次提交全部购买，沿用 CC 六档保费、反超/平分 outs、强制最低保费、加时、超时及重连恢复逻辑，共用弹窗边框与牌面组件。真实 H5 已验证同意/拒绝投票、两排公共牌、保险加时/购买/超时；157 项回归通过，TypeScript 与 host 构建通过。多底池和强制投保分支未在本次真实服牌局中触发，不把计算测试当作这些分支的在线验收。历史截图和本轮截图分别记录，详见 AGENTS.md。

2026-11-13 开始鱿鱼玩法迁移：补齐实时加入/轮次消息、剩余数、座位标记、原版说明/开始动画和轮次结算，复用现有战绩查询。经典10/20桌已实测加入1024→1125、获鱿鱼和结算；血战专属配置仍需实服补充验收。详见 AGENTS.md。

2026-11-13 迁入蘑菇池、押金/参与字段、庄位转移、暴击轮状态及原开场动画，两种说明复用 GameplayGuideDialog。真实 0.2/0.4“蘑菇+暴击-1”已验证坐下、蘑菇池变化及强制下注后整手发牌/结算；所观察牌局的 criticalHitOpen 在新旧版均为 false，开场动画仅完成演示验证。后续固定在 `kong` 分支开发。详见 AGENTS.md。

Jackpot / CallTime 已接入普通现金桌：奖池与开场动画、外壳奖励记录/说明/中奖面板、盈利留桌计数及离桌确认沿用 CC。真实牌桌已验证奖池面板、坐下动画和盈利后的取消/确认离桌；中奖广播与十手到期仍需对应真实场景复核。具体证据与边界见 AGENTS.md。

保险沿用 CC 共用窗口支持低水、EV、新经典配置；EV 已在真实 mode=2 桌完成本人购买与成交广播验证，保留服务端 EV 金额。多池联合提交已有逻辑/组件验证，仍待实服多池场景补验；外壳保险开桌选项映射的已知问题见 AGENTS.md。

普通现金桌现支持德州、四/五/六张奥马哈和6+。奥马哈保留服务器底池限注及“两张手牌+三张公共牌”牌型规则；6+使用短牌牌型规则。四种新增玩法均已在真实新旧同桌完成一手并核对手牌布局，详见 AGENTS.md。MTT已迁入独立入桌分配、升盲/休息/泡沫、增购/托管、换桌及淘汰观战，沿用H5赛事详情/结算面板；当前测试赛事均未开赛，实服牌局和UI验收仍待进行中的赛事。
