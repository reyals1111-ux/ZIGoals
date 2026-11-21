import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-HABIT-LOOK; Streaks): a habit's options menu → "Symbol and colour…" puts a symbol in
 * a colour beside its name (decoration; the name says what it is), kept in the habit extras, removable — at 390 and
 * 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-10T08:00:00+01:00'), NOW = new Date('2026-11-23T08:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000001';
for (const theme of THEMES) test(`${theme}: a teal star beside the walk, then removed`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  const d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-23'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const walk = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await walk.getByRole('button', {name: 'Options for Fictional walk', exact: true}).click();
  await walk.getByRole('menuitem', {name: 'Symbol and colour…', exact: true}).click();
  const picker = walk.getByRole('group', {name: /^Symbol and colour for Fictional walk/});
  await expect(picker.getByLabel('Symbol ●')).toBeFocused(); // q4 #26 (keyboard): the checked symbol has the focus, so Escape works at once
  await picker.getByRole('group', {name: 'Symbol'}).getByLabel('Symbol ★').check();
  await picker.getByRole('group', {name: 'Colour'}).getByLabel('Teal').check();
  const findings = await axe(page, picker);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await picker.getByRole('button', {name: 'Save'}).click();
  await expect(walk.locator('h2 .habit-look')).toHaveText('★');
  await expect(walk.locator('h2 .habit-look')).toHaveAttribute('data-look-colour', 'teal');
  await expect(walk.getByRole('heading', {name: 'Fictional walk', exact: true})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habit-extras:v1') ?? 'null')?.looks)).toEqual({'aaaaaaaa-0000-4000-8000-000000000001': {glyph: '★', colour: 'teal'}});
  // q4 #26 (Major): the symbol wherever the name is listed — the week grid here, and Today.
  await page.locator('summary', {hasText: 'This week, Monday to Sunday'}).click();
  await expect(page.getByRole('region', {name: 'Habits this week, by day'}).getByRole('rowheader', {name: 'Fictional walk'}).locator('.habit-look')).toHaveText('★');
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('.habits-today .habit-look').first()).toHaveText('★', {timeout: 15_000});
  await page.goto('/app/habits'); await hydrated(page);
  await walk.getByRole('button', {name: 'Options for Fictional walk', exact: true}).click();
  await walk.getByRole('menuitem', {name: 'Symbol and colour…', exact: true}).click();
  await walk.getByRole('button', {name: 'Remove the symbol'}).click();
  await expect(walk.locator('h2 .habit-look')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
