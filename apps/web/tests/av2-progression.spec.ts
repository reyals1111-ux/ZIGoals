import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #109, MacroFactor's rep progression): a routine with a rep range (8 to 12, +2.5 kg)
 * whose last session reached 12 on every set starts at 62.5 kg × 8 and says why; Edit changes the rule — at 390 and 1440,
 * in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const set = (id: string, kind: string, kg: number, reps: number) => ({id, kind, weightKg: kg, reps, done: true});
const routine = {id: 'routine-fictional', name: 'Fictional press', type: 'strength', createdAt: '2026-11-01T08:00:00.000Z', progression: {kind: 'double', minReps: 8, maxReps: 12, stepKg: 2.5},
  exercises: [{exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{kind: 'warmup', weightKg: 40, reps: 10}, {kind: 'normal', reps: 8}, {kind: 'normal', reps: 8}, {kind: 'normal', reps: 8}]}]};
const record = {version: 1, exercises: [], restSeconds: 90, templates: [routine], workouts: [{id: 'w1', name: 'Fictional press', date: '2026-11-20', type: 'strength', templateId: 'routine-fictional', startedAt: '2026-11-20T08:00:00.000Z', endedAt: '2026-11-20T09:00:00.000Z',
  exercises: [{id: 'e1', exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [set('s0', 'warmup', 40, 10), set('s1', 'normal', 60, 12), set('s2', 'normal', 60, 12), set('s3', 'normal', 60, 12)]}]}]};
for (const theme of THEMES) test(`${theme}: today's target from the rule, and a new rule`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await expect(start.locator('.workouts-routines')).toContainText('Progression: 8–12 reps, then +2.5 kg');
  await start.getByRole('button', {name: 'Edit routine Fictional press'}).click();
  await start.getByRole('combobox', {name: 'Rule'}).selectOption('linear');
  await start.getByRole('textbox', {name: 'Weight to add (kg)'}).fill('5');
  await start.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(start.locator('.workouts-routines')).toContainText('Progression: +5 kg each session');
  await start.getByRole('button', {name: 'Edit routine Fictional press'}).click();
  await start.getByRole('combobox', {name: 'Rule'}).selectOption('double');
  await start.getByRole('textbox', {name: 'Fewest reps'}).fill('8');
  await start.getByRole('textbox', {name: 'Most reps'}).fill('12');
  await start.getByRole('textbox', {name: 'Weight to add (kg)'}).fill('2.5');
  const findings = await axe(page, start);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await start.getByRole('button', {name: 'Save', exact: true}).click();
  await start.getByRole('button', {name: 'Start Fictional press', exact: true}).click();
  const now = page.locator('#workout-now');
  await expect(now.locator('.workouts-progression-note')).toHaveText('Progression: 62.5 kg × 8 today. Every set reached its target on Nov 20, so the weight goes up.');
  await expect(now.getByRole('textbox', {name: 'Bench press, set 2: weight in kg'})).toHaveValue('62.5');
  await expect(now.getByRole('textbox', {name: 'Bench press, set 2: reps'})).toHaveValue('8');
  const nowFindings = await axe(page, now);
  expect(nowFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(nowFindings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
