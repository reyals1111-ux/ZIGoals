import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY, createHabit, emptyHabitData, logHabitCount} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WEEKLY_REVIEW_KEY, type WeeklyReview} from '../lib/weekly-review/schema';
import {reviewWindow} from '../lib/weekly-review/engine';
import {addLocalDays} from '../lib/local-date';
import {isPhone} from './phone-nav';

// G1 (Session P): the weekly review on the chosen day; six calm steps with the person's own numbers; device-only.
const TODAY = '2026-09-15', WEEKDAY = 2; // a Tuesday, chosen as the review day
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const stored = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), WEEKLY_REVIEW_KEY)) ?? 'null') as WeeklyReview | null;
async function seed(page: Page) {
  let habits = createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'count', unit: 'times'}}, new Date('2026-09-01T08:00:00.000Z'), '11111111-1111-4111-8111-111111111111');
  habits = logHabitCount(habits, '11111111-1111-4111-8111-111111111111', '2026-09-14', 1, '', new Date('2026-09-14T08:00:00.000Z'));
  habits = logHabitCount(habits, '11111111-1111-4111-8111-111111111111', TODAY, 1, '', new Date(`${TODAY}T09:00:00.000Z`));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HABITS_KEY]: JSON.stringify(habits), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WEEKLY_REVIEW_KEY]: JSON.stringify({version: 1, weekday: WEEKDAY, reviews: []})});
}
const card = (page: Page) => page.getByRole('region', {name: /^(A short look back at your week\.|Continue your review\.)$/});
/** On a phone one "For you" card is open; the review may wait behind Show more. */
async function reveal(page: Page) {
  await expect(page.getByRole('region', {name: 'For you', exact: true})).toBeVisible();
  if (!(await card(page).isVisible().catch(() => false))) { const fold = page.getByRole('region', {name: 'For you', exact: true}).getByRole('button', {name: /^Show more/}); if (await fold.count()) await fold.click(); }
}

test('on the review day: six steps with the week\'s own numbers, an intention, finish; the card leaves and stays away', async ({page}) => {
  await seed(page);
  const window = reviewWindow(WEEKDAY, TODAY);
  await page.goto('/app');
  await reveal(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText(`${window.weekStart} – ${window.weekEnd}`);
  await card(page).getByRole('button', {name: 'Start review', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Your week'});
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Step 1 of [56]/);
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('What went well');
  await expect(dialog).toContainText('2 habit check-ins');
  const words = dialog.getByLabel('Your words, if you like');
  if (await isPhone(page)) {
    expect(await words.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
    expect((await dialog.getByRole('button', {name: 'Next', exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await dialog.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('Goals');
  await dialog.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('Habits');
  await expect(dialog).toContainText(/Stretch · 2 of \d+/);
  while (await dialog.getByRole('button', {name: 'Next', exact: true}).count()) await dialog.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(dialog.getByRole('heading', {level: 3})).toHaveText('One intention');
  await words.fill('Walk on Thursday');
  await dialog.getByRole('button', {name: 'Finish review', exact: true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'Review saved on this device.'})).toBeVisible();
  const saved = (await stored(page))!;
  expect(saved.reviews).toHaveLength(1);
  expect(saved.reviews[0]).toMatchObject({weekStart: window.weekStart, notes: {intention: 'Walk on Thursday'}});
  expect(saved.reviews[0]!.completedAt).toBeTruthy();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test('Escape keeps the draft; skip this week writes a skip and the next review day brings a new card', async ({page}) => {
  await seed(page);
  const window = reviewWindow(WEEKDAY, TODAY);
  await page.goto('/app');
  await reveal(page);
  await card(page).getByRole('button', {name: 'Start review', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Your week'});
  await dialog.getByLabel('Your words, if you like').fill('A calm week');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(card(page)).toContainText('Continue your review.');
  if (!(await isPhone(page))) await expect(page.getByRole('button', {name: 'Continue', exact: true})).toBeFocused();
  expect((await stored(page))!.reviews[0]).toMatchObject({weekStart: window.weekStart, notes: {wentWell: 'A calm week'}});
  expect((await stored(page))!.reviews[0]!.completedAt).toBeFalsy();
  await card(page).getByRole('button', {name: 'Skip this week', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Skipped this week.'})).toBeVisible();
  const skipped = (await stored(page))!.reviews[0]!;
  expect(skipped).toMatchObject({weekStart: window.weekStart, skipped: true});
  expect(skipped.completedAt).toBeFalsy();
  await expect(card(page)).toHaveCount(0);
  const nextDay = addLocalDays(window.reviewDay, 7);
  await page.clock.setSystemTime(new Date(`${nextDay}T10:00:00.000Z`));
  await page.reload();
  await reveal(page);
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText('A short look back at your week.');
});

test('Showcase: the review is offered on its day, the last fictional intention is shown, and viewing writes nothing', async ({page}) => {
  await page.clock.setSystemTime(new Date('2026-09-13T10:00:00.000Z')); // a Sunday, the Showcase review day
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), WEEKLY_REVIEW_KEY);
  expect(before).not.toBe('[]');
  await reveal(page);
  await expect(card(page)).toBeVisible();
  expect(await page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), WEEKLY_REVIEW_KEY)).toBe(before);
  await card(page).getByRole('button', {name: 'Start review', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Your week'});
  while (await dialog.getByRole('button', {name: 'Next', exact: true}).count()) await dialog.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(dialog).toContainText('Last week you wrote: SHOWCASE DATA · fictional intention');
});
