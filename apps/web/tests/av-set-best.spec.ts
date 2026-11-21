import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV, owner follow-up 1 (F-SET-BEST; Hevy's pinned note and PR badge): in a workout under way, Bench press shows
 * last time's note ("Seat at notch 4") with "Keep it", which copies it; ticking 62.5 kg × 5 against last time's 60 kg
 * marks the set as a new best (heaviest yet), and a lighter set is not marked — at 390 and 1440, in Nebula, Light and
 * Dark, axe-clean, no sideways scroll at 320. Fictional workouts; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const bench = (id: string, sets: unknown[], note?: string) => ({id, exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets, ...(note ? {note} : {})});
const set = (id: string, weightKg: number, reps: number, done: boolean) => ({id, kind: 'normal', weightKg, reps, done});
const record = {version: 1, templates: [], exercises: [], workouts: [
  {id: 'w_last', name: 'Fictional push', date: '2026-11-20', type: 'strength', startedAt: '2026-11-20T08:00:00.000Z', endedAt: '2026-11-20T09:00:00.000Z', exercises: [bench('e_last', [set('s_l1', 60, 8, true), set('s_l2', 60, 8, true)], 'Seat at notch 4')]},
  {id: 'w_now', name: 'Fictional push', date: '2026-11-23', type: 'strength', startedAt: '2026-11-23T08:30:00.000Z', exercises: [bench('e_now', [set('s_n1', 62.5, 5, false), set('s_n2', 55, 8, false)])]}]};
for (const theme of THEMES) test(`${theme}: last time's note kept, 62.5 kg marked as the heaviest yet`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const exercise = page.getByRole('article', {name: 'Bench press'});
  await expect(exercise.locator('.workouts-last-note')).toContainText('Last time’s note: Seat at notch 4');
  await exercise.getByRole('button', {name: 'Keep last time’s note for Bench press'}).click();
  await expect(exercise.getByLabel('Note for Bench press')).toHaveValue('Seat at notch 4');
  await expect(exercise.locator('.workouts-last-note')).toHaveCount(0);
  await exercise.getByRole('button', {name: 'Mark Bench press, set 1 done'}).click();
  await exercise.getByRole('button', {name: 'Mark Bench press, set 2 done'}).click();
  await expect(exercise.locator('.workouts-set-best')).toHaveCount(1);
  await expect(exercise.getByRole('row').nth(1).locator('.workouts-set-best')).toContainText('Bench press, set 1: a new best, heaviest yet');
  const findings = await axe(page, exercise);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as typeof record).workouts[1]!.exercises[0]!.note, WORKOUTS_KEY)).toBe('Seat at notch 4');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
