import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #112, #115, #119; Strava's coach-designed workouts, Hevy's routine library, folders and
 * routine notes): on a fresh device, Health → Workouts → "Ready-made routines" reads in Dutch on a tap; "Save to my
 * routines" puts Full body A in a "Gym" folder; Edit gives it a note; starting it shows the note and each exercise's plan
 * and cue — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: save a ready-made routine, note it, start it`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(k => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, JSON.stringify({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90})); }, WORKOUTS_KEY);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.locator('details.workouts-guides-fold > summary').click();
  const fullBody = start.getByRole('article', {name: 'Full body A'});
  await expect(fullBody).toContainText('3 × 8 · rest 2:00');
  await start.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(start.getByRole('article', {name: 'Heel lichaam A'})).toContainText('rust 2:00');
  await start.getByRole('button', {name: 'In English'}).click();
  const findings = await axe(page, start);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await fullBody.getByRole('button', {name: 'Save to my routines: Full body A'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Full body A is in your routines, in Gym.'})).toBeVisible();
  await expect(fullBody.getByRole('button', {name: 'Full body A: in your routines'})).toBeDisabled();
  await expect(start.locator('h4.av2-folder')).toContainText('Gym (1)');
  await start.getByRole('button', {name: 'Edit routine Full body A'}).click();
  await start.getByRole('textbox', {name: 'Routine note (shown when you start it)'}).fill('Fictional · light week');
  await start.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(start.locator('.workouts-routines')).toContainText('Note: Fictional · light week');
  await expect(start.locator('.workouts-routines')).toContainText('Progression: 8–12 reps, then +2.5 kg');
  await start.getByRole('button', {name: 'Start Full body A', exact: true}).click();
  const now = page.locator('#workout-now');
  await expect(now.locator('.workouts-routine-note')).toContainText('Fictional · light week');
  await expect(now.locator('.workouts-guide-cue').first()).toContainText('Plan: 3 × 8 · rest 2:00');
  const nowFindings = await axe(page, now);
  expect(nowFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(nowFindings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
