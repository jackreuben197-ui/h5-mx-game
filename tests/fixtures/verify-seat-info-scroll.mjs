import assert from 'node:assert/strict';

const { chromium } = await import(process.env.MX_PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.MX_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--mute-audio'],
});
const base = process.env.MX_AUDIT_BASE || 'http://127.0.0.1:4181';
const results = [];

try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1200 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const seat = id => page.locator(`.mx-seat[data-seat="${id}"]`);
  const stack = id => seat(id).locator('.mx-stack');
  const animated = async locator => locator.evaluate(node => node.querySelector('.mx-seat-info-text').getAnimations().length);
  const editChips = async (id, value) => {
    await page.locator('[data-audit-field=seat]').fill(String(id));
    await page.locator('[data-audit-field=seat]').dispatchEvent('change');
    await page.locator('[data-audit-field=chips]').fill(String(value));
    await page.getByRole('button', { name: '应用玩家元素', exact: true }).click();
  };
  const nextLayout = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  for (const layout of ['original', 'classic', 'balanced', 'oval']) {
    for (const [width, height, scale, orientation] of [[440, 782, 100, 'portrait'], [320, 500, 110, 'portrait'], [844, 390, 100, 'auto']]) {
      for (const bb of [0, 1]) {
        await page.goto(`${base}/tests/fixtures/layout-audit.html?${new URLSearchParams({
          layout, scene: 'long', width, height, scale, orientation, bb, actor: 2,
        })}`, { waitUntil: 'domcontentloaded' });
        await page.locator('#audit-stage[data-ready=true]').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await nextLayout();
        // Ordinary formatted balances remain stationary, even with a long nickname nearby.
        assert.equal(await animated(stack(2)), 0, `${layout}: short balance scrolls`);
        const before = await stack(2).boundingBox();
        const editor = page.locator('details').filter({ has: page.locator('[data-audit-field=seat]') });
        await editor.evaluate(node => { node.open = true; });
        for (const id of [2, 1]) await editChips(id, 9007199254740900);
        await page.waitForFunction(() => [1, 2].every(id => document.querySelector(`.mx-seat[data-seat="${id}"] .mx-stack .mx-seat-info-text`).getAnimations().length === 1));
        const after = await stack(2).boundingBox();
        assert.ok(Math.abs(before.width - after.width) < 0.1, `${layout}: bubble expands for long balance`);
        assert.ok(Math.abs(before.height - after.height) < 0.1, `${layout}: balance height changes`);
        assert.equal(await stack(2).locator('.mx-seat-info-text > .mx-chip-unit').count(), bb);
        assert.equal(await animated(seat(2).locator('.mx-player-name')), 1);
        // Sample a whole cycle, including the handoff to the next identical copy.
        const tickers = [stack(1), stack(2), seat(2).locator('.mx-player-name')];
        for (const ticker of tickers) {
          const bounds = await ticker.evaluate(node => {
            const text = node.querySelector('.mx-seat-info-text');
            const repeat = text.querySelector('.mx-seat-info-repeat');
            const animation = text.getAnimations()[0];
            const { duration, delay } = animation.effect.getTiming();
            const startTime = Number(delay);
            const period = Number(duration);
            animation.pause();
            animation.currentTime = startTime;
            const start = text.getBoundingClientRect().left - node.getBoundingClientRect().left;
            const positions = Array.from({ length: 11 }, (_, i) => {
              animation.currentTime = startTime + period * i / 11;
              return text.getBoundingClientRect().left;
            });
            // When the original tail reaches the edge, the full amount including BB is readable.
            const distance = parseFloat(repeat.style.left);
            animation.currentTime = startTime + period * (text.offsetWidth - node.clientWidth) / distance;
            const end = text.getBoundingClientRect().right - node.getBoundingClientRect().right;
            animation.currentTime = startTime + period - 0.01;
            const handoff = repeat.getBoundingClientRect().left;
            animation.currentTime = startTime + period + 0.01;
            const wrapped = text.getBoundingClientRect().left;
            animation.play();
            return { start, end, positions, seam: handoff - wrapped, hidden: repeat.getAttribute('aria-hidden'), same: repeat.textContent === [...text.childNodes].filter(child => child !== repeat).map(child => child.textContent).join(''), overflow: getComputedStyle(node).overflowX, ellipsis: getComputedStyle(node).textOverflow };
          });
          assert.ok(Math.abs(bounds.start) < 1 && Math.abs(bounds.end) < 1, JSON.stringify({ layout, bounds }));
          assert.ok(bounds.positions.every((x, i, xs) => !i || x < xs[i - 1]), `${layout}: text reverses direction`);
          assert.ok(Math.abs(bounds.seam) < 0.1, `${layout}: loop jumps`);
          assert.equal(bounds.hidden, 'true');
          assert.equal(bounds.same, true);
          assert.equal(bounds.overflow, 'hidden');
          assert.equal(bounds.ellipsis, 'clip');
        }
        // A same-value refresh preserves progress; changed/short values reset and stop immediately.
        const progress = await stack(2).evaluate(node => {
          const animation = node.querySelector('.mx-seat-info-text').getAnimations()[0];
          animation.pause(); animation.currentTime = 2500;
          return animation.currentTime;
        });
        await editChips(2, 9007199254740900);
        assert.equal(await stack(2).evaluate(node => node.querySelector('.mx-seat-info-text').getAnimations()[0].currentTime), progress);
        await editChips(2, 0);
        await nextLayout();
        assert.equal(await animated(stack(2)), 0);
        assert.match(await stack(2).textContent(), bb ? /^0BB$/ : /^0$/);
        results.push({ layout, width, height, scale, orientation, bb });
      }
    }
  }

  // Verify component ownership and cleanup independently from a page navigation.
  const lifecycle = await page.evaluate(async () => {
    const { SeatInfoTicker } = await import('/src/assets/style1/table/components/SeatIdentityView/SeatInfoTicker.ts');
    const viewport = document.createElement('div');
    viewport.style.cssText = 'width:40px;font-size:20px';
    document.body.append(viewport);
    const ticker = new SeatInfoTicker(viewport);
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    ticker.render('12345678901234567890', 'old-player');
    await frame();
    const first = ticker.text.getAnimations()[0];
    first.pause(); first.currentTime = 4000;
    ticker.render('12345678901234567890', 'new-player');
    await frame();
    const restarted = ticker.text.getAnimations()[0] !== first;
    viewport.style.width = '800px';
    await frame(); await frame();
    const stopped = ticker.text.getAnimations().length === 0;
    viewport.style.width = '40px';
    await frame(); await frame();
    const resumed = ticker.text.getAnimations().length === 1;
    ticker.refresh(); ticker.destroy();
    await frame();
    const cleaned = ticker.text.getAnimations().length === 0;
    viewport.remove();
    return { restarted, stopped, resumed, cleaned };
  });
  assert.deepEqual(lifecycle, { restarted: true, stopped: true, resumed: true, cleaned: true });
  assert.deepEqual(errors, []);
  console.log(`${results.length} seat bubble layout cases and ticker lifecycle passed`);
} finally {
  await browser.close();
}
