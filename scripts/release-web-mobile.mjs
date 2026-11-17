import { cp, mkdir, mkdtemp, realpath, readFile, rm, symlink, writeFile, access } from 'node:fs/promises';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { releaseSource } from './release-source.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (file, args, cwd = root) => execFileSync(file, args, { cwd, stdio: 'inherit', env: process.env });
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const exists = async path => { try { await access(path); return true; } catch { return false; } };
const explicit = process.env.MX_H5_ROOT;
const candidates = explicit ? [resolve(explicit)] : [resolve(root, 'deps/h5-game')];
const shell = (await Promise.all(candidates.map(async path => await exists(join(path, 'node_modules/vite/dist/node/index.js')) ? path : null))).find(Boolean);
if (!shell) throw new Error('未找到已安装依赖的 H5。请设置 MX_H5_ROOT 指向原 H5 项目，并按其锁文件安装依赖。');
const mode = process.env.MX_RELEASE_MODE || 'production';
if (['development', 'h5'].includes(mode)) throw new Error('release:web-mobile 不允许依赖开发代理的 development/h5 模式。');
const workspace = await realpath(await mkdtemp(join(tmpdir(), 'mx-web-mobile-')));
const stage = join(workspace, 'h5');
const output = join(root, 'dist/web-mobile');
const stagedOutput = join(workspace, 'web-mobile');
const previousCwd = process.cwd();
try {
  await cp(shell, stage, { recursive: true, filter: source => {
    const first = relative(shell, source).split('/')[0];
    return !['node_modules', '.git', 'dist', '.idea'].includes(first);
  } });
  await symlink(join(shell, 'node_modules'), join(stage, 'node_modules'), 'dir');
  const vite = await import(pathToFileURL(join(shell, 'node_modules/vite/dist/node/index.js')).href);
  process.chdir(stage);
  const env = vite.loadEnv(mode, stage, 'VITE_');
  // MX 与 H5 使用同一服务环境，WS 仍完全由 H5 管理。
  const api = process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL;
  if (!api) throw new Error('H5 未配置 VITE_API_BASE_URL。');
  process.env.VITE_MX_API_BASE_URL = process.env.VITE_MX_API_BASE_URL || api;
  run(process.execPath, ['scripts/check-protocol.mjs'], stage);
  run(process.execPath, ['scripts/sync-i18n.mjs'], stage);
  run('npm', ['run', 'check']);
  run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.host.config.ts', '--mode', mode]);
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const h5Source = releaseSource(shell, root);
  const version = { version: pkg.version, mxCommit: git(root, 'rev-parse', 'HEAD'),
    h5Commit: h5Source.kind === 'repository' ? h5Source.commit : null, h5Source,
    mxDirty: !!git(root, 'status', '--porcelain'), h5Dirty: h5Source.dirty, mode, builtAt: new Date().toISOString() };
  version.buildId = createHash('sha256').update(JSON.stringify(version)).digest('hex').slice(0, 16);
  const clientDir = `mx-client/${version.buildId}`;
  const manifest = JSON.parse(await readFile(join(root, 'dist/client/.vite/manifest.json'), 'utf8'));
  const entry = manifest['src/host-entry.ts'];
  const cssFiles = [...new Set([...(entry?.css || []), ...Object.values(manifest).filter(item => item.file.endsWith('.css')).map(item => item.file)])];
  if (!entry?.file || !cssFiles.length) throw new Error('MX manifest 缺少入口或 CSS。');
  const htmlPath = join(stage, 'index.html');
  let html = await readFile(htmlPath, 'utf8');
  if (!html.includes('<div id="app">') || !html.includes('/src/entry/cocos-h5-entry.ts')) throw new Error('H5 入口结构已改变，请更新发布适配。');
  html = html.replace('./h5-cc-i18n.min.js', `./h5-cc-i18n.min.js?v=${version.buildId}`).replace('</head>', `<style>#mx-table-host{position:fixed;inset:0;height:100dvh;z-index:1;pointer-events:none}#mx-table-host>.mx-game{pointer-events:auto}</style></head>`)
    .replace(/<body[^>]*>[\s\S]*<\/body>/, '<body><div id="mx-table-host"></div><div id="app"></div><input id="OpenImageFile" type="file" accept=".png,.jpg,.jpeg" hidden><script type="module" src="/mx-release-entry.js"></script></body>');
  await writeFile(htmlPath, html);
  const virtual = '\0mx-release-entry';
  const loaded = await vite.loadConfigFromFile({ command: 'build', mode }, join(stage, 'vite.config.ts'));
  if (!loaded) throw new Error('无法加载 H5 Vite 配置。');
  await vite.build({ ...loaded.config, configFile: false, root: stage, base: './',
    build: { ...loaded.config.build, outDir: stagedOutput, emptyOutDir: true, manifest: true },
    plugins: [...loaded.config.plugins, {
      name: 'mx-static-release',
      resolveId(id) { if (id === '/mx-release-entry.js') return virtual; },
      load(id) {
        if (id !== virtual) return;
        return `import '/src/entry/cocos-h5-entry.ts';
          import router from '/src/router/index.ts';
          import { pinia } from '/src/stores/pinia.ts';
          import { useLoginModalStore } from '/src/stores/loginModal.ts';
          (async () => {
            const cssFiles = ${JSON.stringify(cssFiles)};
            await Promise.all(cssFiles.map(file => new Promise((resolve, reject) => {
              const link = document.createElement('link'); link.rel = 'stylesheet';
              link.href = new URL(${JSON.stringify(clientDir + '/')} + file, document.baseURI).href;
              link.onload = resolve; link.onerror = reject; document.head.appendChild(link);
            })));
            const url = new URL(${JSON.stringify(clientDir + '/' + entry.file)}, document.baseURI).href;
            const { mountMxGame } = await import(/* @vite-ignore */ url);
            const game = mountMxGame(document.getElementById('mx-table-host'), {layout:'auto'});
            window.addEventListener('pagehide', event => { if (!event.persisted) game.destroy(); });
            await router.isReady();
            if (new URLSearchParams(location.search).get('login') === '1') useLoginModalStore(pinia).open();
          })().catch(error => { console.error('MX startup failed', error); });`;
      }
    }] });
  await cp(join(root, 'dist/client'), join(stagedOutput, clientDir), { recursive: true });
  await writeFile(join(stagedOutput, 'version.json'), JSON.stringify(version, null, 2) + '\n');
  // 构建成功才替换输出；失败不破坏上一次可部署目录。
  await mkdir(dirname(output), { recursive: true });
  await rm(output, { recursive: true, force: true });
  await cp(stagedOutput, output, { recursive: true });
  console.log(`\n静态发布目录: ${output}\n版本: ${version.buildId}\nH5 来源: ${shell}\nAPI: ${api}`);
} finally {
  process.chdir(previousCwd);
  await rm(workspace, { recursive: true, force: true });
}
