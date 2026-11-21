import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-YESTERDAY; Habitica): Habits opens with yesterday's daily habits still open, in one
 * list — Done for one, All done, each with Undo, Not now for this visit — and the list goes once anything is logged
 * today. At 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api
 * call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-10T08:00:00+01:00'), NOW = new Date('2026-11-23T08:00:00+01:00');
function seedData() {
  let d = emptyHabitData();
  const base = {category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}} as const;
  d = createHabit(d, {...base, title: 'Fictional walk', measurement: {kind: 'boolean'}, target: 1}, START, 'aaaaaaaa-0000-4000-8000-000000000001');
  d = createHabit(d, {...base, title: 'Fictional water', measurement: {kind: 'count', unit: 'glasses'}, target: 8}, START, 'aaaaaaaa-0000-4000-8000-000000000002');
  d = createHabit(d, {...base, title: 'Fictional stretch', measurement: {kind: 'boolean'}, target: 1}, START, 'aaaaaaaa-0000-4000-8000-000000000003');
  d = logHabitValue(d, 'aaaaaaaa-0000-4000-8000-000000000002', '2026-11-22', 3, {}, NOW);
  return logHabitValue(d, 'aaaaaaaa-0000-4000-8000-000000000003', '2026-11-22', 1, {}, NOW);
}
const yesterday = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {title: string; entries: {date: string; count: number}[]}[]).map(h => [h.title, h.entries.find(e => e.date === '2026-11-22')?.count ?? 0]), HABITS_KEY);
for (const theme of THEMES) test(`${theme}: yesterday's walk and water ticked late, with Undo; gone once today is logged`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HABITS_KEY, JSON.stringify(seedData())] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const card = page.getByRole('region', {name: 'Yesterday, still open'});
  const list = card.getByRole('list', {name: "Yesterday's open habits"});
  // Session AV (F-MISS-REASON, deliberate): each row also offers "What got in the way?".
  await expect(list.getByRole('listitem')).toHaveText([/^Fictional walk\s*Done\s*What got in the way\?$/, /^Fictional water · 3 of 8\s*Done\s*What got in the way\?$/]);
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await card.getByRole('button', {name: 'Fictional walk: done yesterday'}).click();
  await expect.poll(() => yesterday(page)).toEqual([['Fictional walk', 1], ['Fictional water', 3], ['Fictional stretch', 1]]);
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => yesterday(page)).toEqual([['Fictional walk', 0], ['Fictional water', 3], ['Fictional stretch', 1]]);
  await card.getByRole('button', {name: 'All done'}).click();
  await expect.poll(() => yesterday(page)).toEqual([['Fictional walk', 1], ['Fictional water', 8], ['Fictional stretch', 1]]);
  await expect(card).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('what got in the way: the water marked not done with a reason, which is the day\'s note', async ({page}) => {
  await offline(page);
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HABITS_KEY, JSON.stringify(seedData())] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const card = page.getByRole('region', {name: 'Yesterday, still open'});
  await card.getByRole('button', {name: 'Fictional water: what got in the way?'}).click();
  const why = card.getByRole('form', {name: 'What got in the way of Fictional water'});
  await why.getByLabel('Too busy').check();
  await why.getByLabel('In your own words (optional)').fill('a long fictional day');
  const findings = await axe(page, why);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await why.getByRole('button', {name: 'Save as not done'}).click();
  await expect(card.getByRole('list', {name: "Yesterday's open habits"}).getByRole('listitem')).toHaveCount(1);
  const entry = await page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {title: string; entries: {date: string; disposition: string; note: string}[]}[]).find(h => h.title === 'Fictional water')?.entries.find(e => e.date === '2026-11-22'), HABITS_KEY);
  expect(entry).toMatchObject({disposition: 'failed', note: 'Too busy — a long fictional day'});
});

test('"Not now" leaves it for this visit; a check-in today ends it', async ({page}) => {
  await offline(page);
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  const today = logHabitValue(seedData(), 'aaaaaaaa-0000-4000-8000-000000000003', '2026-11-23', 1, {}, NOW);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HABITS_KEY, JSON.stringify(seedData())] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const card = page.getByRole('region', {name: 'Yesterday, still open'});
  await card.getByRole('button', {name: 'Not now'}).click();
  await expect(card).toHaveCount(0);
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('heading', {name: 'Yesterday, still open'})).toHaveCount(0);
  await page.evaluate(() => sessionStorage.clear());
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [HABITS_KEY, JSON.stringify(today)] as const);
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('heading', {name: 'Yesterday, still open'})).toHaveCount(0);
});
