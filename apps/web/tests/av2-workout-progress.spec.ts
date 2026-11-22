import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #117, Hevy's progress analytics): Health → Workouts → "Progress" shows November so far
 * beside October (3 workouts, +2), October by the arrow, and sets per muscle group over 8 weeks as a table; Exercise
 * history's line switches to the heaviest set and the volume — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const set = (id: string, kg: number, reps: number, kind = 'normal') => ({id, kind, weightKg: kg, reps, done: true});
const bench = (id: string, date: string, kg: number, reps: number) => ({id, name: 'Fictional push', date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T08:50:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [set(`${id}-w`, 40, 10, 'warmup'), set(`${id}-a`, kg, reps), set(`${id}-b`, kg, reps)]}]});
const record = {version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [bench('a', '2026-10-05', 60, 8), bench('b', '2026-11-02', 62.5, 8), bench('c', '2026-11-09', 62.5, 9), bench('d', '2026-11-16', 65, 6)]};
for (const theme of THEMES) test(`${theme}: a month beside the last, sets per muscle, the heaviest-set line`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const panel = page.getByRole('region', {name: 'Progress', exact: true});
  await panel.locator('details.workouts-report-fold > summary').click();
  await expect(panel.locator('#av2-month-title')).toHaveText('Nov 2026 so far');
  const stats = panel.locator('.av2-month-stats');
  await expect(stats.locator('div').filter({hasText: 'Workouts'})).toContainText('3');
  await expect(stats.locator('div').filter({hasText: 'Workouts'})).toContainText('+2 on the month before');
  await expect(stats.locator('div').filter({hasText: 'New personal bests'})).toContainText('4');
  await expect(panel.getByRole('button', {name: 'Next month'})).toBeDisabled();
  const table = panel.getByRole('region', {name: 'Table: working sets per muscle group per week'});
  await expect(table.getByRole('row', {name: /^Chest/})).toContainText('8');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'Previous month'}).click();
  await expect(panel.locator('#av2-month-title')).toHaveText('Oct 2026');
  await expect(stats.locator('div').filter({hasText: 'Workouts'})).toContainText('1');
  const history = page.getByRole('region', {name: 'Exercise history'});
  await history.getByRole('group', {name: 'Line shows'}).getByRole('button', {name: 'Heaviest set'}).click();
  await expect(history.locator('figcaption')).toContainText('Progress, session by session (heaviest set): 60 kg on');
  await expect(history.locator('figcaption')).toContainText('→ 65 kg on');
  await history.getByRole('button', {name: 'Volume'}).click();
  await expect(history.locator('figcaption')).toContainText('(volume)');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
