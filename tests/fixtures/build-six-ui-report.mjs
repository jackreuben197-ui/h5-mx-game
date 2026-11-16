import{readFile,writeFile}from'node:fs/promises';
const root='docs/qa/layout-audit-2026-11-16',rows=JSON.parse(await readFile(root+'/round2/results.json','utf8'));
const names={original:'初代牌桌',balanced:'均衡环形',oval:'竞技椭圆',classic:'经典'};
const refs={original:'original-full-original.png',balanced:'balanced-100-original.png',oval:'oval-100-crop.png',classic:'classic-100-crop.png'};
const changes=[['桌布颜色','紫色换用 Figma 12026:53753 独立原素材；旧紫色偏好自动迁移。蓝/绿保留原透明纹理与调色。','figma'],['公共牌','每排按实际张数排列，卡片边界相接，整排水平居中；两排分别居中。','six'],['下注筹码','对手下注先按头像局部坐标放置，再避让公共牌区域；金额及筹码图标均纳入检查。','figma'],['操作气泡','新布局上移至头像上沿，保留昵称空间；普通操作改为设计稿青色，保险及 All-in 保留专用颜色。','acting-other'],['本人倒计时','本人行动倒计时移到弃牌按钮；对手仍围绕头像；留座计时继续围绕头像。','acting-self'],['状态轮廓','等待、补盲、留座遮罩跟随头像圆角；均衡使用圆角方形，其他布局沿用对应轮廓。','waiting-0']];
let html=`<!doctype html><meta charset="utf-8"><title>六项 UI 复核 · Figma 对照</title><style>body{font:15px/1.6 system-ui;margin:24px;background:#eef1f4;color:#18212c}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #ccd3db;padding:10px;vertical-align:top}img{max-width:100%;height:auto}.pair{display:grid;grid-template-columns:1fr 1fr;gap:15px}.pair img{width:440px}section{margin:28px 0}a{color:#1764a4}small{color:#586575}</style><h1>六项 UI 复核 · Figma 原稿 / 当前实现</h1><p>本轮截图均为真实组件的本地合成数据，非真实服务器牌局。覆盖四布局 × 三尺寸 × 五场景，共 ${rows.length} 项几何检查；通过 ${rows.filter(r=>!r.failures.length).length} 项。320×400、375×500 使用 110%，440×782 使用 100%。构建和几何检查不等于全状态像素级对齐。</p><p>原稿与运行状态不完全相同，昵称、金额、牌值等合成内容不作为像素差异错误。初代原图保持 1242×2688 比例，不强行拉伸到现代设计尺寸。公共牌无间隔按用户明确要求执行。</p><p><a href="../index.html">此前完整工作台报告（历史截图）</a> · <a href="results.json">60 项详细坐标</a> · <a href="countdown-results.json">倒计时交互结果</a> · <a href="color-samples.json">桌布空白点 RGB 对照（紫0 / 蓝3 / 绿5 最大通道差）</a></p>`;
for(const [layout,name]of Object.entries(names)){
 html+=`<section><h2>${name}</h2><div class="pair"><div>Figma 原稿<br><a href="../reference/${refs[layout]}"><img src="../reference/${refs[layout]}"></a></div><div>当前实现 · 440×782<br><a href="${layout}-440-figma.png"><img src="${layout}-440-figma.png"></a></div></div><table><tr><th>验收项</th><th>修改与核对方式</th><th>对应截图</th></tr>`;
 for(const [item,description,scene]of changes)html+=`<tr><td>${item}</td><td>${description}${layout==='original'&&item==='桌布颜色'?' 初代继续使用原背景，不替换为纯色桌布。':''}</td><td><a href="${layout}-440-${scene}.png">100% 原尺寸截图</a></td></tr>`;
 html+='</table><h3>逐尺寸 / 逐场景记录</h3><table><tr><th>尺寸 / 档位</th><th>场景</th><th>检查结果</th><th>截图</th></tr>';
 for(const r of rows.filter(r=>r.layout===layout))html+=`<tr><td>${r.width}×${r.height} / ${r.scale}%</td><td>${r.scene}</td><td>${r.failures.join('；')||'通过：公共牌居中/零间距、筹码避让、适用倒计时/状态轮廓'}</td><td><a href="${r.id}.png"><img loading="lazy" width="160" src="${r.id}.png"></a></td></tr>`;
 html+='</table></section>';
}
html+='<h2>原稿来源</h2><p>初代：Figma 748:23506（用户所指 748:30704 附近）；均衡：12026:53752；紫色独立桌布：12026:53753。椭圆与经典来自用户“最终交付”的完整图，裁切坐标和完整源图保留于上一轮报告。<a href="../reference/purple-felt-original.png">紫色桌布原图</a>。</p>';
await writeFile(root+'/round2/index.html',html);
const old=await readFile(root+'/index.html','utf8');if(!old.includes('round2/index.html'))await writeFile(root+'/index.html',old.replace(/(<body[^>]*>)/,'$1<p style="padding:20px;background:#ffe9a5;color:#222"><a href="round2/index.html">打开最新六项修复的 Figma 对照与验收报告</a>。下方为上一轮历史截图；初代完整原稿现已补齐。</p>'));
console.log('round2 report built',rows.length);
