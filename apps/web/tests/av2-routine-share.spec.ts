import {readFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #206, Strong's routine sharing): a routine saved as a small file (no weights unless
 * ticked, no notes), then that file read back with a preview and added as "Fictional legs (shared)" in "Shared with me" —
 * at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; no server.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const record = {version: 1, workouts: [], exercises: [], restSeconds: 90, templates: [{id: 'routine-a', name: 'Fictional legs', type: 'strength', createdAt: '2026-11-01T08:00:00.000Z', note: 'Private knee note',
  exercises: [{exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{kind: 'normal', weightKg: 100, reps: 6}, {kind: 'normal', weightKg: 100, reps: 6}]}]}]};
for (const theme of THEMES) test(`${theme}: share a routine as a file, then add it back`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.getByRole('button', {name: 'Edit routine Fictional legs'}).click();
  const [download] = await Promise.all([page.waitForEvent('download'), start.getByRole('button', {name: 'Save routine file'}).click()]);
  expect(download.suggestedFilename()).toBe('fictional-legs.zigoals-workout.json');
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('"builtIn": "squat"');
  expect(text).not.toContain('Private');
  expect(text).not.toContain('100');
  await start.getByRole('button', {name: 'Cancel'}).click();
  await start.locator('details.workouts-guides-fold > summary').click();
  const importer = start.getByRole('region', {name: 'Add a routine someone shared'});
  await importer.getByLabel('Workout routine file (.json)').setInputFiles({name: 'fictional-legs.zigoals-workout.json', mimeType: 'application/json', buffer: Buffer.from(text)});
  await expect(importer.getByRole('heading', {name: 'Fictional legs'})).toBeVisible();
  const findings = await axe(page, importer);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await importer.getByRole('button', {name: 'Add to my routines'}).click();
  await expect(importer.getByRole('status')).toHaveText('Fictional legs is in your routines, in “Shared with me”.');
  await expect(start.locator('h4.av2-folder').filter({hasText: 'Shared with me'})).toBeVisible();
  await expect(start.locator('.workouts-routines')).toContainText('Fictional legs (shared)');
  await importer.getByLabel('Workout routine file (.json)').setInputFiles({name: 'not.json', mimeType: 'application/json', buffer: Buffer.from('{"kind":"other"}')});
  await expect(importer.getByRole('alert')).toHaveText('This is not a workout routine file.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
