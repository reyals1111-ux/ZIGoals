import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {offline} from './p6-helpers';

/**
 * Review b2b #5 (q4 #30): Habits → "This week, Monday to Sunday" → "Skip this day" on a day with the person's own note
 * marks the day skipped and keeps the note word for word; Undo puts back the count and the same note. Fictional data;
 * every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-25T08:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000011';
const NOTE = 'Fictional · read in the rain';
const tuesday = (page: Page) => page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {id: string; entries: {date: string; count: number; disposition: string; note: string}[]}[]).find(h => h.id === id)?.entries.find(e => e.date === '2026-11-24') ?? null, [HABITS_KEY, ID] as const);

test('skip a noted day from the week grid: the note stays, and Undo brings back the count with it', async ({page, isMobile}) => {
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = createHabit(emptyHabitData(), {title: 'Fictional reading', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'pages'}, target: 10}, START, ID);
  d = logHabitValue(d, ID, '2026-11-24', 4, {note: NOTE}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-25'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  await page.locator('summary', {hasText: 'This week, Monday to Sunday'}).click();
  await page.getByRole('group', {name: 'A tap on a day'}).getByRole('radio', {name: 'Opens Skip and amount'}).check();
  const grid = page.getByRole('region', {name: 'Habits this week, by day'});
  await grid.getByRole('button', {name: /^Fictional reading, Tue, Nov 24: .+\. Open Skip and amount$/}).click();
  await page.getByRole('button', {name: 'Skip this day'}).click();
  await expect.poll(async () => (await tuesday(page))?.disposition).toBe('skipped');
  expect((await tuesday(page))?.note).toBe(NOTE);
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(async () => (await tuesday(page))?.disposition).toBe('logged');
  expect(await tuesday(page)).toMatchObject({count: 4, note: NOTE});
});
