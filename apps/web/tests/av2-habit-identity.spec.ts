import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {HABIT_EXTRAS_KEY} from '../lib/aa-device-keys';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (r4-mind; LEDGER #323, #327, Atoms): "Who you are becoming" on Habits — a line in the person's own
 * words joined to a habit, its ticks counted ("22 times this month") — and start small, then step up: after four steady
 * weeks at the small version the quiet card offers the habit itself; Yes changes what Details say it is now (Undo puts it
 * back); the habit's Details show its sizes. At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-10-20T08:00:00+02:00'), NOW = new Date('2026-11-23T08:00:00+01:00');
const READ = 'aaaaaaaa-0000-4000-8000-000000000002';
const extras = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {identities?: {text: string; habits: string[]}[]; stepUp?: Record<string, {now?: string}>} | null, HABIT_EXTRAS_KEY);
for (const theme of THEMES) test(`${theme}: who you are becoming, and a step up`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = emptyHabitData();
  d = createHabit(d, {title: 'Fictional reading', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, READ);
  for (let t = Date.parse('2026-10-20T12:00:00Z'); t < Date.parse('2026-11-23T00:00:00Z'); t += 86_400_000) d = logHabitValue(d, READ, new Date(t).toISOString().slice(0, 10), 1, {}, NOW);
  const x = {version: 1, stepUp: {[READ]: {small: 'One fictional page', next: 'Two fictional pages', now: 'small', since: '2026-10-24', card: true}}};
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([hk, hv, xk, xv]) => { localStorage.setItem(hk, hv); localStorage.setItem(xk, xv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-23'); }, [HABITS_KEY, JSON.stringify(d), HABIT_EXTRAS_KEY, JSON.stringify(x)] as const);
  await page.goto('/app/habits'); await hydrated(page);

  // The step-up card: four steady weeks at the small version.
  const card = page.getByRole('region', {name: 'A step for Fictional reading'});
  await expect(card).toContainText('Ready for a step up?');
  await expect(card).toContainText('You did Fictional reading on 28 of 28 due days in the last four weeks.');
  let findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await card.getByRole('button', {name: 'Yes, Fictional reading'}).click();
  await expect.poll(async () => (await extras(page))?.stepUp?.[READ]?.now ?? 'full').toBe('full');
  await expect(card).toHaveCount(0);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await extras(page))?.stepUp?.[READ]?.now).toBe('small');

  // Who you are becoming: one line, joined to the habit.
  const self = page.getByRole('region', {name: 'Who you are becoming'});
  await expect(self).toContainText('Write who you want to be in a line');
  await self.getByRole('button', {name: 'Write your first line'}).click();
  const form = self.getByRole('form', {name: 'A new line about who you are becoming'});
  await expect(form.getByRole('textbox', {name: 'In your own words'})).toBeFocused();
  await form.getByRole('textbox', {name: 'In your own words'}).fill('I am someone who reads every evening');
  await form.getByRole('checkbox', {name: 'Fictional reading'}).check();
  await form.getByRole('button', {name: 'Add the line'}).click();
  await expect(self.getByText('I am someone who reads every evening')).toBeVisible();
  await expect(self.getByText('22 times this month · 0 times this week')).toBeVisible();
  await expect(self.getByText('Through Fictional reading')).toBeVisible();
  await expect.poll(async () => (await extras(page))?.identities?.[0]).toMatchObject({text: 'I am someone who reads every evening', habits: [READ]});
  findings = await axe(page, self);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  // The habit's Details: its sizes, and what it is now.
  const reading = page.getByRole('article', {name: 'Fictional reading', exact: true});
  await reading.getByLabel('Details for Fictional reading', {exact: true}).click();
  const sizes = reading.locator('.habit-step-up');
  await expect(sizes).toContainText('Now: One fictional page');
  await sizes.getByRole('radio', {name: 'The next step: Two fictional pages'}).check();
  await expect.poll(async () => (await extras(page))?.stepUp?.[READ]?.now).toBe('next');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
