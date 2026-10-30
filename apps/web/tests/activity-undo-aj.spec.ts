import {expect, test} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HABITS_KEY, createHabit, emptyHabitData, logHabitValue} from '../lib/habits';

// Session AJ (item 18, SE5): a habit day is removed from Activity with the app's one Undo; the habit journal is exactly
// as before after Undo. Fictional habit; every request to the server answered offline. Its times are in the past at any
// hour (a creation time later than the Undo's own write is refused by the habit journal).
const ID = 'aaaaaaaa-0000-4000-8000-0000000000e1';
test('Activity: remove a habit day, then Undo puts it back exactly', async ({page}) => {
  const today = new Date().toISOString().slice(0, 10);
  let habits = createHabit(emptyHabitData(), {title: 'Fictional stretch', category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning'} as never, new Date(Date.now() - 2 * 3_600_000), ID);
  habits = logHabitValue(habits, ID, today, 1, {}, new Date(Date.now() - 3_600_000));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(([k1, v1, k2, v2]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k1!, v1!); localStorage.setItem(k2!, v2!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, [HABITS_KEY, JSON.stringify({...habits, timeZone: 'UTC'}), DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);
  await page.goto('/app/activity');
  const before = await page.evaluate(k => localStorage.getItem(k), HABITS_KEY);
  const remove = page.getByRole('button', {name: /^Remove Fictional stretch/});
  await remove.first().click();
  await expect(page.getByText('Removed: Fictional stretch, that day.')).toBeVisible();
  const removed = JSON.parse((await page.evaluate(k => localStorage.getItem(k), HABITS_KEY))!);
  expect(removed.habits[0].entries.filter((e: {date: string}) => e.date === today)).toHaveLength(0);
  await page.getByRole('button', {name: /^Undo/}).click();
  await expect(page.getByText('Fictional stretch is back for that day.')).toBeVisible();
  const back = JSON.parse((await page.evaluate(k => localStorage.getItem(k), HABITS_KEY))!);
  expect(back.habits[0].entries.map((e: {date: string; count: number}) => [e.date, e.count])).toEqual(JSON.parse(before!).habits[0].entries.map((e: {date: string; count: number}) => [e.date, e.count]));
});
