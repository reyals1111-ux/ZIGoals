import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../ah-helpers';

/**
 * Session AP (owner decision 14 Nov, backlog #8; ADR-040): the optional Bento view on Goals, Habits, Health, Wealth and Today
 * (below its protected hero). The list stays the default; "Layout: List · Bento" switches; the choice is remembered per
 * page on this device; the cards sit side by side as tiles; the hero is the same in both; phones show no switch.
 */
const PAGES = [['/app', 'today:main'], ['/app/goals', 'goals:body'], ['/app/habits', 'habits:body'], ['/app/health', 'health:body'], ['/app/wealth', 'wealth:body']] as const;
const layout = (page: Page) => page.getByRole('radiogroup', {name: 'Layout'});
const tiles = (page: Page, region: string) => page.evaluate(r => {
  const items = [...document.querySelectorAll<HTMLElement>(`[data-layout-region="${r}"]`)].filter(el => el.getClientRects().length);
  const parent = items[0]?.parentElement;
  return {display: parent ? getComputedStyle(parent).display : '', template: parent ? getComputedStyle(parent).gridTemplateColumns : '', lefts: new Set(items.map(el => Math.round(el.getBoundingClientRect().left))).size, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
}, region);

test.describe('on a computer', () => {
  test.use({viewport: {width: 1440, height: 900}});
  test.beforeEach(async ({page}, info) => { test.skip(info.project.name !== 'desktop', 'computers only'); await offlineApi(page); await loadShowcase(page); });

  for (const [path, region] of PAGES) test(`${path}: List by default; Bento lays the cards out as tiles and is remembered on this device`, async ({page}) => {
    await page.goto(path); await hydrated(page);
    const group = layout(page);
    await expect(group).toBeVisible();
    await expect(group.getByRole('radio', {name: 'List'})).toHaveAttribute('aria-checked', 'true');
    const list = await tiles(page, region);
    const hero = path === '/app' ? await page.locator('.today-hero').boundingBox() : null;
    await group.getByRole('radio', {name: 'Bento'}).click();
    await expect(group.getByRole('radio', {name: 'Bento'})).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await tiles(page, region)).display).toBe('grid');
    const t = await tiles(page, region);
    // Tiles: the area's own columns (not the list's), cards side by side, nothing scrolls sideways.
    expect(t.template).not.toBe(list.template);
    expect(t.lefts).toBeGreaterThanOrEqual(2);
    expect(t.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
    // Today's hero is the same in both views.
    if (hero) expect(await page.locator('.today-hero').boundingBox()).toEqual(hero);
    await page.reload(); await hydrated(page);
    await expect(layout(page).getByRole('radio', {name: 'Bento'})).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await tiles(page, region)).template).toBe(t.template);
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:bento:v1')))!).pages).toContain(path === '/app' ? 'today' : path.split('/')[2]);
    // Back to the list, with the keyboard: one Tab stop, the arrows choose.
    await layout(page).getByRole('radio', {name: 'Bento'}).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(layout(page).getByRole('radio', {name: 'List'})).toBeFocused();
    await expect(layout(page).getByRole('radio', {name: 'List'})).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await tiles(page, region)).template).toBe(list.template);
  });

  test('a page that offers no Bento shows no switch', async ({page}) => {
    await page.goto('/app/markets'); await hydrated(page);
    await expect(layout(page)).toHaveCount(0);
  });
});

test('on a phone the switch is not shown and the list stays', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone check');
  await offlineApi(page); await loadShowcase(page);
  await page.goto('/app/goals'); await hydrated(page);
  await expect(layout(page)).toBeHidden();
});
