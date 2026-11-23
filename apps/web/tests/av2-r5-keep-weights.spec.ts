import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2, round 5 (gym; Bevel, LEDGER #373): a routine's Edit has "Keep my last weights"; finishing a workout
 * started from it writes the done set's weight back into the routine, the toast says so, and Undo puts the routine's own
 * weight back — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
const AT = '2026-11-20T08:00:00.000Z';
const record = {version: 1, workouts: [], exercises: [], restSeconds: 0,
  templates: [{id: 'routine-fictional', name: 'Fictional press', type: 'strength', createdAt: AT, exercises: [{exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{kind: 'normal', weightKg: 60, reps: 8}]}]}]};
const routineSet = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).templates[0].exercises[0].sets[0], WORKOUTS_KEY);
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: a routine that keeps its last weights`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.getByRole('button', {name: 'Edit routine Fictional press'}).click();
  const keep = start.getByRole('checkbox', {name: 'Keep my last weights'});
  await expect(keep).not.toBeChecked();
  await keep.check();
  const findings = await axe(page, start);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await start.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(start.locator('.workouts-routines')).toContainText('Keeps your last weights');

  await start.getByRole('button', {name: 'Start Fictional press', exact: true}).click();
  const now = page.locator('#workout-now');
  await now.getByRole('textbox', {name: 'Bench press, set 1: weight in kg'}).fill('62.5');
  await now.getByRole('button', {name: 'Mark Bench press, set 1 done'}).click();
  await now.getByRole('button', {name: 'Finish workout'}).click();
  await expect(page.getByText('Fictional press keeps these weights for next time.')).toBeVisible();
  expect(await routineSet(page)).toMatchObject({kind: 'normal', weightKg: 62.5, reps: 8});

  await page.getByRole('button', {name: 'Undo'}).last().click();
  await expect(page.getByText('Fictional press has its weights from before.')).toBeVisible();
  expect(await routineSet(page)).toMatchObject({weightKg: 60, reps: 8});
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
