import {expect, test, type Page} from '@playwright/test';
import {hydrated, offlineApi} from '../../ah-helpers';

/**
 * Session AL (DV-204, lane L10a reading): at wide widths the Goals header's "+ Create a goal" sat far right, away from the
 * intro. From 1400 px, on the Goals page only, the header's actions sit under the lede, flush with its left edge, clear of
 * the header art. Below 1400 px Goals is as before, and every other pillar's header is the same on both sides of 1400 px.
 * Fresh profile (only the Welcome marked seen), Nebula, Europe/Brussels; every /api request answers 503.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
test.beforeEach(async ({page, isMobile}) => {
  test.skip(isMobile, 'wide windows only');
  await offlineApi(page);
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('main .pillar-hero').first()).toBeVisible();
  await expect(page.locator('main .pillar-hero .pillar-hero-actions').first()).toBeVisible();
}
const overlap = (a: {x: number; y: number; width: number; height: number}, b: {x: number; y: number; width: number; height: number}) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
async function layout(page: Page) {
  const hero = page.locator('main .pillar-hero').first();
  const box = async (selector: string) => (await hero.locator(selector).first().boundingBox())!;
  return {hero, lede: await box('.pillar-hero-lede'), actions: await box('.pillar-hero-actions'), areas: await hero.evaluate(e => getComputedStyle(e).gridTemplateAreas)};
}

for (const width of [1400, 1440, 1920] as const) test(`DV-204: at ${width} px the Goals header's actions sit under the lede, flush left`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await ready(page, '/app/goals');
  const {hero, lede, actions} = await layout(page);
  expect(actions.y).toBeGreaterThanOrEqual(lede.y + lede.height - 1);
  expect(actions.y - (lede.y + lede.height)).toBeLessThanOrEqual(32);
  expect(Math.abs(actions.x - lede.x)).toBeLessThanOrEqual(2);
  const create = hero.getByRole('link', {name: '+ Create a goal', exact: true});
  await expect(create).toBeVisible();
  const c = (await create.boundingBox())!;
  expect(Math.abs(c.x - lede.x)).toBeLessThanOrEqual(2);
  expect(c.height).toBeGreaterThanOrEqual(44);
  const art = hero.locator('.pillar-hero-art');
  if (await art.count() && await art.isVisible()) expect(overlap(c, (await art.boundingBox())!)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('DV-204: Goals changes at 1400 px; Habits, Health and Wealth headers are the same at 1399 and 1400 px', async ({page}) => {
  const at = async (path: string, width: number) => { await page.setViewportSize({width, height: 900}); await ready(page, path); return layout(page); };
  const goalsBefore = await at('/app/goals', 1399), goalsAfter = await at('/app/goals', 1400);
  // Below 1400 the actions still share the lede's row (the earlier header); from 1400 they are below it.
  expect(goalsBefore.actions.y).toBeLessThan(goalsBefore.lede.y + goalsBefore.lede.height);
  expect(goalsAfter.areas).not.toBe(goalsBefore.areas);
  for (const path of ['/app/habits', '/app/health', '/app/wealth']) {
    const before = await at(path, 1399), after = await at(path, 1400);
    expect(after.areas, path).toBe(before.areas);
    expect(Math.abs((after.actions.x - after.lede.x) - (before.actions.x - before.lede.x)), path).toBeLessThanOrEqual(4);
    expect(Math.sign(after.actions.y - (after.lede.y + after.lede.height - 1)), path).toBe(Math.sign(before.actions.y - (before.lede.y + before.lede.height - 1)));
  }
});
