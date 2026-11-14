import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../ah-helpers';

/**
 * Session AP (owner decision 14 Nov, backlog #8; ADR-040): the optional Bento view on Goals, Habits, Health, Wealth and Today
 * (below its protected hero). The list stays the default; "Layout: List · Bento" switches; the choice is remembered per
 * page on this device; the cards sit side by side as tiles; the hero is the same in both; phones show no switch. The switch
 * is in "Arrange this page" (Unlock layout), with the rest of arranging (ADR-040 D24); the layouts are measured locked.
 */
// The pages, and whether their cards stand side by side as tiles (Goals and Wealth keep cards that hold their own grids
// on the whole row: the goal cards, the holdings).
const PAGES = [['/app', 'today:main', true], ['/app/goals', 'goals:body', false], ['/app/habits', 'habits:body', true], ['/app/health', 'health:body', true], ['/app/wealth', 'wealth:body', false]] as const;
const layout = (page: Page) => page.getByRole('region', {name: 'Arrange this page'}).getByRole('radiogroup', {name: 'Layout'});
const unlock = async (page: Page) => { await page.getByRole('button', {name: 'Unlock layout to rearrange', exact: true}).click(); await expect(page.getByRole('region', {name: 'Arrange this page'})).toBeVisible(); };
const lock = async (page: Page) => { await page.getByRole('button', {name: 'Lock layout', exact: true}).click(); await expect(page.getByRole('region', {name: 'Arrange this page'})).toHaveCount(0); };
const tiles = (page: Page, region: string) => page.evaluate(r => {
  const items = [...document.querySelectorAll<HTMLElement>(`[data-layout-region="${r}"]`)].filter(el => el.getClientRects().length);
  const parent = items[0]?.parentElement;
  const rects = items.map(el => el.getBoundingClientRect());
  // UX review (Blocker, Session AP): no card squeezed, no two cards over each other, the page's own header full width.
  const narrowest = Math.min(...rects.map(b => b.width));
  const overlaps = rects.some((a, i) => rects.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
  const hero = document.querySelector<HTMLElement>('main .pillar-hero, main .page-heading, main .today-hero, main .wealth-hero');
  return {narrowest, overlaps, heroWidth: hero ? Math.round(hero.getBoundingClientRect().width) : 0, boxes: items.map(el => { const b = el.getBoundingClientRect(); return `${Math.round(b.left)}:${Math.round(b.width)}`; }).join(' '), display: parent ? getComputedStyle(parent).display : '', template: parent ? getComputedStyle(parent).gridTemplateColumns : '', lefts: new Set(items.map(el => Math.round(el.getBoundingClientRect().left))).size, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
}, region);

test.describe('on a computer', () => {
  test.use({viewport: {width: 1440, height: 900}});
  test.beforeEach(async ({page}, info) => { test.skip(info.project.name !== 'desktop', 'computers only'); await offlineApi(page); await loadShowcase(page); });

  for (const [path, region, sideBySide] of PAGES) test(`${path}: List by default; Bento lays the cards out as tiles and is remembered on this device`, async ({page}) => {
    await page.goto(path); await hydrated(page);
    // The header keeps nothing of the switch: only the lock (ADR-040 D24).
    await expect(page.getByRole('radiogroup', {name: 'Layout'})).toHaveCount(0);
    const list = await tiles(page, region);
    const hero = path === '/app' ? await page.locator('.today-hero').boundingBox() : null;
    await unlock(page);
    const group = layout(page);
    await expect(group.getByRole('radio', {name: 'List'})).toHaveAttribute('aria-checked', 'true');
    await group.getByRole('radio', {name: 'Bento'}).click();
    await expect(group.getByRole('radio', {name: 'Bento'})).toHaveAttribute('aria-checked', 'true');
    await lock(page);
    await expect.poll(async () => (await tiles(page, region)).display).toBe('grid');
    await page.waitForTimeout(300);
    const t = await tiles(page, region);
    // Tiles: no card squeezed (300 px at least), none over another, the page's header as wide as in the list, cards side by
    // side where the page has self-contained cards, nothing scrolls sideways.
    expect(t.narrowest, 'no card squeezed').toBeGreaterThanOrEqual(300);
    expect(t.overlaps, 'no card over another').toBe(false);
    expect(t.heroWidth, 'the header keeps its width').toBe(list.heroWidth);
    if (sideBySide) { expect(t.lefts).toBeGreaterThanOrEqual(2); expect(t.boxes).not.toBe(list.boxes); }
    expect(t.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
    // Today's hero is the same in both views.
    if (hero) expect(await page.locator('.today-hero').boundingBox()).toEqual(hero);
    await page.reload(); await hydrated(page);
    await expect.poll(async () => (await tiles(page, region)).boxes).toBe(t.boxes);
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:bento:v1')))!).pages).toContain(path === '/app' ? 'today' : path.split('/')[2]);
    // Back to the list, with the keyboard: one Tab stop, the arrows choose.
    await unlock(page);
    await expect(layout(page).getByRole('radio', {name: 'Bento'})).toHaveAttribute('aria-checked', 'true');
    await layout(page).getByRole('radio', {name: 'Bento'}).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(layout(page).getByRole('radio', {name: 'List'})).toBeFocused();
    await expect(layout(page).getByRole('radio', {name: 'List'})).toHaveAttribute('aria-checked', 'true');
    await lock(page);
    await expect.poll(async () => (await tiles(page, region)).boxes).toBe(list.boxes);
  });

  test('a page that offers no Bento shows no switch', async ({page}) => {
    await page.goto('/app/markets'); await hydrated(page);
    await unlock(page);
    await expect(layout(page)).toHaveCount(0);
  });
});

test('on a phone the switch is not shown and the list stays', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone check');
  await offlineApi(page); await loadShowcase(page);
  await page.goto('/app/goals'); await hydrated(page);
  await unlock(page);
  // Drawn after the bar's own code arrives; on a phone it is never shown.
  await page.waitForTimeout(500);
  await expect(layout(page)).toBeHidden();
});
