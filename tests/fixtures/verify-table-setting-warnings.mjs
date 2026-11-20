import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.MX_PLAYWRIGHT_MODULE || 'playwright-core');
const { default: sharp } = await import('sharp');
const source = await readFile(new URL('../../src/logic/GameplayTableSetting.ts', import.meta.url), 'utf8');
const permissionKeys = [...source.matchAll(/IsPermitted\('([^']+)'\)/g)].map(match => match[1]);
const base = process.env.MX_AUDIT_BASE || 'http://127.0.0.1:4181';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.MX_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--mute-audio'],
});
const cases = [];
const warnings = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1200 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const layout of ['original', 'classic', 'balanced', 'oval']) {
    for (const [width, height, orientation] of [[440, 782, 'portrait'], [320, 500, 'portrait'], [844, 390, 'auto']]) {
      await page.goto(`${base}/tests/fixtures/layout-audit.html?${new URLSearchParams({ layout, scene: 'rules', width, height, orientation })}`);
      await page.locator('#audit-stage[data-ready=true]').waitFor();
      await page.evaluate(async permissionKeys => {
        const [{ GameplayTableSettingView }, { GameplayTableSettingData }, { GameplayTableSetting }, { ProtocolRuntime }, { i18nMgr }, { resources }] = await Promise.all([
          import('/src/assets/style1/table/components/GameplayTableSettingView/GameplayTableSettingView.ts'),
          import('/src/data/GameplayTableSettingData.ts'),
          import('/src/logic/GameplayTableSetting.ts'),
          import('/src/net/ProtocolRuntime.ts'),
          import('/src/i18n/i18nMgr.ts'),
          import('/src/assets/style1/table/resources.ts'),
        ]);
        const pb = await new ProtocolRuntime().load();
        const path = 'raw/ui/infoTip.png';
        const url = resources.rawImages[path];
        const pageIndex = resources.pages.length;
        resources.pages.push({ url, width: 45, height: 45 });
        resources.frames[path] = { page: pageIndex, x: 0, y: 0, width: 45, height: 45 };
        const data = new GameplayTableSettingData();
        data.roomPermissions = Object.fromEntries(permissionKeys.map(key => [key, 1]));
        const original = document.querySelector('.mx-buyin-body > .mx-room-settings');
        original.hidden = true;
        let view;
        window.warningAudit = {
          setup(storage, enabled, mode) {
            if (storage === 'atlas') delete resources.rawImages[path];
            else resources.rawImages[path] = url;
            view?.destroy();
            const record = Object.assign(new pb.RoomRecord().toObject(), {
              name: '警示字段回归', randomSeat: enabled ? 1 : 2, onlyIos: enabled ? 1 : 2,
              forceShowCard: enabled ? 1 : 2, calltime: 1, calltimeWinLine: 10, calltimeLimit: 5,
              criticalHit: enabled ? 1 : 0, rounds: 3, ante: 400,
              jackpot: 1, jackpotConfig: Object.assign(new pb.RoomJackpotConfig().toObject(), {
                contributePotSwitch: 1, contributePotLimit: 10, awardBetSwitch: 1, awardBetLimit: 20,
                awardOtherSwitch: 1, awardRoundType: enabled ? 1 : 2,
              }),
            });
            const info = Object.assign(new pb.RoomInfo().toObject(), {
              smallBlind: 1000, currentMinRate: 20, currentMaxRate: 100,
              limitIp: enabled, limitGps: enabled, seatedMessaging: enabled,
              delaySeeCard: enabled, antiCheatType: enabled ? 3 : 0,
              randomAnte: enabled ? '[100,200,50]' : '[]', autoChangeRoomLimitHand: enabled ? 5 : 0,
            });
            data.update(record, info, new pb.HandInfo().toObject());
            view = new GameplayTableSettingView(data);
            view.root.dataset.warningAudit = 'true';
            document.querySelector('.mx-buyin-body').append(view.root);
            document.querySelector('.mx-buyin-panel').dataset.step = mode;
            view.show(mode);
            const rows = mode === 'rules'
              ? new GameplayTableSetting(data.basicInfo, data.roomPermissions, key => i18nMgr.Get(key)).getRows()
              : [{ id: 'UICreateTable_randSeat', title: i18nMgr.Get('UICreateTable_randSeat'), tips: i18nMgr.Get('UICreateTable_randSeatTips') }];
            return rows.map(({ id, title, value, tips }) => ({ id, title, value, tips }));
          },
        };
      }, permissionKeys);
      for (const storage of ['raw', 'atlas']) {
        for (const enabled of [false, true]) {
          for (const mode of ['security', 'rules']) {
            const expected = await page.evaluate(args => window.warningAudit.setup(...args), [storage, enabled, mode]);
            const root = page.locator('[data-warning-audit=true]');
            if (mode === 'rules') assert.equal(await root.locator('.mx-room-setting-row').count(), expected.length);
            for (const row of expected) {
              const node = root.locator(`.mx-room-setting-row[data-id="${row.id}"]`);
              assert.equal(await node.locator('.mx-room-setting-label').textContent(), row.title);
              if (row.value !== undefined) assert.equal(await node.locator('.mx-room-setting-value').textContent(), row.value);
              assert.equal(await node.locator('.mx-room-setting-info').isVisible(), Boolean(row.tips));
              if (!row.tips) continue;
              warnings.add(row.id);
              const icon = node.locator('.mx-room-setting-info');
              await icon.scrollIntoViewIfNeeded();
              const rect = await icon.boundingBox();
              assert.ok(rect.width > 0 && Math.abs(rect.width - rect.height) < 0.1, `${layout}/${row.id}: deformed icon`);
              await icon.click();
              assert.equal(await root.locator('.mx-room-settings-tooltip').isVisible(), true);
              assert.equal(await root.locator('.mx-room-settings-tooltip strong').textContent(), row.title);
              assert.equal(await root.locator('.mx-room-settings-tooltip p').textContent(), row.tips);
              await root.locator('.mx-room-settings-tip-close').click();
            }
            const banner = root.locator('.mx-room-settings-warning');
            assert.equal(await banner.isVisible(), !enabled);
            if (process.env.MX_WARNING_SCREENSHOT && layout === 'balanced' && width === 440 && storage === 'raw' && !enabled && mode === 'rules') {
              await page.locator('.mx-buyin-body').evaluate(node => { node.scrollTop = 0; });
              await page.locator('#audit-stage').screenshot({ path: process.env.MX_WARNING_SCREENSHOT });
            }
            cases.push({ layout, width, height, storage, enabled, mode });
          }
        }
      }
    }
  }
  for (const layout of ['original', 'classic', 'balanced', 'oval']) {
    for (const [width, height] of [[440, 782], [320, 500]]) {
      await page.goto(`${base}/tests/fixtures/layout-audit.html?${new URLSearchParams({ layout, scene: 'bring-deposit', width, height })}`);
      await page.locator('#audit-stage[data-ready=true]').waitFor();
      await page.locator('.mx-buyin-cancel').click();
      const tip = page.locator('.mx-buyin-tip-button');
      assert.equal(await tip.isVisible(), true);
      const rect = await tip.boundingBox();
      assert.ok(Math.abs(rect.width - rect.height) < 0.1, 'deposit warning is stretched');
      await tip.click();
      assert.equal(await page.locator('.mx-buyin-tip').isVisible(), true);
      assert.ok((await page.locator('.mx-buyin-tip').textContent()).length > 0);
      await tip.click();
      assert.equal(await page.locator('.mx-buyin-tip').isVisible(), false);
    }
  }
  // Check the actual pixels too: a rectangular host must retain a round red icon and white glyph.
  const icon = await page.evaluateHandle(async () => {
    const { SpriteAtlas } = await import('/src/assets/style1/table/SpriteAtlas.ts');
    const { resources } = await import('/src/assets/style1/table/resources.ts');
    resources.rawImages['raw/ui/infoTip.png'] ??= resources.pages.at(-1).url;
    const node = document.createElement('span');
    node.style.cssText = 'position:fixed;left:600px;top:30px;width:90px;height:45px;z-index:9999';
    SpriteAtlas.paintWarning(node);
    document.body.append(node);
    return node;
  });
  const { data, info } = await sharp(await icon.asElement().screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1, white = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] > 200 && data[i + 1] < 100 && data[i + 2] < 120) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    if (x > 40 && x < 50 && data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) white++;
  }
  assert.ok(maxX > minX && Math.abs((maxX - minX) - (maxY - minY)) <= 2, 'red circle missing or stretched');
  assert.ok(white > 5, 'white exclamation glyph missing');
  assert.deepEqual(errors, []);
  console.log(`${cases.length} settings cases passed; ${warnings.size} distinct warning fields, raw/atlas, enabled/disabled, tooltip clicks and icon pixels verified; 8 deposit cases passed`);
} finally {
  await browser.close();
}
