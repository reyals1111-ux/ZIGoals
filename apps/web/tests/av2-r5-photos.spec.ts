import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, LEDGER #377): Health → Workouts → Your workouts: a photo added to a
 * finished workout is kept in this browser (its id on the workout), shown as a thumbnail and removed with Undo; the star
 * puts the workout in Favourites, whose filter teaches when empty — at 390 and 1440, in Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320. Fictional data; /api 503.
 */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNwaDgARAwQCgAoDgYBQzpj2gAAAABJRU5ErkJggg==', 'base64');
const day = (d: string, name: string) => ({id: `w-${d}`, name, date: d, type: 'strength', startedAt: `${d}T07:00:00.000Z`, endedAt: `${d}T08:00:00.000Z`,
  exercises: [{id: `e-${d}`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: `s-${d}`, kind: 'normal', weightKg: 80, reps: 5, done: true}]}]});
const record = {version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [day('2026-11-18', 'Fictional legs'), day('2026-11-20', 'Fictional push')]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).workouts as {id: string; photos?: string[]; star?: boolean}[], WORKOUTS_KEY);
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: workout photos and favourites`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const history = page.getByRole('region', {name: 'Your workouts'});
  const filter = history.getByRole('group', {name: 'Show workouts'});
  await expect(filter.getByRole('button', {name: 'All'})).toHaveAttribute('aria-pressed', 'true');
  await filter.getByRole('button', {name: 'Favourites (0)'}).click();
  await expect(history).toContainText('No favourites yet. Under All, open a workout and choose Favourite to keep it here.');
  await filter.getByRole('button', {name: 'All'}).click();

  const legs = history.locator('.workouts-past > li').filter({hasText: 'Fictional legs'});
  await legs.locator('summary').click();
  await expect(legs).toContainText('Photos stay in this browser: never uploaded or synced, and nothing reads them.');
  await legs.getByLabel('Add a photo (0 of 4)').setInputFiles({name: 'fictional.png', mimeType: 'image/png', buffer: PNG});
  await expect(legs.getByRole('img', {name: 'Photo 1 of Fictional legs on Nov 18'})).toBeVisible();
  await expect(legs.getByRole('status')).toContainText('Photo kept with Fictional legs on Nov 18, in this browser only');
  const ids = (await stored(page)).find(x => x.id === 'w-2026-11-18')!.photos!;
  expect(ids).toHaveLength(1);
  expect(ids[0]).toMatch(/^wph-/);

  // Remove with Undo.
  await legs.getByRole('button', {name: 'Remove photo 1 of Fictional legs on Nov 18'}).click();
  await expect(legs.getByRole('img')).toHaveCount(0);
  await page.getByRole('button', {name: 'Undo'}).last().click();
  await expect(legs.getByRole('img', {name: 'Photo 1 of Fictional legs on Nov 18'})).toBeVisible();

  // The star and the Favourites filter.
  const star = legs.getByRole('button', {name: /^Favourite: Fictional legs on /});
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  expect((await stored(page)).find(x => x.id === 'w-2026-11-18')!.star).toBe(true);
  await filter.getByRole('button', {name: 'Favourites (1)'}).click();
  await expect(history.locator('.workouts-past > li')).toHaveCount(1);
  await expect(history.locator('.workouts-past > li summary')).toContainText('Fictional legs');

  const findings = await axe(page, history);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
