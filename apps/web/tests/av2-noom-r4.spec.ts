import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {HEALTH_EXTRAS_KEY} from '../lib/health-extras';
import {MORE_GOALS_KEY} from '../lib/health-goals/more';
import {CALORIE_WEEK_KEY} from '../lib/health-aa/calorie-week';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2, round 4 (health; Noom, LEDGER #328, #329, #331): a note for a harder week written in the Diary and
 * shown on the food day after four days without a food log (never a count of days), closed once; a planned free day in
 * Targets → Weekly calorie budget (the extra on its day, the others giving evenly, never below the floor); "Keep my weight
 * between …" in Goals → Health goals, shaded on the weight trend with its days inside — at 390 and 1440 in Nebula, Light and
 * Dark, axe-clean, no sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-18', AT = `${TODAY}T07:00:00.000Z`;
const health = {...createEmptyHealth(), targets: {...createEmptyHealth().targets, kcal: 2000},
  diary: [{id: 'health_diary-r4-0001', sourceId: 'health_food-r4-0001', sourceKind: 'food', snapshot: {name: 'Fictional porridge', servingGrams: 250, nutrients: {kcal: 350, proteinMg: 10_000, carbsMg: 60_000, fatMg: 6_000}}, date: addLocalDays(TODAY, -5), meal: 'Breakfast', quantityMilli: 1000, createdAt: AT, updatedAt: AT}],
  weights: Array.from({length: 20}, (_, i) => ({id: `health_weight-r4-${String(i).padStart(4, '0')}`, date: addLocalDays(TODAY, -19 + i), grams: 72_000 + (i % 3) * 200, createdAt: AT, updatedAt: AT}))};

for (const theme of THEMES) test(`${theme}: a note for a harder week, a free day and a weight band`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T09:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);

  // The note, written in the Diary; shown on the food day after days away; closed once.
  await page.goto('/app/health'); await hydrated(page);
  await page.getByText('A note for a harder week (optional)').click();
  const form = page.getByRole('form', {name: 'A note for a harder week'});
  await form.getByLabel('Your note').fill('Why: I want to feel steady.\nOne small thing: log breakfast.');
  await form.getByRole('button', {name: 'Keep the note'}).click();
  await expect(form.getByRole('status')).toHaveText('Your note is kept. It shows on your food day when you come back after a few days away.');
  await page.reload(); await hydrated(page);
  const note = page.getByRole('region', {name: 'Your note for a harder week'});
  await expect(note).toContainText('One small thing: log breakfast.');
  await expect(note).not.toContainText(/\d+ days/);
  const found = await axe(page, note);
  expect(found.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(found)).toEqual([]);
  await note.getByRole('button', {name: 'Thanks, close it'}).click();
  await expect(note).toHaveCount(0);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).returnNote.closedFor, HEALTH_EXTRAS_KEY)).toBe(addLocalDays(TODAY, -5));

  // A planned free day on Saturday: +600, Wednesday to Sunday's other days give 150 each.
  await page.goto('/app/health?view=targets'); await hydrated(page);
  await page.getByText('Weekly calorie budget (optional)').click();
  const free = page.getByRole('form', {name: 'Plan a free day'});
  // Session AV lane 2 (fixb4; deliberate): "Day" also matched "Extra that day (kcal, …)"; exactly "Day", as strict.
  await free.getByLabel('Day', {exact: true}).fill('2026-11-21');
  await free.getByRole('textbox', {name: /^Extra that day/}).fill('600');
  await free.getByRole('button', {name: 'Plan the free day'}).click();
  await expect(page.getByRole('region', {name: 'A planned free day'})).toContainText('600 kcal more, taken evenly from 4 other days of that week.');
  await expect(page.getByText('(+600 free day)')).toBeVisible();
  await expect(page.getByText('(−150 for the free day)').first()).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).freeDay, CALORIE_WEEK_KEY)).toEqual({date: '2026-11-21', extraKcal: 600, plannedOn: TODAY});

  // Keep my weight between 71 and 73 kg: shaded on the trend, its days counted.
  await page.goto('/app/goals'); await hydrated(page);
  await page.getByText('Goals on a nutrient, a measurement or your own number').click();
  const band = page.getByRole('form', {name: 'Your weight band'});
  await band.getByRole('textbox', {name: 'From (kg)'}).fill('71');
  await band.getByRole('textbox', {name: 'To (kg)'}).fill('73');
  await band.getByRole('button', {name: 'Keep this band'}).click();
  // Session AV lane 2 (CI run 2007; deliberate): the band now speaks through "More goals"' one status line (the section had
  // two at once); the same words, in the section's only status (strict mode: exactly one).
  await expect(page.locator('#goals-health').locator('.more-goals').getByRole('status')).toContainText('Your band: 71');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).weightBand, MORE_GOALS_KEY)).toMatchObject({lowGrams: 71_000, highGrams: 73_000});
  await page.goto('/app/health?view=weight'); await hydrated(page);
  const trend = page.getByRole('region', {name: 'Weight trend'});
  await expect(trend.locator('.r4-band-shade')).toHaveCount(1);
  await expect(trend).toContainText('Your band: 71');
  await expect(trend).toContainText(/The trend was inside it on \d+ of the last \d+ days\./);
  const findings = await axe(page, trend);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
