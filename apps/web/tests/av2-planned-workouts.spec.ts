import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {PLANNED_KEY} from '../lib/workouts/planned';

/**
 * Session AV lane 2, round 4 (health; Runna, LEDGER #330): Health → Workouts → "Your plan": the empty state teaches; a run
 * (5 km, easy) is planned on Monday, which has passed by Thursday, so "I missed some" moves it on to today, with Undo; a
 * planned workout is dragged to another day on the plan's calendar and moved with "Move to"; "Away until …" sets days
 * aside; the Agenda shows the planned workout — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll
 * at 320. Fictional data; /api 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: plan, move and realign workouts`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-19T10:00:00+01:00')}); // a Thursday
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(k => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, JSON.stringify({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90})); }, WORKOUTS_KEY);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.locator('details.workouts-plan-fold > summary').click();
  const plan = start.locator('.r4-plan');
  await expect(plan).toContainText('Nothing planned yet.');

  const form = plan.getByRole('form', {name: 'Plan a workout'});
  await form.getByLabel('What').selectOption('run');
  await form.getByRole('textbox', {name: 'Distance (km)'}).fill('5');
  await form.getByLabel('Effort').selectOption('easy');
  await form.getByLabel('Day').fill('2026-11-16');
  await form.getByLabel('Time (optional)').fill('18:00');
  await form.getByRole('button', {name: 'Plan it'}).click();
  await expect(plan.getByRole('status')).toHaveText('Easy 5 km run planned on Mon, Nov 16 at 18:00.');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), PLANNED_KEY);
  expect(stored.items[0]).toMatchObject({kind: 'run', name: 'Easy 5 km run', date: '2026-11-16', time: '18:00', distanceKm: 5, effort: 'easy'});

  // Monday has passed without a workout: "I missed some" moves it on to today.
  await expect(plan).toContainText('Easy 5 km run on Mon, Nov 16 was not done.');
  await plan.getByRole('button', {name: 'I missed some: move them on'}).click();
  await expect(plan.getByRole('status')).toHaveText('1 planned workout moved on, in order.');
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), PLANNED_KEY)).items[0].date).toBe('2026-11-19');

  // Move it with the keyboard: open it, Move to Saturday.
  const chip = plan.getByRole('button', {name: /^Easy 5 km run · 18:00, planned\. Open to move or remove it$/});
  await chip.click();
  await plan.getByLabel('Move to').fill('2026-11-21');
  await plan.getByRole('button', {name: 'Move', exact: true}).click();
  await expect(plan.getByRole('status')).toHaveText('Easy 5 km run moved to Sat, Nov 21.');
  // Drag it back to Friday on the calendar.
  const friday = plan.getByRole('listitem', {name: /^Fri, Nov 20: nothing planned$/});
  await chip.dragTo(friday);
  await expect(plan.getByRole('status')).toHaveText('Easy 5 km run moved to Fri, Nov 20.');

  // Away until Sunday: Friday is set aside.
  await plan.getByLabel('Away until').fill('2026-11-22');
  await plan.getByRole('button', {name: 'Set them aside'}).click();
  await expect(plan).toContainText('planned workouts in that time are set aside');
  await expect(chip).toHaveAccessibleName(/set aside while you are away/);
  await plan.getByRole('button', {name: 'I’m back'}).click();
  await expect(chip).toHaveAccessibleName(/, planned\./);

  const findings = await axe(page, plan);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  // The Agenda draws it on its day.
  await page.goto('/app/agenda'); await settle(page);
  await expect(page.getByText('Easy 5 km run').first()).toBeVisible();
});
