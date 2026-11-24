import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (habits; QUALITY "Not fixed", q4 #30 Minor — Habitify's week view skips and logs amounts per cell):
 * Habits → "This week, Monday to Sunday" → "A tap on a day: Opens Skip and amount": Tuesday's reading skipped, then an
 * amount of pages, each with Undo, the focus on the day's heading and back on the cell on Escape — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways page scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-25T08:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000011';
const tuesday = (page: Page) => page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {id: string; entries: {date: string; count: number; disposition: string}[]}[]).find(h => h.id === id)?.entries.find(e => e.date === '2026-11-24') ?? null, [HABITS_KEY, ID] as const);
for (const theme of THEMES) test(`${theme}: skip a day and set an amount from the week grid`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = createHabit(emptyHabitData(), {title: 'Fictional reading', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'pages'}, target: 10}, START, ID);
  d = logHabitValue(d, ID, '2026-11-23', 10, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-25'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  await page.locator('summary', {hasText: 'This week, Monday to Sunday'}).click();
  const mode = page.getByRole('group', {name: 'A tap on a day'});
  await expect(mode.getByRole('radio', {name: 'Marks it done'})).toBeChecked();
  await mode.getByRole('radio', {name: 'Opens Skip and amount'}).check();
  const grid = page.getByRole('region', {name: 'Habits this week, by day'});
  const cell = grid.getByRole('button', {name: /^Fictional reading, Tue, Nov 24: missed\. Open Skip and amount$/});
  await cell.click();
  await expect(page.getByRole('heading', {name: /^Fictional reading, Tue/})).toBeFocused();
  const findings = await axe(page, page.locator('.habit-week'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.getByRole('button', {name: 'Skip this day'}).click();
  await expect.poll(async () => (await tuesday(page))?.disposition).toBe('skipped');
  await expect(grid.getByRole('button', {name: /^Fictional reading, Tue, Nov 24: skipped\. Open Skip and amount$/})).toBeFocused();
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(async () => (await tuesday(page))?.disposition ?? 'none').not.toBe('skipped');
  await grid.getByRole('button', {name: /^Fictional reading, Tue, Nov 24: .+\. Open Skip and amount$/}).click();
  await page.getByRole('textbox', {name: 'Amount (pages)'}).fill('6');
  await page.getByRole('button', {name: 'Set amount'}).click();
  await expect.poll(async () => (await tuesday(page))?.count).toBe(6);
  // Escape closes the panel and gives the focus back to its cell.
  const again = grid.getByRole('button', {name: /^Fictional reading, Tue, Nov 24: .+\. Open Skip and amount$/});
  await again.click();
  await page.keyboard.press('Escape');
  await expect(again).toBeFocused();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
