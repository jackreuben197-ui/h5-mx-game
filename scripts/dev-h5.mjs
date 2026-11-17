import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer as createMxServer } from 'vite';

const mxRoot = fileURLToPath(new URL('..', import.meta.url));
const siblingH5 = resolve(mxRoot, '../h5-game');
const h5Root = resolve(mxRoot, process.env.MX_H5_ROOT || (existsSync(resolve(siblingH5,'node_modules/vite/dist/node/index.js')) ? siblingH5 : 'deps/h5-game'));
const h5Vite = resolve(h5Root, 'node_modules/vite/dist/node/index.js');
const host = '127.0.0.1';
const port = Number(process.env.MX_H5_PORT || 5175);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('MX_H5_PORT 必须为 1024–65535 的整数。');
}
// 保留双终端流程使用的 MX 源码端口 4179，无论先启动哪套流程。
const mxPort = port === 4180 ? 4181 : 4180;
if (!existsSync(h5Vite)) {
  throw new Error(`H5 依赖未安装：${h5Root}。请在该目录安装依赖，或使用 MX_H5_ROOT 指定已有的 H5 工作区。`);
}

const h5Origin = `http://${host}:${port}`;
const h5Entry = '/src/entry/cocos-h5-entry.ts';
const entryPath = '/mx-h5-dev-entry.js';
const entryId = '\0mx-h5-dev-entry';
const mode = 'development';
const servers = [];

try {
  const mx = await createMxServer({
    root: mxRoot,
    cacheDir: 'node_modules/.vite-h5',
    server: { host, port: mxPort, strictPort: true, cors: { origin: h5Origin } },
  });
  servers.push(mx);
  await mx.listen();
  const mxEntry = new URL('/src/host-entry.ts', mx.resolvedUrls.local[0]).href;

  // H5 的 Vite 配置用 cwd 查找 .env，使用该工作区安装的 Vite 和插件。
  process.chdir(h5Root);
  // Keep the shell's selected protocol version. Forcing the installed legacy
  // package can remove newer exports required by the shell login overlay.
  process.env.VITE_H5_ONLY = 'false';
  process.env.VITE_WS_PROXY_URL = '';
  process.env.VITE_WS_URL_TEMPLATE = `ws://${host}:${port}/mx-ws{0}`;
  const { createServer, loadConfigFromFile } = await import(pathToFileURL(h5Vite).href);
  const loaded = await loadConfigFromFile({ command: 'serve', mode }, resolve(h5Root, 'vite.config.ts'));
  const config = loaded?.config;
  const apiProxy = config?.server?.proxy?.['/api'];
  if (!apiProxy?.target) throw new Error('H5 Vite 配置缺少 /api 代理目标。');

  const wsTarget = new URL(apiProxy.target);
  wsTarget.protocol = wsTarget.protocol === 'https:' ? 'wss:' : 'ws:';
  let proxy;
  const vantRoot = resolve(h5Root, 'node_modules/vant/es');
  const include = [...(config.optimizeDeps?.include ?? [])];
  if (existsSync(vantRoot)) {
    // Vant 组件由 Vue 插件按需导入。提前优化样式入口，避免冷启动时路由被依赖重编译打断。
    include.push('vant/es');
    for (const name of readdirSync(vantRoot)) {
      if (existsSync(resolve(vantRoot, name, 'style/index.mjs'))) include.push(`vant/es/${name}/style/index`);
    }
  }

  const h5 = await createServer({
    ...config,
    configFile: false,
    root: h5Root,
    mode,
    cacheDir: `node_modules/.vite-mx-${port}`,
    optimizeDeps: { ...config.optimizeDeps, include },
    plugins: [...config.plugins, {
      name: 'mx-h5-dev',
      resolveId(id) {
        if (id === entryPath) return entryId;
      },
      load(id) {
        if (id !== entryId) return;
        return `
          import ${JSON.stringify(h5Entry)};
          import router from '/src/router/index.ts';
          import { pinia } from '/src/stores/pinia.ts';
          import { useLoginModalStore } from '/src/stores/loginModal.ts';

          const { mountMxGame } = await import(/* @vite-ignore */ ${JSON.stringify(mxEntry)});
          const game = mountMxGame(document.getElementById('mx-table-host'), { layout: 'auto' });
          window.addEventListener('pagehide', event => {
            if (!event.persisted) game.destroy();
          });
          await router.isReady();
          if (new URLSearchParams(location.search).get('login') === '1') {
            useLoginModalStore(pinia).open();
          }
        `;
      },
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          if (!html.includes(h5Entry) || !html.includes('<div id="app">')) {
            throw new Error('H5 入口结构已改变，请核对 dev:h5 挂载位置。');
          }
          return html
            .replace('</head>', `
              <style>
                #mx-table-host { position: fixed; inset: 0; height: 100dvh; z-index: 1; pointer-events: none; }
                #mx-table-host > .mx-game { pointer-events: auto; }
              </style>
            </head>`)
            .replace(/<body[^>]*>[\s\S]*<\/body>/, `<body>
              <div id="mx-table-host"></div>
              <div id="app"></div>
              <input id="OpenImageFile" type="file" accept=".png,.jpg,.jpeg" hidden>
              <script type="module" src="${entryPath}"></script>
            </body>`);
        },
      },
      configureServer(server) {
        server.httpServer.on('upgrade', (request, socket, head) => {
          if (!request.url?.startsWith('/mx-ws:')) return;
          const match = /^\/mx-ws:([1-9]\d{0,4})$/.exec(request.url);
          if (!match || Number(match[1]) > 65535 || request.headers.origin !== h5Origin) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
          }

          // H5 登录下发端口，目标主机来自 H5 的测试环境配置。
          const target = new URL(wsTarget);
          target.port = match[1];
          request.url = '/';
          proxy.ws(request, socket, head, {
            target: target.origin,
            secure: true,
            rewriteWsOrigin: false,
            // 测试服识别的本地开发 Origin，与实际监听端口无关。
            headers: { origin: 'http://localhost:5174' },
          });
        });
      },
    }],
    server: {
      ...config.server,
      host,
      port,
      strictPort: true,
      proxy: {
        ...config.server.proxy,
        '/api': {
          ...apiProxy,
          configure(instance, options) {
            apiProxy.configure?.(instance, options);
            proxy = instance;
          },
        },
      },
    },
  });
  servers.push(h5);
  await h5.listen();
  console.log(`H5 + MX 联调：${h5Origin}/#/home\nH5 源码：${h5Root}`);
} catch (error) {
  await Promise.allSettled(servers.map(server => server.close()));
  throw error;
}
