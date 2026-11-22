import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #116, #119; Hevy's exercise library and pinned notes): Health → Workouts → "Exercises
 * and how-tos" finds the squat, shows the muscles it works, three written steps and a tip, in Dutch on a tap, with the
 * person's heaviest set; a pinned note is kept on the device and shown while training — at 390 and 1440, in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const set = (id: string, kg: number, reps: number) => ({id, kind: 'normal', weightKg: kg, reps, done: true});
const record = {version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [{id: 'w1', name: 'Fictional legs', date: '2026-11-20', type: 'strength', startedAt: '2026-11-20T08:00:00.000Z', endedAt: '2026-11-20T09:00:00.000Z',
  exercises: [{id: 'e1', exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [set('s1', 80, 5), set('s2', 85, 3)]}]}]};
for (const theme of THEMES) test(`${theme}: the squat's how-to, in Dutch, and a pinned note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const panel = page.getByRole('region', {name: 'Exercises and how-tos'});
  await panel.locator('details.workouts-library-fold > summary').click();
  await panel.getByRole('searchbox', {name: 'Find an exercise'}).fill('squat');
  await panel.getByRole('button', {name: /^Squat Legs\b/}).click();
  const card = panel.getByRole('article', {name: 'Squat'});
  await expect(card).toContainText('Works most');
  await expect(card).toContainText('Quads (front thigh) · Glutes');
  await expect(card.locator('.av2-steps li')).toHaveCount(3);
  await expect(card).toContainText('Heaviest 85 kg');
  await card.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(card).toContainText('Werkt vooral op');
  await expect(card.locator('[lang="nl"]').first()).toBeVisible();
  await card.getByRole('button', {name: 'In English'}).click();
  await card.getByRole('textbox', {name: /^Pinned note for Squat/}).fill('Fictional · bars at hole 6');
  await card.getByRole('button', {name: 'Pin this note'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Note pinned to Squat'})).toBeVisible();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).pinnedNotes, WORKOUTS_KEY)).toEqual({squat: 'Fictional · bars at hole 6'});
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await panel.evaluate(el => [...el.querySelectorAll<HTMLElement>('p, li, dt, dd, span')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  // While training: the pinned note shows on the exercise, and its how-to opens in place.
  await page.getByRole('button', {name: 'Repeat Fictional legs'}).click();
  const block = page.getByRole('article', {name: 'Squat'}).filter({has: page.locator('.workouts-sets')});
  await expect(block.locator('.workouts-pinned-note')).toContainText('Fictional · bars at hole 6');
  await block.locator('details.av2-howto > summary').click();
  await expect(block.locator('.av2-steps li').first()).toContainText('Bar on your upper back');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
