import {expect, test, type Page} from '@playwright/test';

/**
 * Session AF Gate C (design critique, money pages 7): the floating launchers on the right edge (Earn dock, music, Checklist,
 * ZIGi) covered Governance's "Staking" button at 768 px, Add money's step text and Solana's choice ring, and on a phone
 * Earn's "Nothing here is advice" line. While they are on the right, Governance and Add money keep the lane Earn's paths
 * and Today's rail keep: no word or control of those pages sits under a floating button, wherever the page is scrolled;
 * on a phone the first screen's disclaimer and Add money's step line keep clear of ZIGi's button.
 */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.emulateMedia({reducedMotion: 'reduce'});
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
const LAUNCHERS = '[data-testid="ai-launcher"] :is(button, a, .ai-launcher-ring), .music-launcher-stack button, .checklist-launcher-stack button, .earn-dock-stack button';
/** Every word and control of `root` that a floating button covers, the page swept through in 40 px steps. */
function covered(page: Page, root: string) {
  return page.evaluate(async ({root, selector}) => {
    const frame = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const launchers = [...document.querySelectorAll(selector)].filter(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; });
    const host = document.querySelector(root)!;
    const things = () => {
      const out: {text: string; r: DOMRect}[] = [];
      const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT); let n: Node | null;
      while ((n = walk.nextNode())) { const t = n.textContent!.trim(), el = n.parentElement!; if (!t || el.closest('.sr-only, [hidden], [aria-hidden="true"], .header-art-slot') || getComputedStyle(el).visibility === 'hidden') continue;
        const range = document.createRange(); range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push({text: t.slice(0, 40), r}); }
      for (const el of host.querySelectorAll('button, a, input, summary, select')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]')) out.push({text: `control “${(el.textContent ?? '').trim().slice(0, 30)}”`, r}); }
      return out;
    };
    const hits = new Set<string>(), bottom = host.getBoundingClientRect().bottom + scrollY;
    for (let y = 0; y <= bottom; y += 40) {
      scrollTo(0, y); await frame();
      const boxes = launchers.map(el => el.getBoundingClientRect());
      for (const w of things()) for (const b of boxes) if (Math.min(w.r.right, b.right) - Math.max(w.r.left, b.left) > 0 && Math.min(w.r.bottom, b.bottom) - Math.max(w.r.top, b.top) > 0) hits.add(w.text);
      if (y > document.documentElement.scrollHeight) break;
    }
    scrollTo(0, 0);
    return {launchers: launchers.length, hits: [...hits]};
  }, {root, selector: LAUNCHERS});
}

for (const [path, root, name] of [['/app/governance', '.governance-page', 'Governance'], ['/app/wealth/add-money', '.add-money-page', 'Add money']] as const)
  test(`${name}: the floating buttons never cover a word or a control (768, 1024 and 1440 px)`, async ({page, isMobile}) => {
    test.skip(isMobile, 'The right-edge launcher stack is the computer and tablet layout');
    test.setTimeout(120_000);
    await showcase(page);
    for (const width of [768, 1024, 1440]) {
      await page.setViewportSize({width, height: 1024});
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expect(page.getByTestId('ai-launcher')).toBeVisible();
      await expect(page.locator(root)).toBeVisible();
      const found = await covered(page, root);
      expect(found.launchers, `${width}: the floating buttons are measured`).toBeGreaterThanOrEqual(2);
      expect(found.hits, `${width}: words or controls under a floating button`).toEqual([]);
    }
  });

test('a phone: Earn’s first-screen disclaimer and Add money’s step line keep clear of ZIGi’s button', async ({page, isMobile}) => {
  test.skip(!isMobile, 'ZIGi’s phone button');
  await showcase(page);
  for (const [path, line] of [['/app/earn', '.earn-hero-note'], ['/app/wealth/add-money', '.add-money-hint']] as const) {
    await page.goto(path);
    await expect(page.locator(line)).toBeVisible();
    const zigi = page.getByTestId('ai-launcher').locator('.ai-launcher-button');
    await expect(zigi).toBeVisible();
    const [button, words] = await Promise.all([zigi.boundingBox(), page.locator(line).evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()].filter(r => r.width > 1).map(r => ({left: r.left, right: r.right, top: r.top, bottom: r.bottom})); })]);
    expect(words.length, path).toBeGreaterThan(0);
    // Each line of the words ends left of the button's lane, whatever height the button sits at.
    for (const r of words) expect(r.right, `${path}: a line under ZIGi’s button`).toBeLessThanOrEqual(button!.x);
  }
});
