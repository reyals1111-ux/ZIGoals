import {expect, test, type Page} from '@playwright/test';

// Session AE (Part 5, ADR-027): the four layout issues Session AD's review found on `main` (ADR-026 F23), each measured
// in the real layout. Every check here failed on `main`'s CSS: the floating buttons over the rail cards' words, the
// Health date wider than its field, the Settings index showing the page through it, Journey's figure over its word.
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.emulateMedia({reducedMotion: 'reduce'});
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
async function newDevice(page: Page) {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app');
}

// 1. Today's rail: the music and ZIGi buttons float over the rail's right edge; no word of any rail card may sit under
// them, wherever the page is scrolled (the card is swept through the buttons' height in 40 px steps).
for (const demo of ['Showcase', 'a new device'] as const)
  test(`Today (${demo}): the floating buttons never cover a word of the rail's cards (1024, 1280 and the two-column 900 px)`, async ({page, isMobile}) => {
    test.skip(isMobile, 'The rail beside the floating buttons is the computer and tablet layout.');
    test.setTimeout(90_000);
    await page.setViewportSize({width: 1024, height: 768});
    if (demo === 'Showcase') await showcase(page); else await newDevice(page);
    await expect(page.getByRole('region', {name: 'Staked ZIG overview'})).toBeVisible();
    await expect(page.getByTestId('ai-launcher')).toBeVisible();
    // The music button is the Showcase's (a new device turns music on in Settings); ZIGi's is on every device.
    if (demo === 'Showcase') await expect(page.getByRole('button', {name: 'Open the music player'})).toBeVisible();
    for (const width of [1024, 1280, 900]) {
      await page.setViewportSize({width, height: 768});
      const found = await page.evaluate(async () => {
        const frame = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
        const launchers = [...document.querySelectorAll('[data-testid="ai-launcher"] :is(button, a, .ai-launcher-ring), .music-launcher-stack button')]
          .filter(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; });
        const rail = document.querySelector('.today-rail')!, cards = [...rail.querySelectorAll('.placed-module > :not(.dashboard-builtin-options)')];
        const words = () => cards.flatMap(card => { const out: {card: string; text: string; r: DOMRect}[] = []; const walk = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); let n: Node | null;
          while ((n = walk.nextNode())) { const t = n.textContent!.trim(), el = n.parentElement!; if (!t || el.closest('.sr-only, [hidden], [aria-hidden="true"]') || getComputedStyle(el).visibility === 'hidden') continue;
            const range = document.createRange(); range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push({card: card.className.split(' ')[0], text: t.slice(0, 40), r}); }
          return out; });
        const hits = new Set<string>(), top = rail.getBoundingClientRect().top + scrollY, bottom = top + rail.getBoundingClientRect().height;
        for (let y = Math.max(0, top - innerHeight); y <= bottom; y += 40) {
          scrollTo(0, y); await frame();
          const boxes = launchers.map(el => el.getBoundingClientRect());
          for (const w of words()) for (const b of boxes) if (Math.min(w.r.right, b.right) - Math.max(w.r.left, b.left) > 0 && Math.min(w.r.bottom, b.bottom) - Math.max(w.r.top, b.top) > 0) hits.add(`${w.card}: "${w.text}"`);
        }
        scrollTo(0, 0);
        return {launchers: launchers.length, cards: cards.length, hits: [...hits]};
      });
      expect(found.launchers, `${width}: the floating buttons are measured`).toBeGreaterThanOrEqual(demo === 'Showcase' ? 4 : 2);
      expect(found.cards, `${width}: the rail holds its cards`).toBeGreaterThanOrEqual(3);
      expect(found.hits, `${width}: words under a floating button`).toEqual([]);
    }
  });

// 2. Health's journal date on a phone: the field is at least as wide as the date it shows (the browser's own width for the
// date in the field's font, measured on a copy of the field at its natural width), every control stays inside the strip
// and keeps its 44 px target, and the label reads on one line. It was cut at 320 px and a pixel short at 390.
test('Health on a phone: the journal date fits its field at 390 and 320 px, with 44 px targets', async ({page}) => {
  await newDevice(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: 800});
    await page.goto('/app/health');
    const strip = page.locator('.health-date-strip');
    await expect(strip.getByLabel('Journal date', {exact: true})).toBeVisible();
    const m = await strip.evaluate(el => {
      const input = el.querySelector('input')!, probe = input.cloneNode() as HTMLInputElement;
      probe.style.cssText = 'width:auto!important;min-width:0!important;max-width:none!important;position:absolute;visibility:hidden';
      input.parentElement!.append(probe); const needs = probe.getBoundingClientRect().width; probe.remove();
      const box = (e: Element) => { const r = e.getBoundingClientRect(); return {left: r.left, right: r.right, width: r.width, height: r.height}; };
      const label = el.querySelector('.field > span')!, range = document.createRange(); range.selectNodeContents(label);
      return {needs, input: box(input), strip: box(el), controls: [...el.querySelectorAll('button, input')].map(c => ({name: c.getAttribute('aria-label') ?? (c.textContent || 'date'), ...box(c)})), labelLines: range.getClientRects().length};
    });
    expect(m.input.width, `${width}: the date's field holds the whole date`).toBeGreaterThanOrEqual(m.needs - 0.5);
    for (const c of m.controls) {
      expect(c.left, `${width}: ${c.name} inside the strip`).toBeGreaterThanOrEqual(m.strip.left);
      expect(c.right, `${width}: ${c.name} inside the strip`).toBeLessThanOrEqual(m.strip.right);
      expect(Math.min(c.width, c.height), `${width}: ${c.name} is a 44 px target`).toBeGreaterThanOrEqual(44);
    }
    expect(m.labelLines, `${width}: "Journal date" on one line`).toBe(1);
  }
});
