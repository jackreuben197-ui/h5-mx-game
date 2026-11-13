# 普通德州入桌与数据绑定

更新：2026-11-11。跨机器路径、外部依赖、真实 H5 挂载方式及最新验收状态见 [AGENTS.md](../AGENTS.md)。

## 对应 CC 源码

| CC | MX |
| --- | --- |
| `MainUtils.ts` 的 enterTable / syncUser / wsMessage | `H5EntryController` / `HostSessionData` / `H5BridgeTransport` |
| `TexasGameplayEntrance.messageLayerEnterAsync` | `EnterRoomProcedure.run` |
| `requestRoomInfoAsync` / `checkCanEnterAsync` | `RoomsRequest` / `RoomEntryPolicy` |
| `requestEnterAsync` | `EnterRoomRequest` |
| `PacketHead` / `ProtocolAgency` | `PacketCodec` / `ProtocolClient` |
| `EnterRoom.ts` / `SyncEnter.ts` | `EnterRoomMapper` |
| `DataBind.ts` | `observable` / `bindEvent` / `BindingScope` |
| `SeatManager` / `Seat` / public cards | `TableLayout` / `SeatView` / `PublicCardsView` |

## 完整调用链

1. Vue 的容器 DOM 挂载后调用 `mountMxGame(div)`，立即隐藏预加载 UI 资源和协议运行时；不要等点击房间才创建。
2. MX 安装兼容 `CocosBridge`，发 `ccReady`；H5 发 `h5Ready`，MX 回 `ccAck`。H5 发 `syncUser`、`syncToken`，或在 enterTable 附带 token。凭据只留内存，不写进模型快照或日志。
3. H5 按现有流程确保 WS 已 OPEN 并发送 REGISTER，再发送 enterTable；MX 不另建连接。
4. 显示加载页，等共享 UI 预加载 Promise 完成。
5. 发 `ClientMessageRooms`（202，包头 roomID/matchID 为 0），以唯一 rpcId 匹配回包，按 rid 找目标房间。
6. 检查房间未关闭、普通德州现金桌、2–9 人、非加密牌。服务端返回的 room record 才是权威信息，不以列表缓存替代。
7. 发 `ClientMessageEnterRoom`（1002）：room、空 GPS、observer、mttPartialBringIn=0、wantSeat=WST_BOTH，保持 CC 现有默认语义。收到 status=0 的对应 roomID/matchID 快照才进入 table 状态。
8. 原始 RoomRecord 和快照留在 `ProtocolRoomData`；Mapper 转为 UI 模型，Presenter 更新 TableData，组件通过装饰器订阅数据。空座、观战 mySeat=0、弃牌、延迟看牌和当前操作者真实手牌按快照恢复。没有手牌轮数据时清空公共牌与底池。
9. H5 发 `wsReconnected` 后请求 `ClientMessageSyncEnter`（1025），静态替换全量快照；不重播动画。

普通关闭/失败发生在请求链中时显示错误页；取消进房会中止请求订阅，旧异步任务不能写回新房间。无 rpcId 的同桌请求取消/超时后，保留隔离标记，直到旧回包被丢弃或 H5 确认新连接；不把下一条同 code 回包盲当作新请求成功。

服务端入站包按 H5 当前转发格式读取：无前 4 字节长度，53 字节包头；出站含长度，57 字节包头，big endian，protobuf version 2。TypedArray 的 byteOffset/byteLength 被保留。64 位 roomID/matchID 超出 JS 安全整数范围会明确报错，不截断成另一个 ID。

## Vue 容器示例

```vue
<template><div ref="host" class="mx-host" /></template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { mountMxGame } from './client/mx-game.js';
const host = ref<HTMLDivElement>();
let client: ReturnType<typeof mountMxGame> | undefined;
onMounted(() => { client = mountMxGame(host.value!, { layout: 'portrait' }); });
onBeforeUnmount(() => client?.destroy());
</script>
<style scoped>.mx-host { position: absolute; inset: 0; }</style>
```

同时加载 `dist/client/.vite/manifest.json` 中的 CSS。不要再启动 Cocos runtime，也不要把 MX 挂在会被 `h5Hide` 一起隐藏/销毁的大厅路由节点里。容器应与原 GameDiv 同层，Vue 路由只控制大厅。

`client.element` 是完整 UI DIV，可以 append 到另一个容器，数据和监听不会重建。`client.destroy()` 销毁 UI、动画、观察器、绑定、网络请求和桥接。

## 单独更换公共牌 UI

```ts
mountMxGame(hostDiv, {
  components: {
    publicCards(data) {
      const root = document.createElement('div');
      const render = () => { root.textContent = data.state.cards.join(', '); };
      const off = data.on('board:change', render);
      render();
      return {
        root,
        cancel() {},
        destroy() { off(); root.remove(); },
      };
    },
  },
});
```

正式组件建议像 `PublicCardsView` 一样一个 class 一个文件，通过 `BindingScope` + `@bindEvent` 自动首次对齐和解绑。位置由 TableLayout/父组件安排；自定义座位组件实现 `place(SeatPlacement)`，不修改座位 ID 或入桌协议。

## 持续消息与界面刷新

`wsMessage → ProtocolClient → TexasMessageHandler switch → 原名消息函数 → ProtocolRoomData → EnterRoomMapper / 专属面板数据 → @observable → @bindEvent → DOM`

- 消息函数只接触协议对象和数据，不能操作 DOM。新增消息沿 CC 名称放在 `src/net/messages/texas`，在 TexasMessageHandler 的 switch 接入；不增加 XxxHandler 后缀，不迁往 logic/messages。
- 配置、表情、战绩、牌谱有当前房间内的专属数据事件，不用全局广播重建桌面。GameplayTableSettingData 的 basicInfo/roomPermissions 变化直接绑定配置弹窗。
- 已接入 StartInfo、ActionAll、PublicCards、HandClear、ChipsChange、SeatedOthers、Seated、Standup、Showcards、SidePots、Winner、KeepSeat、AutoOp、AddTimeOthers、BringIn、StoreChips、Roomers、PublicReplay、PlayerJackpotSummary、BroadcastMsg、GetMsg。LeaveNotification 通知控制器关闭本地桌面。
- 入桌和 SyncEnter 按收到完整快照的包位置划分增量；快照之前的消息已被快照包含，之后的消息按序应用。帧按房间/match 过滤，取消和旧连接的 Blob 回调不能串入新会话。
- 每次增量先写候选数据，验证后才发布；公共牌漏轮、数据缺失等触发 SyncEnter。重复公共牌、旧手 Winner 不重复展示。
- ActionLimit 映射到现有操作区；ActionRequest 等待回应，筹码变化由 ActionAll 广播确认。UC 桌的 clubId 来自已有房间钱包接口，不冒用大厅筛选俱乐部。
- HTTP 沿用 CC 的 JSON POST、md5at、X-Club、code/message/data 契约。登录 token 从外壳同步，客户端不保存账号密码。

## 外壳与配置边界

`deps/h5-game` 是外部系统，原样使用，不修改源码或 `.env`。MX 不提供 integration 包装或外壳专用构建入口；外部在合适的 DIV 上调用已导出的 `mountMxGame`，双工消息全走 bridge。

只有 HTTP 在 MX 内直连。地址和超时放在 `src/config/HttpConfig.ts`，`HttpClient` 默认读取该配置，凭据仍来自外壳同步的登录上下文。WS 不配置地址、不创建连接，发包使用 `wsSend`，回包监听 `wsMessage`，重连恢复监听 `wsReconnected`。

## 当前边界

2–9 人普通德州的核心消息、俱乐部钱包坐下/买入/补充/站起/带出/留座已接入，但不代表其他玩法和业务已完成。奥马哈4/5/6张、6+和保险（含EV）已接入并有真实牌局记录；加密牌、视频/人脸坐下、非俱乐部钱包等仍需逐项迁移；返回大厅不会自动发送带出请求。WIN/ALLIN、桌布、表情等有独立 Spine 渲染，牌谱/战绩已有详情与定向数据绑定。真实服务器验证和离线二进制回放必须区分记录；当前视觉验收状态以 AGENTS.md 为准。


MTT 使用独立入口：H5 `enterMtt` → `MSG_R_MTT_DETAIL`（当前协议204）→ `EnterRoom(1002)`，参赛分桌请求 roomID=0、matchID>0、wantSeat=WST_NO；返回的真实房间号用于后续操作和重连。101通知以消息体的赛事和房间为准，只有等待换桌的参赛玩家跟随；普通现金桌的房间过滤不放宽。淘汰后继续观战要先得到原桌观战快照，结算和报名仍使用H5原面板/路由。代码和协议回归已覆盖，当前可见测试赛事尚未开赛，MTT实服及UI验收未完成。
