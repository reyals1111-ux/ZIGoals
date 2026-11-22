import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2, round 6 (r6-body; Caliber, LEDGER #420, #421, #422, #424): Health → Workouts. "Exercises and
 * how-tos" → Squat shows its bests with the day each was set; "Light week (not in my bests)" on the heavier workout moves
 * the best back to the other day while its sets stay in the history; "Count bests from today" keeps earlier bests greyed
 * as "before"; the star makes Squat a favourite, first when adding an exercise; its own defaults (3 × 8, 120 s rest) are
 * kept, and its earlier sets still win when it is added: the last workout that counts (100 kg, the light week passed over)
 * — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
const set = (id: string, kg: number, reps: number) => ({id, kind: 'normal', weightKg: kg, reps, done: true});
const day = (id: string, date: string, kg: number, name: string) => ({id, name, date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T09:00:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [set(`${id}-s1`, kg, 5)]}]});
const record = {version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [day('w1', '2026-10-12', 100, 'Fictional legs A'), day('w2', '2026-11-20', 110, 'Fictional legs B')]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as {workouts: {id: string; light?: boolean}[]; favouriteExercises?: string[]; bestsFrom?: Record<string, string>; exerciseDefaults?: Record<string, unknown>}, WORKOUTS_KEY);
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: favourite exercises, a light week, bests with their days, an exercise's defaults`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);

  // A light week (#421) on the heavier workout.
  const history = page.getByRole('region', {name: 'Your workouts'});
  const b = history.locator('.workouts-past > li').filter({hasText: 'Fictional legs B'});
  await b.locator('summary').click();
  await b.getByRole('button', {name: /^Light week \(not in my bests\): Fictional legs B/}).click();
  await expect.poll(async () => (await stored(page)).workouts.find(w => w.id === 'w2')?.light).toBe(true);
  await expect(b.locator('summary')).toContainText('light week');
  await expect(b).toContainText('Squat');

  // Bests with their days (#422), the star (#420) and the defaults (#424), in the library.
  const panel = page.getByRole('region', {name: 'Exercises and how-tos'});
  await panel.locator('details.workouts-library-fold > summary').click();
  await panel.getByRole('searchbox', {name: 'Find an exercise'}).fill('squat');
  await panel.getByRole('button', {name: /^Squat Legs\b/}).click();
  const card = panel.getByRole('article', {name: 'Squat'});
  await expect(card.locator('.r6-bests').first()).toContainText(/Heaviest: 100 kg · .*Oct 12/);
  await expect(card).toContainText('1 light week is left out of these bests');
  await card.getByRole('button', {name: 'Count bests from today for Squat'}).click();
  await expect.poll(async () => (await stored(page)).bestsFrom).toEqual({squat: '2026-11-23'});
  await expect(card).toContainText('No best since');
  await expect(card.locator('.r6-bests li[data-before="true"]').first()).toContainText('Heaviest: 100 kg (before)');
  await card.getByRole('button', {name: 'Count every workout again for Squat'}).click();
  await expect.poll(async () => (await stored(page)).bestsFrom).toBeUndefined();
  await card.getByRole('button', {name: 'Favourite: Squat'}).click();
  await expect.poll(async () => (await stored(page)).favouriteExercises).toEqual(['squat']);
  const defaults = card.getByRole('form', {name: 'Defaults for Squat'});
  await defaults.getByLabel('Sets').fill('3');
  await defaults.getByLabel('Reps each').fill('8');
  await defaults.getByLabel('Rest (seconds)').fill('120');
  await defaults.getByRole('button', {name: 'Set the defaults'}).click();
  await expect.poll(async () => (await stored(page)).exerciseDefaults).toEqual({squat: {sets: 3, reps: 8, restSeconds: 120}});
  await expect(card).toContainText('Now: 3 × 8, 2 min rest.');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  // Favourites first when adding an exercise.
  await page.getByRole('button', {name: 'Start an empty workout'}).click();
  const now = page.locator('#workout-now');
  await expect(now.getByText('Favourites', {exact: true})).toBeVisible();
  const favs = now.getByRole('list', {name: 'Favourites'});
  await expect(favs.getByRole('listitem')).toHaveCount(1);
  await expect(favs.getByRole('button', {name: 'Favourite: Squat'})).toHaveAttribute('aria-pressed', 'true');
  await favs.getByRole('button', {name: /^Squat/}).first().click();
  await expect(now.getByLabel('Squat, set 1: weight in kg')).toHaveValue('100');
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
