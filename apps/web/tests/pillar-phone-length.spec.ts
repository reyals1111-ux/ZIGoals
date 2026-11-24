import {expect, test, type Page} from '@playwright/test';
import {openSettings} from './settings-open';
import {hydrated} from './ah-helpers';

/**
 * Session AK RB (RELEASE_REVIEW_2 R2-8): Health and Wealth stay short on a phone. The page height at 390×844, as
 * scrollHeight / 844 (screens), with every network call answered 503 and motion reduced, on a brand-new device and in the
 * Showcase. Before (production build of `52bd5286`, measured through the browser lock, 1 Nov 2026):
 *   Health  fresh 8,638 px (10.2 screens) · Showcase 10,107 px (12.0)
 *   Wealth  fresh 8,168 px (9.7)          · Showcase 13,645 px (16.2)
 * R2-8 removed the duplicates (the weight trend, energy and coach cards and the meal-by-meal list moved into Health's
 * Weight and Insights views; "Faster ways to log" is gone), folded the secondary sections (Seven days of care; Wealth's
 * composition, bills, budgets and calculator as rows on a phone, the analytic rows in one "More about your wealth" row
 * while there are fewer than two assets) and put the empty forms behind their buttons (Log spending, the weekly and the
 * monthly budget). The ceilings hold the gain with a margin for CI's Linux fonts (about 0.6 screens taller than a Mac in
 * tests/today-screens.spec.ts); each sits far below its "before". A change that makes either page meaningfully longer on
 * a phone fails here instead of going unnoticed.
 */
const CEILING = {healthFresh: 7.0, healthShowcase: 8.2, wealthFresh: 6.0, wealthShowcase: 10.0};
const BEFORE = {healthFresh: 10.2, healthShowcase: 12.0, wealthFresh: 9.7, wealthShowcase: 16.2};
test.use({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
const FIXED_TIME = new Date('2026-11-01T09:30:00.000Z');

async function screens(page: Page, path: '/app/health' | '/app/wealth') {
  await page.goto(path);
  await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible();
  // The parts that load after the page (Health's tiles, Wealth's spending) are in before the page is measured.
  if (path === '/app/health') await expect(page.getByRole('region', {name: 'Daily nutrition summary'})).toBeVisible();
  else await expect(page.locator('#spending').getByRole('button', {name: 'Log spending', exact: true})).toBeVisible();
  await page.waitForTimeout(1200);
  return (await page.evaluate(() => document.documentElement.scrollHeight)) / 844;
}

test('Health and Wealth at 390×844 stay within their screen-count ceilings (fresh and Showcase)', async ({page}) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(FIXED_TIME);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const healthFresh = await screens(page, '/app/health'), wealthFresh = await screens(page, '/app/wealth');
  await openSettings(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const healthShowcase = await screens(page, '/app/health'), wealthShowcase = await screens(page, '/app/wealth');
  const measured = {healthFresh, healthShowcase, wealthFresh, wealthShowcase};
  console.log(`PILLAR_SCREENS ${Object.entries(measured).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);
  for (const key of Object.keys(CEILING) as (keyof typeof CEILING)[]) {
    expect(measured[key], key).toBeLessThanOrEqual(CEILING[key]);
    expect(CEILING[key], `${key}: the ceiling keeps at least a third off its "before"`).toBeLessThanOrEqual(BEFORE[key] * 0.69);
  }
});

/**
 * Session AV lane 2 (fr-money, FR-L-4, the friend-readiness walk's Lina): "Log spending", her daily action, sat 2,103 px
 * down Wealth at 390×844 on a fresh device (4,416 in the Showcase); the first screen offered only "+ Add asset". The hero's
 * "Log spending" is on the first screen and opens Spending's own form with the cursor in Amount; Quick add's Spending row
 * does the same from Today. Nothing is saved by either.
 */
test('Wealth at 390×844: "Log spending" is on the first screen and opens the form; Quick add → Spending too', async ({page}) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(FIXED_TIME);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/wealth'); await hydrated(page);
  const quick = page.locator('.wealth-summary').getByRole('button', {name: 'Log spending', exact: true}); // (deliberate) under the total now, so the total stays on a short phone's first screen; still on the first 844 px, still opens the form
  await expect(quick).toBeVisible();
  const box = (await quick.boundingBox())!;
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(box.y + box.height, 'the hero\'s Log spending is inside the first 844 px').toBeLessThanOrEqual(844);
  await quick.click();
  const form = page.getByRole('form', {name: 'Log spending or income'});
  await expect(form).toBeInViewport();
  await expect(form.getByLabel('Amount', {exact: true})).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:money-log:v1') ?? 'null')?.entries?.length ?? 0)).toBe(0);
  await page.goto('/app'); await hydrated(page);
  await page.locator('#main').getByRole('button', {name: '+ Quick add', exact: true}).click();
  await page.getByRole('navigation', {name: 'Quick add actions'}).getByRole('link').filter({hasText: /^Spending/}).click();
  await page.waitForURL('**/app/wealth#spending');
  await expect(form).toBeInViewport();
  await expect(form.getByLabel('Amount', {exact: true})).toBeFocused();
  // Session AV lane 2 (fr-recheck, FR-L-4): in the Showcase the button sat under the total's whole block (counts, scope,
  // prices, net worth): y 1,000 at 390 (the tab bar starts at 779) and 902 at 1440 (fold 900). Stricter: on a phone it ends
  // above the tab bar, on a desktop inside the first 900 px, with the Showcase loaded; the total's figure stays above it.
  await openSettings(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  for (const [width, height] of [[390, 844], [1440, 900]] as const) {
    await page.setViewportSize({width, height});
    await page.goto('/app/wealth'); await hydrated(page);
    await expect(quick).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const shown = (await quick.boundingBox())!, figure = (await page.locator('.wealth-hero-total strong').first().boundingBox())!;
    const tabs = width < 700 ? (await page.locator('.phone-tabbar').boundingBox())! : null;
    const fold = tabs ? Math.min(tabs.y, 779) : 900;
    console.log(`FR_L4 showcase ${width}: log ${Math.round(shown.y)}–${Math.round(shown.y + shown.height)}, figure ${Math.round(figure.y)}–${Math.round(figure.y + figure.height)}, fold ${Math.round(fold)}`);
    expect(shown.y + shown.height, `Showcase ${width}×${height}: Log spending ends on the first screen`).toBeLessThanOrEqual(fold);
    expect(figure.y + figure.height, `Showcase ${width}×${height}: the total's figure stays above Log spending`).toBeLessThanOrEqual(shown.y);
  }
  await quick.click();
  await expect(form).toBeInViewport();
  await expect(form.getByLabel('Amount', {exact: true})).toBeFocused();
});

/**
 * Session AV lane 2 (fr-money, FR-L-9): the bank import preview at 390: the table was 473 px in a 352 px sideways box, so
 * Category was a 24 px sliver and the caption was cut at the right edge. Each row now stands as a card: the category
 * select and the caption sit wholly inside the preview, with no sideways scroll.
 */
test('the bank import preview at 390×844 shows each row’s Category and the whole caption, with no sideways scroll', async ({page}) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(FIXED_TIME);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/wealth'); await hydrated(page);
  await page.locator('#spending').getByRole('button', {name: 'Import from your bank', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Import spending and income'});
  await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
  const csv = ['Date,Payee,Amount', '2026-10-04,Fictional Phone,-17.50', '2026-10-16,Fictional Grocer,-55.10', '2026-10-15,Fictional Employer,2650.00'].join('\n');
  await sheet.getByLabel('CSV file', {exact: true}).setInputFiles({name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await sheet.getByRole('button', {name: 'Next', exact: true}).click();
  const wrap = sheet.locator('.bankfile-table-wrap');
  await expect(wrap).toBeVisible();
  const frame = (await wrap.boundingBox())!;
  expect(await wrap.evaluate(el => el.scrollWidth - el.clientWidth), 'no sideways scroll in the preview').toBeLessThanOrEqual(1);
  const caption = (await wrap.locator('caption').boundingBox())!;
  expect(caption.x + caption.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  const picks = wrap.getByRole('combobox', {name: /^Category for /});
  await expect(picks).toHaveCount(3);
  for (const pick of await picks.all()) {
    const b = (await pick.boundingBox())!;
    expect(b.x, 'the category select starts inside the preview').toBeGreaterThanOrEqual(frame.x - 1);
    expect(b.x + b.width, 'and ends inside it').toBeLessThanOrEqual(frame.x + frame.width + 1);
    expect(b.width, 'wide enough to read its choice').toBeGreaterThanOrEqual(120);
  }
});
