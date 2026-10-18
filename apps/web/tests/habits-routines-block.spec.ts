import {expect, test, type Page} from '@playwright/test';
import {isPhone} from './phone-nav';
import {createHabit, emptyHabitData, HABITS_KEY, saveHabitTimezone} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

/**
 * Session AE Part 4 (ADR-027), the owner's S3 and S4 on Habits. S4: Routines (with your stacks) is its own movable block,
 * `habits:routines`, by default right after the time-of-day groups; it has its own handle and arrows; a layout saved before
 * it existed still wins and is never rewritten. S3: each time-of-day banner has as much room above its first cards as the
 * group keeps below its last. Showcase data (fictional), offline.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
}
const LAYOUT = 'zigoals:layout:v1';
const DESKTOP = ['habits:overview', 'habits:consistency', 'habits:list', 'habits:routines', 'habits:rhythm'];
const PHONE = ['habits:overview', 'habits:list', 'habits:routines', 'habits:consistency', 'habits:rhythm'];
const order = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-layout-region="habits:body"]')].map(e => e.dataset.layoutItem));
const saved = (page: Page) => page.evaluate(key => sessionStorage.getItem(key), LAYOUT);
async function openHabits(page: Page) {
  await page.goto('/app/habits');
  await page.waitForFunction(() => !document.querySelector('.workspace[aria-busy="true"]'));
  await expect(page.locator('details.habit-section')).toHaveCount(4);
  await expect(page.locator('[data-layout-item="habits:routines"] #habit-routines-title')).toHaveCount(1); // the Routines chunk is in
}
/** The Routines heading against the time-of-day groups, in one frame. */
const place = (page: Page) => page.evaluate(() => {
  const groups = [...document.querySelectorAll('details.habit-section')].map(g => g.getBoundingClientRect()), routines = document.getElementById('habit-routines-title')!.getBoundingClientRect();
  return {routines: routines.top, groupsTop: groups[0]!.top, groupsBottom: groups.at(-1)!.bottom};
});

for (const [width, height] of [[1440, 900], [390, 844]] as const)
  test(`${width} px: by default the time-of-day groups come first and Routines right below them, in a block of its own`, async ({page}) => {
    await page.setViewportSize({width, height});
    await showcase(page); await openHabits(page);
    const phone = await isPhone(page); expect(phone).toBe(width < 768);
    expect(await order(page)).toEqual(phone ? PHONE : DESKTOP);
    const list = page.locator('[data-layout-item="habits:list"]'), routines = page.locator('[data-layout-item="habits:routines"]');
    // "Your habits" keeps the filters, the groups and the year view; Routines and your stacks are outside it.
    await expect(list.getByRole('group', {name: 'Filter habits'})).toHaveCount(1);
    await expect(list.locator('details.habit-section')).toHaveCount(4);
    await expect(list.locator('.habit-year')).toHaveCount(1);
    await expect(list.locator('.habit-routines, .habit-stacks')).toHaveCount(0);
    await expect(routines.getByRole('heading', {name: 'Routines', exact: true})).toHaveCount(1);
    // The Showcase has no stack yet (lib/habits-extras/showcase.ts), so Routines offers its four templates.
    await expect(routines.getByRole('group', {name: 'Routine templates'}).getByRole('button', {name: 'Add routine', exact: true})).toHaveCount(4);
    const p = await place(page); expect(p.routines).toBeGreaterThan(p.groupsBottom);
  });

test('with a stack, "Your stacks" and its routine sit together in the Routines block, outside "Your habits"', async ({page}) => {
  const bed = '11111111-1111-4111-8111-111111111111', water = '22222222-2222-4222-8222-222222222222', at = new Date('2026-09-01T06:00:00.000Z');
  let data = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels');
  for (const [id, title, extra] of [[bed, 'Fictional make the bed', {}], [water, 'Fictional drink water', {stackAfterId: bed}]] as const)
    data = createHabit(data, {title, category: 'Home', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}, ...extra} as never, at, id);
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[HABITS_KEY]: JSON.stringify(data), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
  await page.goto('/app/habits');
  const routines = page.locator('[data-layout-item="habits:routines"]'), list = page.locator('[data-layout-item="habits:list"]');
  await expect(routines.getByRole('region', {name: 'Your stacks', exact: true})).toBeVisible();
  await expect(routines.getByRole('region', {name: 'Routines', exact: true})).toContainText('Fictional make the bed → Fictional drink water');
  await expect(list.locator('.habit-stacks, .habit-routines')).toHaveCount(0);
  // The stack's "View" still takes you to the habit in the groups above.
  await routines.getByRole('button', {name: 'View Fictional drink water', exact: true}).click();
  await expect(list.getByRole('article', {name: 'Fictional drink water', exact: true})).toBeInViewport();
});

test('arrange mode: "Your habits" and "Routines" each have a handle and arrows; Routines moved up stays above the groups after a reload; Reset puts the groups first again', async ({page}) => {
  await showcase(page); await openHabits(page);
  const phone = await isPhone(page), initial = phone ? PHONE : DESKTOP;
  expect(await order(page)).toEqual(initial);
  await page.getByRole('button', {name: 'Unlock layout to rearrange', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Arrange this page'})).toBeVisible();
  for (const [id, label] of [['habits:list', 'Your habits'], ['habits:routines', 'Routines']] as const) {
    const controls = page.locator(`[data-layout-item="${id}"] > .layout-controls`);
    await expect(controls).toHaveCount(1);
    await expect(controls).toHaveAttribute('aria-label', `Arrange ${label}`);
    await expect(controls.locator('.layout-handle')).toHaveCount(1);
    await expect(controls.getByRole('button', {name: `Move ${label} up`, exact: true})).toBeEnabled();
    await expect(controls.getByRole('button', {name: `Move ${label} down`, exact: true})).toBeEnabled();
  }
  const up = page.locator('[data-layout-item="habits:routines"] > .layout-controls').getByRole('button', {name: 'Move Routines up', exact: true});
  await up.focus(); await page.keyboard.press('Enter');
  const moved = phone ? ['habits:overview', 'habits:routines', 'habits:list', 'habits:consistency', 'habits:rhythm'] : ['habits:overview', 'habits:consistency', 'habits:routines', 'habits:list', 'habits:rhythm'];
  await expect.poll(() => order(page)).toEqual(moved);
  await expect(page.locator('[data-layout-announcer]')).toHaveText(`Moved Routines to position ${phone ? 2 : 3} of 5.`);
  await expect(up).toBeFocused();
  expect(await saved(page)).toBe(`{"version":1,"pages":{"habits":{"body":{"order":${JSON.stringify(moved)}}}}}`);
  let p = await place(page); expect(p.routines).toBeLessThan(p.groupsTop);
  await page.reload(); await openHabits(page);
  expect(await order(page)).toEqual(moved);
  p = await place(page); expect(p.routines).toBeLessThan(p.groupsTop);
  await page.getByRole('button', {name: 'Unlock layout to rearrange', exact: true}).click();
  await page.getByRole('button', {name: 'Reset this page', exact: true}).click();
  await expect.poll(() => order(page)).toEqual(initial);
  expect(JSON.parse((await saved(page))!).pages.habits).toBeUndefined();
  p = await place(page); expect(p.routines).toBeGreaterThan(p.groupsBottom);
  await page.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(page.locator('.layout-controls')).toHaveCount(0);
});

test('a layout saved before Routines was its own block still wins: Routines appears right after your habits, and the saved bytes stay as they were', async ({page}) => {
  await showcase(page);
  // As an older build writes it: the four items it knew, in the person's order.
  const old = JSON.stringify({version: 1, pages: {habits: {body: {order: ['habits:rhythm', 'habits:list', 'habits:overview', 'habits:consistency']}}}});
  await page.evaluate(([key, value]) => sessionStorage.setItem(key!, value!), [LAYOUT, old]);
  await openHabits(page);
  expect(await order(page)).toEqual(['habits:rhythm', 'habits:list', 'habits:routines', 'habits:overview', 'habits:consistency']);
  const p = await place(page); expect(p.routines).toBeGreaterThan(p.groupsBottom);
  expect(await saved(page)).toBe(old);
  await page.reload(); await openHabits(page);
  expect(await saved(page)).toBe(old);
});

for (const [width, height] of [[1440, 900], [390, 844]] as const)
  test(`${width} px: the Morning banner has as much room above its first cards as the group keeps below its last`, async ({page}) => {
    await page.setViewportSize({width, height});
    await showcase(page); await openHabits(page);
    const morning = page.locator('details.habit-section-morning');
    await expect(morning).toHaveAttribute('open', '');
    await expect(morning.locator('.habit-grid > .habit-card').first()).toBeVisible();
    await page.mouse.move(0, 0); // no card lifted under the pointer
    const gaps = () => morning.evaluate(group => {
      const banner = group.querySelector(':scope > summary')!.getBoundingClientRect(), box = group.getBoundingClientRect();
      const cards = [...group.querySelectorAll(':scope > .habit-grid > .habit-card')].map(card => card.getBoundingClientRect());
      return {above: Math.min(...cards.map(c => c.top)) - banner.bottom, below: box.bottom - Math.max(...cards.map(c => c.bottom))};
    });
    await expect.poll(async () => { const g = await gaps(); return Math.abs(g.above - g.below); }).toBeLessThanOrEqual(2);
    // Room, not the 4 px it was: 18 px on a computer, 12 px on a phone (each side, the border aside).
    const g = await gaps();
    expect(g.above).toBeGreaterThanOrEqual(width < 768 ? 11 : 17);
  });
