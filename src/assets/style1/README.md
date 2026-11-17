# style1：默认牌桌风格

这是一版目录与组件边界整理，保留现有视觉与业务行为，不新增假牌桌入口。

```text
style1/
  index.ts                 UI 实现入口
  settings.ts              外观选项，纯数据
  StyleClient.ts           DOM 生命周期和桌面装配
  table/
    components/<名称>/     组件类与各自的 config.json（58 个）
    layouts/               TableLayout 的具体实现、所有桌面坐标
    appearance/            外观及品牌解析
    *.css                  当前共用和功能级样式
  effects/                 Spine/表情/跨组件动画适配
  audio/                   音效播放代码
  resources/               图片、音频、Spine、原图和生成图集
  build/                   dev资源映射、build打包和CC素材导入
```

## 先看这几个组件

- `table/components/SeatView/`：整个座位的边界、头像组件放置点、庄家图标。
- `table/components/SeatIdentityView/`：头像、昵称、筹码与状态；只在自身坐标内摆放。
- `table/components/HandCardsView/`、`PublicCardsView/`：手牌/公共牌各自的边界和槽位。
- `table/components/CardView/`：牌尺寸、牌背与高亮资源。
- `table/components/ActionButton/`：下注按钮尺寸、锚点与图标映射。

配置示例：

```json
{"w":120,"h":176,"anchor":{"x":0,"y":0},"paths":{"back":"raw/ui/cardBack.png"}}
```

w/h 是组件设计像素；组件内部左上角永远是 (0,0)，右下角是 (w,h)。anchor 为归一化放置锚点；0,0 是左上角，.5,.5 是中心。父组件只放置整个组件，内部不依赖父/兄弟的屏幕坐标。保留 CC 中心锚点的组件用 LocalFrame 显式转换原偏移，并非继续使用零宽高根节点。

paths 是相对本风格 resources/ 的真实原文件路径，省略 resources/ 前缀。例如 raw/ui/fold.png。dev 直接访问这个文件；build 生成的 frames 也以这个完整相对路径为 key。PublicCardsView、HistoryCardsView 的 paths 为空，是因为牌图由 CardView 管；HandCardsView 只配置自己拥有的亮牌眼睛图标，不复制 CardView 的牌图。Spine/桌布的资源仍由对应资源加载器与外观清单管理，组件通过它们选择素材。table/sharedSprites/config.json 只为组件目录以外尚使用旧别名的代码兼容；新 paths 禁止写 fold 这种别名。

## 每个组件配置怎么用

- `paths`：组件直接拥有的原文件引用，`images`/`media` 是这些路径的构建与加载规则。网络头像、俱乐部 logo 等服务端 URL 仍由数据传入，不写死在静态配置中。
- `layout`：组件内部数值及动画配置，例如 `RecordDialogView.layout.slideMs`、`SeatBetView.layout.chipOriginX`。数据枚举、金额计算、WS 回调不搬进配置。
- `layout.css`：组件所属 CSS 的尺寸、间距等数值，按“选择器-属性”命名；后缀数字表示原规则内的不同值或不同适配规则。构建插件生成原生 CSS 变量，原 CSS 选择器、层叠顺序和媒体查询保持不变。单位保留原样，`calc(N * var(--unit))` 中的 N 仍是无单位数。修改配置后 dev 自动刷新，无需生成图集。
- `w/h`：固定组件使用设计像素；响应式组件使用 `auto`，表示由自身 CSS 和 `onFrameResize` 计算真实边界，不能给整屏覆盖层捏造固定宽高。拥有独立 DOM 根节点的响应式组件通过 `ComponentBox` 消费配置：改成数值后覆盖该轴尺寸，并按 `anchor` 设置局部锚点偏移；auto 轴保持原 CSS。内部子元素仍以本组件为基准。
- `sizing.mode: composite`：组合或适配组件没有独立的新根盒子，例如 ReportView 使用 RecordDialogView，SeatEffectView 使用已有座位与效果渲染器；它们的 w/h 为 auto 是边界说明，不在外面套一个空盒子。实际子盒子的几何配置在被组合组件中，独有内容的布局仍在本组件 `layout`。
- `sizing.root`：原根选择器的定位说明，供查找，不作为全局覆盖选择器；多个弹窗可以共用基础 class，避免修改一个弹窗时误改其他窗口。

`build/component-styles.mjs` 只生成 CSS 文本，不打图片；资源打包仍只在 build 执行。`tests/component-configs.test.mjs` 校验全部组件配置、CSS 引用和开发态资源解析。

## 换风格与保留业务

在此目录内修改布局、CSS、素材或组件，不需要修改 MX 的数据、协议和业务逻辑。新建 style2 时，复制此目录后在 `src/config/UiConfig.ts`、`AppearanceConfig.ts` 和根 scripts 的构建包装入口选择 style2。接口位于 `src/ui/`，不依赖具体风格。

TableLayout 是 interface，布局实现返回坐标；共享牌桌布局设置的保存、读取和事件仍由 MX 管。不要把固定风格实现误写成禁止玩家切换布局。金额、ShowBB、协议 switch 和 observable/bindEvent 继续复用原逻辑。

## 当前边界

58 个组件都有配置，资源引用和已迁移的布局值由运行时代码或样式编译器实际消费。部分组件本来没有图片，paths 可为空；不能据此判断没有配置用途。动画跨组件坐标转换集中在适配函数，现有部分桌级功能仍查询组件节点，尚非所有组件完全可替换的终态。颜色、阴影及共用选择器仍在风格目录内的 CSS 中，不宣称一份 JSON 能替代所有样式代码。

`npm run dev` 读取原图；`npm run build` 才打包图集。`npm test` 含布局及边界回归。浏览器实服视觉测试仍必须单独验证。

## 配置驱动的资源构建（2026-11-16）

- `npm run dev`：只扫描配置、解析原路径，不生成或读取任何 generated 图集。原文件通过多次 HTTP 请求加载。
- `npm run build`：Vite buildStart 扫描本风格所有 `config.json` 的 `paths`，校验、去重，生成图集和音频包。直接执行 Vite build 或 release:web-mobile 同样经过此步骤。没有 predev/pretest 打包，也不依赖上次构建结果。
- `npm run assets:pack`：仅供明确手动构建资源；不需要在日常开发中运行。
- `npm run preview`：Vite 原生含义是预览 dist，故使用已经构建的图集；需要看原资源/多请求的测试页面应使用 dev 挂载的 H5。test 不会触发打包。
- 输出全部位于 `resources/generated/`，已 gitignore，原图不覆盖。配置新增路径、改路径无需再登记固定 UI 清单。新增/删除配置会使 dev 模块重新加载。
- 小图片默认合并，超过页尺寸自动分图集；需要 border-image 九宫格拉伸的图片可在 `images.<用途>.pack` 设 false，保留独立文件。全屏桌布/预览仍按原外观清单单独处理，Spine 自带图集不拆解重打包。

```json
{
  "paths": {
    "fold": "raw/ui/fold.png",
    "dealSound": "audio/deal.mp3"
  },
  "media": {
    "dealSound": {
      "type": "audio",
      "pack": "table-sfx",
      "preload": "lazy",
      "start": 0,
      "volume": 1
    }
  },
  "mediaPacks": {
    "table-sfx": {
      "format": "mp3",
      "bitrateKbps": 128,
      "maxClipSeconds": 5,
      "sampleRate": 48000,
      "channels": 2,
      "gapSeconds": 0.1,
      "maxDecodedBytes": 33554432
    }
  }
}
```

`media` 按 paths 左侧用途配置；嵌套路径用 `faces.0` 这样的点号用途。start/duration 都是相对原文件的秒数；构建脚本生成包内 offset，开发者不手填包内偏移。相同 pack 名的短音效合为一组；maxClipSeconds 默认5秒（包含5秒），超过阈值、任何引用设置loop:true、pack:false或单个音效超出解码预算时均保留原文件。多个短音效累计超出解码预算自动分包。可修改分组阈值；单个短音效也可通过pack:false强制独立。构建先用ffprobe探测时长，接近边界再按解码采样数确认，不把长音频整段解码后才分类。支持 wav 和 mp3，当前牌桌默认 mp3/128 kbps。MP3 写入可定位文件以保留 Xing/LAME 编码延迟与尾部填充信息；构建后用 FFmpeg 回解码校验采样数与片段时间轴一致。WAV 保留为无损选项。MP3 减少网络字节，不降低解码后的 PCM 内存；浏览器解码器的实际音质和边界仍需听测。maxDecodedBytes 按配置采样率/声道及 float32 解码计算，浏览器可能按设备采样率重采样，实际内存需实测。

构建音频包需要系统 PATH 中的 **ffmpeg 和 ffprobe**（通常一起安装）；开发直接加载原文件，不需要它。不存在时 build 明确报错，不能静默丢音效。生产短音效由 AudioSpritePlayer 解码并缓存每个包一次，按 offset/duration 播放，停止/隐藏/销毁会取消待播实例。独立长音频通过HTMLAudioElement按需播放，不进入该整包下载/解码缓存，结束或停止释放媒体元素；浏览器仍管理自己的缓冲，并非零内存。dev所有音效直接使用原文件和独立媒体元素，便于调试且无需ffprobe。打包音效的 `preload:auto` 可在用户开启音效后提前加载；默认 lazy。测试默认关闭声音，打开页面不会自动播。

当前已接入牌桌8个短音效；BGM 使用 pack:false 独立媒体元素，支持 loop/volume/preload/start/duration。表情及道具原有音频暂保留原独立加载链路，尚未全部改成配置音频包。

视频可以配置如下规则（示例文件需自行提供，项目当前没有本地视频素材）：

```json
{
  "paths": { "intro": "video/intro.mp4" },
  "media": {
    "intro": { "type": "video", "pack": false, "preload": "metadata", "start": 2, "duration": 3, "loop": false }
  }
}
```

VideoClipView 使用原生 DOM video，按原文件秒数播放，时长控制不是逐帧剪辑承诺。视频保留独立文件，由浏览器按需请求；Range/seek效率取决于文件封装和服务器支持。没有实现视频拼接转码或二进制分片包，也不把 WebRTC 摄像头流混入静态资源打包。要合并视频需另行确定编码、尺寸、关键帧和透明度策略，当前 pack:true/分组字符串会明确报错。

开发静态路径和生产路径都经 Vite 生成 URL，保留版本 hash/base 支持。组件 TS 内的本地图片路径已迁入 paths；共享 Spine/表情加载器、桌布外观清单仍管理各自完整素材，继续由 Vite 输出，不把 Spine 自带图集当普通 UI 图重复合包。桌布预览由 DeskPreview 使用外观清单生成的映射，非重复声明每张图片。
