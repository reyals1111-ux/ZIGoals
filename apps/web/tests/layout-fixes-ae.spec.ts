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

// 3. Settings' sticky index (computers and tablets): nothing from the page paints over it while it is stuck at the top
// (hit-tested across its box, inside its rounded corners, every 160 px of scroll down the page); its surface hides what
// scrolls under it — opaque, or frosted with a real blur (the production build had dropped the blur, so the page's
// words read through the 90 % bar in Chrome); and each section link lands its group's title below it.
test('Settings: the sticky index hides what scrolls under it, nothing paints over it, and its links land below it', async ({page, isMobile}) => {
  test.skip(isMobile, 'A phone has its own list of rows instead of the index.');
  test.setTimeout(90_000);
  for (const [width, height] of [[1024, 800], [1440, 900]] as const) {
    await page.setViewportSize({width, height});
    await page.goto('/app/settings');
    const index = page.getByRole('navigation', {name: 'Settings sections'});
    await expect(index).toBeVisible();
    await expect(page.locator('#your-ai')).toContainText('Which setup fits me?');
    const surface = await index.evaluate(el => {
      const s = getComputedStyle(el), alpha = (text: string) => [...text.matchAll(/rgba?\(([^)]+)\)/g)].map(m => { const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; });
      // The colour and the gradient's thinnest stop, layered: how much of what is behind still shows through.
      const color = alpha(s.backgroundColor)[0] ?? 0, stops = alpha(s.backgroundImage), layer = stops.length ? Math.min(...stops) : 0;
      return {blur: parseFloat(/blur\(([\d.]+)px\)/.exec(s.backdropFilter)?.[1] ?? '0'), alpha: +(1 - (1 - color) * (1 - layer)).toFixed(3)};
    });
    expect(surface.blur >= 8 || surface.alpha >= 0.99, `${width}: an opaque bar or one frosted with at least an 8 px blur (blur ${surface.blur}, alpha ${surface.alpha})`).toBe(true);
    const over = await index.evaluate(async bar => {
      const frame = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      const found = new Set<string>(); let stuck = 0;
      for (let y = 0; y < document.documentElement.scrollHeight - innerHeight; y += 160) {
        scrollTo(0, y); await frame();
        const b = bar.getBoundingClientRect(); if (Math.abs(b.top) > 1 || window.scrollY < 50) continue; stuck++;
        for (let x = b.left + 16; x <= b.right - 16; x += 24) for (let yy = b.top + 2; yy <= b.bottom - 2; yy += 8) {
          const hit = document.elementFromPoint(x, yy);
          if (!hit || bar.contains(hit) || hit.closest('[data-testid="ai-launcher"], .ai-edge-tab, .music-launcher-stack, .music-edge-tab, .aa-toast-region')) continue;
          found.add(`${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]} "${(hit.textContent ?? '').trim().slice(0, 30)}"`);
        }
      }
      scrollTo(0, 0);
      return {stuck, found: [...found]};
    });
    expect(over.stuck, `${width}: the index was stuck at the top while measured`).toBeGreaterThan(5);
    expect(over.found, `${width}: page content painted over the index`).toEqual([]);
    for (const link of await index.getByRole('link').all()) {
      const target = (await link.getAttribute('href'))!;
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      await expect(page.locator(`${target}-title`)).toBeInViewport();
      // Once the scroll has settled (the same position for five frames): the title's top against the index's bottom.
      const clear = await index.evaluate(async (bar, id) => {
        let last = -1, same = 0;
        while (same < 5) { await new Promise(done => requestAnimationFrame(done)); if (scrollY === last) same++; else { same = 0; last = scrollY; } }
        return document.getElementById(id)!.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
      }, `${target.slice(1)}-title`);
      expect(clear, `${width}: ${target}'s title lands below the index`).toBeGreaterThanOrEqual(0);
    }
  }
});
