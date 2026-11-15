import { TexasGamePersonalSettings } from '../data/TexasGamePersonalSettings.js';
import { getBrand } from '../table/appearance/BrandManifest.js';
const brand=getBrand(new URLSearchParams(location.search).get('brand')??'mx');
const settings=new TexasGamePersonalSettings(brand.id,brand.defaultFelt,brand.layouts);
settings.setAccount(1);
import { mountGame } from '../index.js';
import { DemoHost } from './host.js';
import './page.css';
// Both dev and built preview start muted; do not overwrite the saved preference.
settings.soundOn = false;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<main class="demo"><section class="intro"><span class="eyebrow">MX / HTML TABLE</span><h1>CC 牌桌 · DOM 迁移</h1><p class="description">沿用 CC 默认桌布、座位计算与卡牌动画参数。用下方操作核对发牌、翻牌、弃牌和静态恢复；进入牌桌后，在“测试”菜单选择保险、二道牌、加时及结算看牌。</p><div class="status"><i></i><span id="status">后台准备牌桌资源</span></div><div class="controls"><button id="enter">进入演示房间 <span>↗</span></button><button id="switch">切换房间</button><button id="fail">模拟进房失败</button><label>预览 <select id="preview-mode"><option value="portrait">竖屏</option><option value="landscape">横屏</option><option value="auto" selected>随窗口</option></select></label><button id="deal">重新发牌</button><button id="face-bet">对手下注 / 测试跟注</button><button id="advance">发下一轮公共牌</button><button id="fold-other">对手弃牌</button><button id="fold-self">自己弃牌</button><button id="sync">同步快照 / 中断动画</button><label>座位数 <select id="seats"><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option selected>9</option></select></label></div><p class="disclaimer">本页使用模拟房间数据，不连接游戏服务、不扣费。新增演示位于牌桌“测试”菜单。</p><details open><summary>生命周期记录</summary><ol id="log"></ol></details></section><section class="phone"><div class="lobby"><span class="lobby-mark">♠</span><h2>德州俱乐部</h2><p>房间尚未打开</p><small>牌桌资源在后台预加载</small></div><div id="game"></div></section></main>`;
const logList = document.querySelector<HTMLOListElement>('#log')!;
function log(message: string) {
  const item = document.createElement('li');
  item.textContent = message;
  logList.prepend(item);
  while (logList.children.length > 12) logList.lastElementChild?.remove();
}
const host = new DemoHost(log);
let previous = '';
const game = mountGame(document.querySelector<HTMLDivElement>('#game')!, {
  host,
  preferences: settings,
  demoScenarios: [...host.features.scenarios,...Array.from({length:8},(_,i)=>({label:`布局验收 · ${i+2} 人桌`,run:()=>host.setSeats(i+2)}))],
  layout: 'auto',
  onNavigate(action) {
    const label = { report: '战绩', replay: '牌谱', emoji: '表情', effect: '窗花', voice: '语音', camera: '视频' }[action];
    log(`${label}：导航事件已触发，业务面板待接入`);
    const notice = document.querySelector<HTMLElement>('.mx-error');
    if (notice) notice.textContent = `${label}面板尚未接入（当前为布局演示）`;
  },
  onState(state) {
    const labels = {
      hidden: '后台预加载',
      loading: '显示加载页面',
      entering: '请求房间数据',
      table: '数据驱动牌桌',
      error: '等待重试',
      destroyed: '已销毁',
    };
    document.querySelector('#status')!.textContent =
      state.phase === 'hidden' && state.progress === 1
        ? '资源已就绪 · 等待进房'
        : `${labels[state.phase]} · ${Math.round(state.progress * 100)}%`;
    if (previous !== state.phase) {
      previous = state.phase;
      log(labels[state.phase]);
    }
  },
});
const target = { roomID: 1001, matchID: 0, roomType: 0 };
document.querySelector<HTMLButtonElement>('#enter')!.onclick = () => {
  void game.enter(target);
};
document.querySelector<HTMLButtonElement>('#switch')!.onclick = () => {
  target.roomID = target.roomID === 1001 ? 1002 : 1001;
  void game.enter({ ...target });
};
document.querySelector<HTMLButtonElement>('#fail')!.onclick = () => {
  host.failNext = true;
  void game.enter(target);
};
document.querySelector<HTMLButtonElement>('#advance')!.onclick = () => host.advance();
window.addEventListener('pagehide', () => game.destroy(), { once: true });

document.querySelector<HTMLButtonElement>('#deal')!.onclick = () => host.deal();
document.querySelector<HTMLButtonElement>('#fold-other')!.onclick = () => host.fold();
document.querySelector<HTMLButtonElement>('#fold-self')!.onclick = () => host.fold(1);
document.querySelector<HTMLButtonElement>('#sync')!.onclick = () => host.sync();
document.querySelector<HTMLSelectElement>('#seats')!.onchange = (event) =>
  host.setSeats(Number((event.target as HTMLSelectElement).value));

const demo = document.querySelector<HTMLElement>('.demo')!;
const previewMode = document.querySelector<HTMLSelectElement>('#preview-mode')!;
demo.dataset.preview = previewMode.value;
previewMode.onchange = () => {
  demo.dataset.preview = previewMode.value;
};
if (new URLSearchParams(location.search).has('table')) {
  document.body.classList.add('table-preview');
  void game.enter(target);
}

document.querySelector<HTMLButtonElement>('#face-bet')!.onclick = () => host.faceBet();
