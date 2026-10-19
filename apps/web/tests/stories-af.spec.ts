import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, type HabitData, type HabitInput} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {STORIES_KEY} from '../lib/af-extras-keys';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AF (L5b; P9.3, ADR-028 H55, H78): Stories at /app/stories — the week, month and year covers; a story opened by
 * the person (the one write, `zigoals:stories:v1`), tapped through by Next/Previous and ← / →, closed by Escape; the
 * person's own style on the opener; a share on every card giving a 1080 × 1350 image drawn on the device; one honest card
 * under three logged days; no card that advances by itself, and still cards under reduced motion; viewing that writes
 * nothing. Fictional habit; the clock is fixed.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-10-19';
const ID = 'ffffffff-0000-4000-8000-0000000000f1';
const input = (title: string): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}});
function habits(daysBack: number[]): HabitData {
  let d = createHabit(emptyHabitData(), input('Fictional stretch'), new Date(`${addLocalDays(TODAY, -40)}T06:00:00Z`), ID);
  for (const back of daysBack) d = logHabitValue(d, ID, addLocalDays(TODAY, -back), 1, {mode: 'set'}, new Date(`${TODAY}T07:00:00Z`));
  return d;
}
async function seed(page: Page, daysBack: number[]) {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [HABITS_KEY]: JSON.stringify(habits(daysBack)), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
  });
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
}
async function open(page: Page) {
  await page.goto('/app/stories');
  await expect(page).toHaveTitle('Stories · ZIGoals Alpha');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Your week, month and year, told back to you');
  await expect(page.locator('.stories-page')).toHaveAttribute('data-stories', 'ready');
}
/** A browser that can share files would open its share sheet, which a headless run never settles (goals-best-aa's rule): the
 *  device-side save path runs instead. */
const noFileShare = (page: Page) => page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'canShare', {configurable: true, value: () => false}); });
const storage = (page: Page) => page.evaluate(() => JSON.stringify([Object.entries(localStorage).sort(), Object.entries(sessionStorage).filter(([k]) => !k.startsWith('zigoals-checklist-mark')).sort()]));
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), STORIES_KEY);
const player = (page: Page, name = 'Your week’s story') => page.getByRole('dialog', {name});

test('three covers; viewing writes nothing; Open is the one write and the story taps through and closes', async ({page}) => {
  await seed(page, [0, 1, 2, 3, 4]);
  await open(page);
  const covers = page.getByRole('list', {name: 'Your stories'});
  await expect(covers.getByRole('heading', {level: 2})).toHaveText(['Your week', 'Your month', 'Your year']);
  await expect(covers.locator('[data-period=week]')).toContainText('5 logged days');
  await expect(covers.locator('[data-period=week]')).toContainText('Your style: Rhythm keeper');
  await expect(covers.locator('[data-period=week]')).toContainText('Not opened yet.');
  const before = await storage(page);
  await page.reload();
  await expect(page.locator('.stories-page')).toHaveAttribute('data-stories', 'ready');
  expect(await storage(page)).toBe(before);
  expect(await stored(page)).toBeNull();
  await page.getByRole('button', {name: 'Open your week’s story', exact: true}).click();
  const story = player(page);
  await expect(story).toBeVisible();
  await expect(story.getByRole('list', {name: /^Card 1 of \d+$/})).toBeVisible();
  await expect(story.getByRole('heading', {level: 2})).toHaveText('Your week in 5 logged days');
  await expect(story).toContainText('Your style this week: Rhythm keeper.');
  await expect.poll(() => stored(page)).toEqual({version: 1, seen: {[`week:${addLocalDays(TODAY, -6)}`]: TODAY}});
  await page.keyboard.press('ArrowRight');
  await expect(story.getByRole('heading', {level: 2})).toHaveText('Fictional stretch');
  await expect(story).toContainText('5 days in a row, still going.');
  await story.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(story.getByRole('list', {name: /^Card 3 of \d+$/})).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(story.getByRole('list', {name: /^Card 2 of \d+$/})).toBeVisible();
  await story.getByRole('button', {name: 'Previous', exact: true}).click();
  await expect(story.getByRole('heading', {level: 2})).toHaveText('Your week in 5 logged days');
  // Every card has its own share; the story never moves by itself (ten seconds later it is still card 1).
  await page.clock.runFor(10_000);
  await expect(story.getByRole('list', {name: /^Card 1 of \d+$/})).toBeVisible();
  const count = Number((await story.getByRole('list', {name: /^Card 1 of \d+$/}).getAttribute('aria-label'))!.split(' of ')[1]);
  for (let i = 0; i < count; i++) {
    await expect(story.getByRole('button', {name: /^Share this card as an image: /})).toBeVisible();
    await expect(story.locator('.story-card')).not.toContainText(/[$€£%]|\b(price|rate|return|balance)\b/i);
    await story.getByRole('button', {name: i === count - 1 ? 'Done' : 'Next', exact: true}).click();
  }
  await expect(story).toHaveCount(0);
  await expect(page.locator('[data-period=week]')).toContainText('Opened today.');
  // Escape closes too, and focus returns to the cover's button.
  await page.getByRole('button', {name: 'Open your month’s story', exact: true}).click();
  await expect(player(page, 'Your month’s story')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(player(page, 'Your month’s story')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Open your month’s story', exact: true})).toBeFocused();
});

test('each card shares as its own 1080 × 1350 image, drawn on the device', async ({page}) => {
  await noFileShare(page);
  await seed(page, [0, 1, 2, 3, 4]);
  await open(page);
  await page.getByRole('button', {name: 'Open your year’s story', exact: true}).click();
  const story = player(page, 'Your year’s story');
  await expect(story.getByRole('heading', {level: 2})).toHaveText('Your year in 5 logged days');
  const download = page.waitForEvent('download');
  await story.getByRole('button', {name: 'Share this card as an image: Your year in 5 logged days'}).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('story-year-2026-opener.png');
  const png = readFileSync((await file.path())!);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);
});

test('under three logged days: one honest card; reduced motion: the cards are stills', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await seed(page, [0, 1]);
  await open(page);
  await expect(page.locator('[data-period=week]')).toContainText('2 logged days of the 3 a story needs');
  await page.getByRole('button', {name: 'Open your week’s story', exact: true}).click();
  const story = player(page);
  await expect(story.getByRole('list', {name: 'Card 1 of 1'})).toBeVisible();
  await expect(story.getByRole('heading', {level: 2})).toHaveText('Not enough days yet');
  await expect(story).toContainText('Three logged days make a story. This week has 2 days so far.');
  expect(await story.locator('.story-card').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await story.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(story).toHaveCount(0);
});
