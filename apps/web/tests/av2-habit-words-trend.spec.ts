import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {openHabitDetails} from './ab-shell';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (health r3; LEDGER #275, #276, Way of Life): a habit's editor → "Your own words and more times" saves
 * "Shoes by the door?" and 18:00 in the habit extras, and Today's reminder card says the words; "Trend per habit" under
 * the habits' history lists the walk as More often (100% now, 50% before) and the reading as Less often, and the walk's
 * Consistency & trends says it in a sentence — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const NOW = new Date('2026-11-23T19:00:00+01:00'), TODAY = '2026-11-23', FIRST = addLocalDays(TODAY, -59);
const WALK = 'aaaaaaaa-0000-4000-8000-000000000011', READ = 'aaaaaaaa-0000-4000-8000-000000000012';
for (const theme of THEMES) test(`${theme}: a reminder in your own words, and a trend per habit`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = emptyHabitData();
  d = createHabit(d, {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date(`${FIRST}T08:00:00Z`), WALK);
  d = createHabit(d, {title: 'Fictional reading', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date(`${FIRST}T08:00:00Z`), READ);
  // The walk: every other day in the 30 days before, every day in the last 30 (today still open). The reading: the other way.
  for (let i = 0; i < 59; i++) {
    const day = addLocalDays(FIRST, i);
    if (i >= 30 || i % 2 === 0) d = logHabitValue(d, WALK, day, 1, {}, NOW);
    if (i < 30 || i % 3 === 0) d = logHabitValue(d, READ, day, 1, {}, NOW);
  }
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem('zigoals:reminders:v1', JSON.stringify({version: 1, habits: {'aaaaaaaa-0000-4000-8000-000000000011': {time: '07:00'}}, dismissed: {}})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-23'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);

  // The trend per habit.
  const trend = page.getByRole('article', {name: 'Trend per habit'});
  await expect(trend.getByRole('region', {name: /More often/})).toContainText('Fictional walk');
  await expect(trend.getByRole('region', {name: /More often/})).toContainText('100% now, 50% before');
  await expect(trend.getByRole('region', {name: /Less often/})).toContainText('Fictional reading');
  await expect(trend).not.toContainText(/attention|warning/i);
  const trendFindings = await axe(page, trend);
  expect(trendFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(trendFindings)).toEqual([]);

  const walk = page.getByRole('article', {name: 'Fictional walk', exact: true});
  // Session AV lane 2 (fixb3: the fold sits behind the card's Details, deliberate): Details first, as a person opens it.
  await openHabitDetails(walk);
  await walk.getByText('Consistency & trends', {exact: true}).click();
  await expect(walk.locator('.habit-trend-line')).toContainText('in the last 30 days, 50% (15 of 30 days) the 30 before: more often.');

  // Your own words and more times, in the habit's editor.
  await walk.getByRole('button', {name: 'Edit Fictional walk'}).first().click();
  const more = page.locator('details.habit-reminder-more');
  await more.locator('summary').click();
  await expect(more).toContainText('only where names are allowed');
  await more.getByRole('textbox', {name: 'Reminder words (optional)'}).fill('Shoes by the door?');
  await expect(more).toContainText('18 of 80 characters');
  await more.getByLabel('Also at').fill('18:00');
  await more.getByRole('button', {name: 'Save words and times'}).click();
  await expect(more.getByRole('status')).toHaveText('Saved: “Shoes by the door?”, also at 18:00.');
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habit-extras:v1') ?? 'null')?.reminderMore);
  expect(kept).toEqual({[WALK]: {words: 'Shoes by the door?', times: ['18:00']}});
  const moreFindings = await axe(page, more);
  expect(moreFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(moreFindings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  // Today's reminder card says the words.
  await page.goto('/app'); await hydrated(page);
  await expect(page.getByRole('article', {name: 'Reminder: Fictional walk'})).toContainText('Shoes by the door? Not done yet today.');
});
