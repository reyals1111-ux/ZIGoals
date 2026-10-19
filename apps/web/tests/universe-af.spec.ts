import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, type HabitData, type HabitInput} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {UNIVERSE_KEY} from '../lib/af-extras-keys';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AF (L5b; P9.1, ADR-028 H55, H77): My Universe on /app/journey, above the game sections and with the game layer
 * off — four planets with 44 px controls, the facts of each (counts only), a milestone reached today celebrated once in
 * place (only the person's "Lovely" writes, and only `zigoals:universe:v1`), a share image of 1080 × 1350 drawn on the
 * device, viewing that writes nothing, and a still universe under reduced motion and Motion Off. Fictional habit; the
 * clock is fixed.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-10-19';
const ID = 'bbbbbbbb-0000-4000-8000-0000000000b1';
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
/** Started 30 days ago; done nine days in a row two to three weeks ago, and today: the tenth check-in lands today (ring 2). */
function habits(): HabitData {
  let d = createHabit(emptyHabitData(), input('Fictional stretch'), new Date(`${addLocalDays(TODAY, -30)}T06:00:00Z`), ID);
  for (const back of [20, 19, 18, 17, 16, 15, 14, 13, 12, 0]) { const day = addLocalDays(TODAY, -back); d = logHabitValue(d, ID, day, 1, {mode: 'set'}, new Date(`${TODAY}T07:00:00Z`)); }
  return d;
}
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [HABITS_KEY]: JSON.stringify(habits()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...extra,
  });
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
}
const universe = (page: Page) => page.getByRole('region', {name: /^(My universe|Your universe is waiting for its first light\.|\d+ rings?, \d+ moons?)$/});
/** A browser that can share files would open its share sheet, which a headless run never settles (goals-best-aa's rule): the
 *  device-side save path runs instead. */
const noFileShare = (page: Page) => page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'canShare', {configurable: true, value: () => false}); });
const storage = (page: Page) => page.evaluate(() => JSON.stringify([Object.entries(localStorage).sort(), Object.entries(sessionStorage).filter(([k]) => !k.startsWith('zigoals-checklist-mark')).sort()]));
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test('with the game layer off: the universe sits above the game sections; a milestone reached today celebrates once and only "Lovely" writes', async ({page}) => {
  await seed(page);
  await page.goto('/app/journey');
  const section = universe(page);
  await expect(section).toBeVisible();
  await expect(page.getByRole('heading', {name: 'The game layer is off.'})).toBeVisible();
  const [u, off] = await Promise.all([section.boundingBox(), page.getByRole('heading', {name: 'The game layer is off.'}).boundingBox()]);
  expect(u!.y).toBeLessThan(off!.y);
  const card = section.getByRole('region', {name: 'Habits gained ring 2'});
  await expect(card).toBeVisible();
  await expect(card).toContainText('10 habit check-ins in all.');
  // Viewing writes nothing: the same bytes after a reload with the celebration still waiting.
  const before = await storage(page);
  await page.reload();
  await expect(universe(page).getByRole('region', {name: 'Habits gained ring 2'})).toBeVisible();
  expect(await storage(page)).toBe(before);
  expect(await stored(page, UNIVERSE_KEY)).toBeNull();
  await universe(page).getByRole('button', {name: 'Lovely', exact: true}).click();
  await expect(universe(page).getByRole('region', {name: 'Habits gained ring 2'})).toHaveCount(0);
  await expect.poll(() => stored(page, UNIVERSE_KEY)).toEqual({version: 1, celebrated: {'universe:habits:ring:2': TODAY}});
  const after = JSON.parse(await storage(page)) as [[string, string][], [string, string][]], was = JSON.parse(before) as typeof after;
  expect(after[0].filter(([k]) => k !== UNIVERSE_KEY)).toEqual(was[0]); // nothing else written
  await page.reload();
  await expect(universe(page)).toBeVisible();
  await expect(universe(page).getByRole('region', {name: 'Habits gained ring 2'})).toHaveCount(0);
});

test('four planets: 44 px controls, the facts in counts only, a share image of 1080 × 1350 made on the device', async ({page}) => {
  await noFileShare(page);
  await seed(page, {[UNIVERSE_KEY]: JSON.stringify({version: 1, celebrated: {'universe:habits:ring:2': TODAY}})});
  await page.goto('/app/journey');
  const section = universe(page);
  await expect(section.getByRole('heading', {level: 2})).toHaveText('2 rings, 1 moon');
  for (const name of ['Habits', 'Health', 'Goals', 'Wealth']) {
    const button = section.getByRole('button', {name: new RegExp(`^${name}: `)});
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const habitsButton = section.getByRole('button', {name: /^Habits: 2 rings · 1 moon · 2 faint rings, lit today$/});
  await habitsButton.click();
  await expect(habitsButton).toHaveAttribute('aria-pressed', 'true');
  const facts = section.locator('#universe-planet-habits');
  await expect(facts).toHaveAttribute('data-selected', 'true');
  await expect(facts).toContainText('10 check-ins');
  await expect(facts).toContainText('1 habit held a 7-day streak');
  await expect(facts).toContainText('Lit today');
  await expect(section.getByRole('list', {name: 'Your four planets'})).not.toContainText(/[$€£%]|price|return|balance/i);
  const download = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Share my universe', exact: true}).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`my-universe-${TODAY}.png`);
  const png = readFileSync((await file.path())!);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);
});

test('reduced motion and Motion Off: the universe is a still and the celebration has no particles', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await seed(page);
  await page.goto('/app/journey');
  const section = universe(page);
  await expect(section.getByRole('region', {name: 'Habits gained ring 2'})).toBeVisible();
  await expect(section.locator('.universe-scene')).not.toHaveAttribute('data-entrance', /./);
  await expect(section.locator('.universe-celebration')).toHaveAttribute('data-still', 'true');
  await expect(section.locator('.celebration-particles')).toHaveCount(0);
  const animated = await section.locator('.universe-scene *').evaluateAll(nodes => nodes.filter(n => getComputedStyle(n).animationName !== 'none').length);
  expect(animated).toBe(0);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));
  await page.reload();
  await expect(universe(page).getByRole('region', {name: 'Habits gained ring 2'})).toBeVisible();
  await expect(universe(page).locator('.universe-scene')).not.toHaveAttribute('data-entrance', /./);
  await expect(universe(page).locator('.celebration-particles')).toHaveCount(0);
});

test('the Showcase: a universe from the demo records, no celebration over it, and viewing writes nothing', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/journey');
  const section = universe(page);
  await expect(section.getByRole('heading', {level: 2})).toHaveText(/^\d+ rings?, \d+ moons?$/);
  await expect(section.locator('.universe-celebration')).toHaveCount(0);
  const before = await storage(page);
  await page.reload();
  await expect(universe(page).getByRole('list', {name: 'Your four planets'})).toBeVisible();
  expect(await storage(page)).toBe(before);
});
