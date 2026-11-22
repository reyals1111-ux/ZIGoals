import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #201, #202; Strong): repeating a workout with an assisted pull-up keeps the help (its own
 * column, "Help kg", filled from last time); the leg press switched to lb shows lb while the log keeps kg; a lighter help
 * is a star ("least help yet"); Exercise history says "Least help" — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const record = {version: 1, templates: [], exercises: [], restSeconds: 0, workouts: [{id: 'w1', name: 'Fictional pull', date: '2026-11-20', type: 'strength', startedAt: '2026-11-20T08:00:00.000Z', endedAt: '2026-11-20T09:00:00.000Z',
  exercises: [{id: 'e1', exerciseId: 'pull-up', name: 'Pull-up', measure: 'reps', load: 'assisted', sets: [{id: 's1', kind: 'normal', reps: 8, assistKg: 20, done: true}]},
    {id: 'e2', exerciseId: 'leg-press', name: 'Leg press', measure: 'weight-reps', sets: [{id: 's2', kind: 'normal', reps: 10, weightKg: 100, done: true}]}]}]};
for (const theme of THEMES) test(`${theme}: an assisted pull-up and a leg press in lb`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  await expect(page.getByRole('region', {name: 'Exercise history'})).toContainText('Least help');
  await page.getByRole('button', {name: 'Repeat Fictional pull'}).click();
  const now = page.locator('#workout-now');
  const pull = now.getByRole('article', {name: 'Pull-up'}).filter({has: page.locator('.workouts-sets')});
  await expect(pull.getByRole('combobox', {name: 'Body weight'})).toHaveValue('assisted');
  await expect(pull.getByRole('columnheader', {name: 'Help kg'})).toBeVisible();
  const help = pull.getByRole('textbox', {name: 'Pull-up, set 1: help in kg'});
  await pull.getByRole('button', {name: /^Pull-up, set 1: use last time, 8 reps, 20 kg help$/}).click();
  await expect(help).toHaveValue('20');
  await help.fill('15');
  await pull.getByRole('textbox', {name: 'Pull-up, set 1: reps'}).fill('8');
  await pull.getByRole('button', {name: 'Mark Pull-up, set 1 done'}).click();
  await expect(pull.locator('.workouts-set-best')).toContainText('least help yet');
  const press = now.getByRole('article', {name: 'Leg press'}).filter({has: page.locator('.workouts-sets')});
  await press.getByRole('combobox', {name: 'Unit'}).selectOption('lb');
  await expect(press.getByRole('columnheader', {name: 'lb'})).toBeVisible();
  await expect(press.getByRole('button', {name: /use last time, 220\.5 lb × 10/})).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).exerciseUnits, WORKOUTS_KEY)).toEqual({'leg-press': 'lb'});
  const findings = await axe(page, now);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
