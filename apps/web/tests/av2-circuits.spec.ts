import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {CIRCUITS_KEY} from '../lib/workouts/circuits';

/**
 * Session AV lane 2 (health r3; LEDGER #289, Nike Training Club): Health → Workouts → "Timed circuits": the empty state
 * teaches; a circuit of Squat and Push-up, 5 s on, 0 off, 1 round, is saved; Play focuses the player, names the move and
 * the next one, says each change once in a polite status (the countdown is a timer not read every second), pauses and
 * resumes; at the end "Log as a workout" logs it with its minutes and no calories — at 390 and 1440, in Nebula, Light and
 * Dark (and with Motion Off the bar does not glide), axe-clean, no sideways scroll at 320. Fictional data; /api 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: a timed circuit, played and logged`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(k => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem('zigoals:motion:v1', 'off'); localStorage.setItem(k, JSON.stringify({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90})); }, WORKOUTS_KEY);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.locator('details.workouts-circuits-fold > summary').click();
  const box = start.locator('.r3-circuits');
  await expect(box).toContainText('No circuit yet.');
  await expect(box).toContainText('No calories are counted.');
  await box.getByRole('button', {name: '+ New circuit'}).click();
  const form = box.getByRole('form', {name: 'Make a circuit'});
  await form.getByRole('textbox', {name: 'Name'}).fill('Fictional quick circuit');
  await form.getByLabel('A move from the library').selectOption('squat');
  await form.getByRole('button', {name: 'Add the move'}).click();
  await form.getByLabel('A move from the library').selectOption('push-up');
  await form.getByRole('button', {name: 'Add the move'}).click();
  await form.getByRole('textbox', {name: /^Work \(seconds/}).fill('5');
  await form.getByRole('textbox', {name: 'Rest after a move (seconds)'}).fill('0');
  // Session AV lane 2 (fixb3: "Rounds" also matched "Rest between rounds", deliberate): the field named exactly Rounds.
  await form.getByRole('textbox', {name: 'Rounds', exact: true}).fill('1');
  await form.getByRole('textbox', {name: 'Rest between rounds (seconds)'}).fill('0');
  await form.getByRole('button', {name: 'Save the circuit'}).click();
  await expect(box.getByRole('status')).toHaveText('Fictional quick circuit saved: Play starts it.');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), CIRCUITS_KEY);
  expect(stored.circuits[0]).toMatchObject({name: 'Fictional quick circuit', moves: [{exerciseId: 'squat'}, {exerciseId: 'push-up'}], workSeconds: 5, restSeconds: 0, rounds: 1, roundRestSeconds: 0});
  await expect(box).toContainText('2 moves × 1 round · 5 s on, 0 s off · about 1 min');

  await box.getByRole('button', {name: 'Play Fictional quick circuit'}).click();
  const player = start.locator('.r3-player');
  await expect(player.getByRole('heading', {name: 'Fictional quick circuit'})).toBeFocused();
  await expect(player.locator('.r3-player-now')).toHaveText('Squat');
  await expect(player).toContainText('Next: Push-up');
  await expect(player.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  await expect(player.getByRole('status')).toContainText('Squat, 5 seconds, round 1 of 1. Next: Push-up.');
  await expect(player).toHaveAttribute('data-motion', 'off');
  const findings = await axe(page, player);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await player.getByRole('button', {name: 'Pause'}).click();
  await expect(player).toContainText('paused');
  await page.clock.runFor(10_000);
  await expect(player.locator('.r3-player-now')).toHaveText('Squat');
  await player.getByRole('button', {name: 'Resume'}).click();
  await page.clock.runFor(6_000);
  await expect(player.locator('.r3-player-now')).toHaveText('Push-up');
  await expect(player).toContainText('The last move');
  await page.clock.runFor(6_000);
  await expect(player.locator('.r3-player-now')).toContainText('Done.');
  await player.getByRole('button', {name: 'Log as a workout'}).click();
  await expect(player.getByRole('status').last()).toContainText('No calories are counted.');
  const logged = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), WORKOUTS_KEY);
  expect(logged.workouts.at(-1)).toMatchObject({name: 'Fictional quick circuit', exercises: [{exerciseId: 'squat', measure: 'time'}, {exerciseId: 'push-up', measure: 'time'}]});
  expect(JSON.stringify(logged.workouts.at(-1))).not.toMatch(/kcal|calorie/i);
  await player.getByRole('button', {name: 'Close'}).click();
  await expect(box.getByRole('button', {name: 'Play Fictional quick circuit'})).toBeFocused();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
