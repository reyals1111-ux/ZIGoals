import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2, round 5 (gym; Bevel, LEDGER #378): under an exercise in a workout, "Warm-up and plates" → "Your bar and
 * plates" → "Loaded on one side" with the sled's own 40 kg: 110 kg reads as plates on the one side with the machine's own
 * weight, kept with the plate set — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
const AT = '2026-11-23T08:00:00.000Z';
const record = {version: 1, templates: [], exercises: [], restSeconds: 0, plates: {unit: 'kg', bar: 20, plates: [{size: 20, pairs: 2}, {size: 10, pairs: 1}, {size: 5, pairs: 1}, {size: 2.5, pairs: 1}]},
  workouts: [{id: 'workout-now', name: 'Fictional legs', date: '2026-11-23', type: 'strength', startedAt: AT, exercises: [{id: 'e1', exerciseId: 'leg-press', name: 'Leg press', measure: 'weight-reps', sets: [{id: 's1', kind: 'normal', weightKg: 110, reps: 10, done: false}]}]}]};
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: plates on one side`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const now = page.locator('#workout-now');
  await now.locator('details.workouts-tools-sheet > summary').click();
  const tools = now.locator('.workouts-tools');
  await expect(tools).toContainText('20 + 20 + 5 kg on each side');
  await tools.locator('details.workouts-tool > summary', {hasText: 'Your bar and plates'}).click();
  await tools.getByRole('checkbox', {name: 'Loaded on one side'}).check();
  await tools.getByRole('textbox', {name: 'The machine’s or sled’s own weight (kg, optional)'}).fill('40');
  await tools.getByRole('button', {name: 'Save bar and plates'}).click();
  await expect(tools).toContainText('Loaded on one side: the machine’s own 40 kg');
  await expect(tools.getByRole('heading', {name: 'Plates on the one side'})).toBeVisible();
  await expect(tools).toContainText('20 + 20 + 20 + 10 kg on the one side, with the machine’s own 40 kg.');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).plates, WORKOUTS_KEY);
  expect(stored).toMatchObject({oneSide: true, start: 40, bar: 20});

  const findings = await axe(page, tools);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
