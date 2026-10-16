import {expect, test, type Page} from '@playwright/test';
import {ALPHA_LABEL, aboutAlpha} from './ab-shell';

// Session AC ("Polish to zero", ADR-025): the owner's findings on Alpha #41 and decisions of 2026-10-15, one block each.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
}
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector('.workspace[aria-busy="true"]'));

test.describe('item 1: the habit day grid on the folded card', () => {
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [320, 800]] as const)
    test(`${width} px: 28 coloured days under the counter, above the fold; equal cards and aligned controls in a row`, async ({page}) => {
      await page.setViewportSize({width, height});
      await showcase(page);
      await page.goto('/app/habits'); await settled(page);
      const cards = page.locator('.habits-workspace .habit-grid > .habit-card');
      await expect(cards.first()).toBeVisible();
      const report = await cards.evaluateAll(nodes => nodes.map(card => {
        const grid = card.querySelector(':scope > .habit-cadence'), fold = card.querySelector(':scope > .habit-more'), controls = card.querySelector(':scope > .habit-completion, :scope > .habit-status');
        const box = (e: Element | null) => e ? e.getBoundingClientRect() : null;
        return {dots: grid?.querySelectorAll('.habit-dot').length ?? 0, insideFold: !!card.querySelector('.habit-more .habit-cadence'), open: !!(fold as HTMLDetailsElement | null)?.open,
          grid: box(grid), fold: box(fold?.querySelector('summary') ?? null), controls: box(controls), card: box(card), actions: box(card.querySelector(':scope > .habit-completion .habit-check-actions')),
          // The −/+/Done row is the controls' last line (an auto check-in note sits above it), so rows line up whatever a card shows.
          actionsLast: (() => { const c = card.querySelector(':scope > .habit-completion'), act = c?.querySelector(':scope > .habit-check-actions'); if (!c || !act) return true; const end = act.getBoundingClientRect().bottom; return [...c.children].every(k => k === act || (k as HTMLElement).offsetHeight === 0 || k.getBoundingClientRect().top < end - 1); })(),
          visible: !!grid && getComputedStyle(grid).display !== 'none' && (grid as HTMLElement).offsetHeight > 0};
      }));
      expect(report.length).toBeGreaterThan(2);
      for (const card of report) {
        // On the folded card, visible without opening Details, and nowhere inside the fold.
        expect(card).toMatchObject({dots: 28, insideFold: false, open: false, visible: true, actionsLast: true});
        // Order: counter row → the grid → the fold line.
        expect(card.grid!.top).toBeGreaterThanOrEqual(card.controls!.bottom - 1);
        expect(card.fold!.top).toBeGreaterThanOrEqual(card.grid!.bottom - 1);
        expect(card.grid!.right).toBeLessThanOrEqual(card.card!.right + 0.5);
      }
      // Cards that share a row share one height, and their −/+/Done rows line up.
      const rows = new Map<number, typeof report>();
      for (const card of report) { const key = Math.round(card.card!.top); rows.set(key, [...(rows.get(key) ?? []), card]); }
      for (const row of rows.values()) if (row.length > 1) {
        expect(Math.max(...row.map(c => c.card!.height)) - Math.min(...row.map(c => c.card!.height))).toBeLessThanOrEqual(1);
        const tops = row.filter(c => c.actions).map(c => c.actions!.top);
        if (tops.length > 1) expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });

  test('an open card never stretches its neighbours; Motion Off keeps the same grid', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));
    await page.goto('/app/habits'); await settled(page);
    await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
    const first = page.locator('.habits-workspace .habit-grid > .habit-card').first();
    await expect(first.locator(':scope > .habit-cadence .habit-dot')).toHaveCount(28);
    const neighbour = page.locator('.habits-workspace .habit-grid').first().locator(':scope > .habit-card').nth(1);
    const before = (await neighbour.boundingBox())!.height;
    await first.locator(':scope > .habit-more > summary').click();
    await expect(first.locator(':scope > .habit-more')).toHaveAttribute('open', '');
    await expect.poll(async () => (await neighbour.boundingBox())!.height).toBeLessThanOrEqual(before + 1);
  });
});

test.describe('item 2: the starfield is deepest in the middle of the page', () => {
  for (const [width, height] of [[1440, 900], [390, 844]] as const)
    test(`${width} px: a veil in the page's end colour, clear in the middle, solid at the top and the end`, async ({page}) => {
      await page.setViewportSize({width, height});
      await page.goto('/app/wealth'); await settled(page);
      const veil = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.app-content')!, '::after'); return {position: s.position, image: s.backgroundImage, events: s.pointerEvents, animation: s.animationName}; });
      expect(veil.position).toBe('absolute'); expect(veil.events).toBe('none'); expect(veil.animation).toBe('none');
      // The page's end colour (the footer's last scrim, rgb(2 9 24)), opaque at the top of both veils.
      expect(veil.image.match(/rgb\(2, 9, 24\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
      expect(veil.image).not.toContain('url(');
      // The veil covers the page from top to end.
      const cover = await page.evaluate(() => { const app = document.querySelector('.app-content')!, c = app.getBoundingClientRect(), s = getComputedStyle(app, '::after'); return {top: c.top + scrollY + parseFloat(s.top), bottom: c.bottom + scrollY - parseFloat(s.bottom), page: document.documentElement.scrollHeight}; });
      expect(cover.top).toBeLessThanOrEqual(0); expect(cover.bottom).toBeGreaterThanOrEqual(cover.page - 1);
    });
});

test.describe('item 3: the page ends after the footer\'s link columns; the facts live in Settings and Help', () => {
  test('no disclaimer in the footer, every fact in Settings → Your data with the verifier\'s class names', async ({page}) => {
    await page.goto('/app'); await settled(page);
    const footer = page.locator('.site-footer');
    await expect(footer.locator('.site-footer-links')).toBeVisible();
    await expect(footer.locator('.alpha-disclaimer, .network-banner, .mode-strip, .workspace-status')).toHaveCount(0);
    await expect(footer).not.toContainText('PUBLIC_ALPHA_UNDEPLOYED');
    await expect(footer).not.toContainText('Your goals. Onchain.');
    // Nothing follows the link columns inside the footer.
    expect(await footer.locator('.site-footer-links').evaluate(nav => nav.nextElementSibling === null)).toBe(true);
    await page.goto('/app/settings/data'); await settled(page);
    const about = aboutAlpha(page);
    await expect(about.locator('.network-banner strong')).toHaveText(ALPHA_LABEL);
    await expect(about.locator('.network-banner')).toContainText('No blockchain transactions or financial signatures.');
    await expect(about.locator('.mode-strip')).toContainText('LOCAL SIMULATION · Mode: this tab');
    for (const fact of ['Financial execution is disabled on this Alpha.', 'Browser storage is not a backup.', 'Independent project · Unaudited alpha · Idle strategy only.', 'Never share secrets, private backups or wallet details.'])
      await expect(about).toContainText(fact);
    await expect(about.locator('.workspace-status')).toBeVisible();
    await expect(about).toContainText(/Build environment\s*(PUBLIC_ALPHA_UNDEPLOYED|LOCAL_DEMO)/);
    await page.goto('/app/help#help-z-about');
    await expect(page.locator('#help-z-about')).toHaveAttribute('open', '');
    await expect(page.locator('#help-z-about')).toContainText('browser storage is not a backup');
  });
  test('the notice\'s More opens Help\'s "About this Alpha"', async ({page}) => {
    await page.goto('/app/goals'); await settled(page);
    await expect(page.getByRole('complementary', {name: 'Alpha notice'}).getByRole('link', {name: 'More', exact: true})).toHaveAttribute('href', '/app/help#help-z-about');
  });
  test('in the Showcase the facts block says so, in its own words', async ({page}) => {
    await showcase(page);
    await page.goto('/app/settings/data'); await settled(page);
    await expect(aboutAlpha(page)).toContainText('Showcase data is fictional and stays in this tab.');
  });
});

test.describe('item 5: each thing once (Today defaults, Wealth\'s one holdings list)', () => {
  test('the Showcase Today shows one habits block and the next goal step once, keeps Daily Health; each twin can come back', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page); await settled(page);
    await expect(page.locator('.habits-today[aria-labelledby]')).toHaveCount(1);
    // Daily Health carries macros, weight and steps beside its calories, so it is no twin of the calories widget: it stays.
    await expect(page.locator('section.health-today')).toHaveCount(1);
    await expect(page.locator('[data-module="next-action"]')).toHaveCount(0);
    await expect(page.getByRole('article', {name: 'Focus: next goal step'})).toBeVisible();
    // Still available: while arranging, each built-in twin is listed as hidden with "Show card".
    await page.getByRole('button', {name: 'Unlock layout to rearrange', exact: true}).click();
    for (const label of ['Daily Habits', 'Next Goal action']) await expect(page.getByText(`${label} is hidden from Today.`)).toBeVisible();
    await expect(page.getByText('Daily Health is hidden from Today.')).toHaveCount(0);
  });
  test('Wealth: one list, one row of chips, every card and account row with its actions', async ({page}) => {
    await showcase(page);
    await page.goto('/app/wealth'); await settled(page);
    const have = page.getByRole('region', {name: 'What you have', exact: true});
    // The heading keeps the section's width on every screen (the review found it squeezed to a 100 px column on phones).
    const titleBox = (await page.locator('#holdings-title').boundingBox())!, sectionBox = (await have.boundingBox())!;
    expect(titleBox.width).toBeGreaterThanOrEqual(sectionBox.width * 0.5);
    await expect(page.getByRole('region', {name: 'Your assets', exact: true})).toHaveCount(0);
    const chips = have.getByRole('group', {name: 'Show'}).getByRole('button');
    await expect(chips.nth(0)).toHaveText(/^All \d+$/); await expect(chips.nth(1)).toHaveText(/^Accounts \d+$/);
    await expect(chips.nth(2)).toHaveText(/^Debts \d+$/); await expect(chips.nth(3)).toHaveText(/^Assets \d+$/);
    await expect(chips.last()).toHaveText(/^Needs attention \d+$/);
    await expect(have.locator('.owned-asset-card').first()).toBeVisible();
    await expect(have.getByRole('button', {name: '+ Add asset', exact: true})).toBeVisible();
    await expect(have.getByRole('link', {name: 'Open Portfolio →', exact: true})).toBeVisible();
    await expect(have.locator('[data-layout-item="wealth:have"], [data-layout-item="wealth:accounts"]')).toHaveCount(0);
  });
});

test.describe('item 6: one Water card', () => {
  test('the ring, the target, one-tap with Undo and the history, in the Water journal', async ({page}) => {
    await page.goto('/app/health'); await settled(page);
    const water = page.getByRole('region', {name: 'Water journal', exact: true});
    await expect(page.locator('.water-ring-card')).toHaveCount(0);
    await expect(water.locator('.water-ring')).toBeVisible();
    await water.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
    await expect(water.getByRole('button', {name: 'Remove water 250', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(water.getByRole('button', {name: 'Remove water 250', exact: true})).toHaveCount(0);
    await expect(water.getByRole('form', {name: 'Water entry'})).toBeVisible();
  });
});

test.describe('item 7: a vision tile\'s own image', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
  test('Showcase: ⋯ → Change image shows it in this tab, the same size; Back to the illustration returns', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await page.goto('/app/goals'); await settled(page);
    await page.getByRole('radio', {name: /Vision board/}).or(page.getByRole('button', {name: /Vision board/})).first().click();
    const tile = page.locator('.vision-tile').first();
    await expect(tile).toBeVisible();
    const before = (await tile.boundingBox())!;
    await tile.getByRole('button', {name: /^Options for /}).click();
    const chooser = page.waitForEvent('filechooser');
    await tile.getByRole('button', {name: 'Change image', exact: true}).click();
    await (await chooser).setFiles({name: 'mine.png', mimeType: 'image/png', buffer: png});
    await expect(tile.locator('img[src^="blob:"]')).toHaveCount(1);
    const after = (await tile.boundingBox())!;
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1); expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    expect(await tile.locator('img[src^="blob:"]').evaluate(img => getComputedStyle(img).objectFit)).toBe('cover');
    await tile.getByRole('button', {name: /^Options for /}).click();
    await tile.getByRole('button', {name: 'Back to the illustration', exact: true}).click();
    await expect(tile.locator('img[src^="blob:"]')).toHaveCount(0);
    await expect(tile.locator('img[src^="/showcase/vision/"]')).toHaveCount(1);
    // ⋯ and "Open Goal →" (shown on hover and focus, always on touch) never cover each other.
    await tile.hover();
    const options = (await tile.getByRole('button', {name: /^Options for /}).boundingBox())!, open = (await tile.getByRole('link', {name: 'Open Goal →'}).boundingBox())!;
    expect(options.x + options.width <= open.x || open.x + open.width <= options.x || options.y + options.height <= open.y || open.y + open.height <= options.y).toBe(true);
  });
});

test.describe('item 12: Activity shows no invented time for a date-only record', () => {
  test('the Showcase\'s records, stamped at their day, show under their day without "00:00"; every shown time is a real one', async ({page}) => {
    await showcase(page);
    await page.goto('/app/activity'); await settled(page);
    const events = page.locator('.activity-event');
    await expect(events.first()).toBeVisible();
    const times = await page.locator('.activity-event time').allTextContents();
    expect(times.filter(t => /^(00[:.]00|12[:.]00\s?AM)$/i.test(t.trim()))).toEqual([]);
    // Each entry still sits under a day heading.
    await expect(page.locator('.activity-date-heading').first()).toBeVisible();
  });
});
