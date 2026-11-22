import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';

/**
 * Session AV lane 2 (body; LEDGER #203, #204, #208; Nike Run Club): a running tip in English, then in Dutch; a beaten run
 * best marked once ("Noted" clears it for good); shoes added with the distance they had, picked on a run, and their
 * distance with the note near the limit — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const run = (id: string, date: string, km: number) => ({id, name: `Fictional run ${id}`, date, type: 'cardio', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T08:40:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds: 2400, done: true}]}]});
const record = {version: 1, templates: [], exercises: [], restSeconds: 90, seenBests: ['a:0'], workouts: [run('a', '2026-11-01', 8), run('b', '2026-11-10', 10)]};
for (const theme of THEMES) test(`${theme}: a tip, a best marked once, shoes`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [WORKOUTS_KEY, JSON.stringify(record)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const tip = page.getByRole('region', {name: 'A running tip'});
  await expect(tip.locator('p')).not.toBeEmpty();
  await tip.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(page.getByRole('region', {name: 'Een looptip'}).locator('p[lang="nl"]')).toBeVisible();
  const bests = page.getByRole('region', {name: 'Your running bests'});
  await expect(bests.locator('.av2-best-mark')).toContainText('A new running best: longest run, 10 km (Fictional run b, Nov 10). Well run.');
  await bests.getByRole('button', {name: 'Noted'}).click();
  await expect(bests.locator('.av2-best-mark')).toHaveCount(0);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).seenBests, WORKOUTS_KEY)).toEqual(['a:0', 'b:0']);
  const shoes = page.getByRole('region', {name: 'Shoes', exact: true});
  await shoes.locator('details.workouts-shoes-fold > summary').click();
  await expect(shoes).toContainText('No shoes yet.');
  await shoes.getByRole('textbox', {name: 'Name'}).fill('Fictional trainers');
  await shoes.getByRole('textbox', {name: 'Distance already run (km)'}).fill('620');
  await shoes.getByRole('button', {name: 'Add the shoes'}).click();
  const history = page.getByRole('region', {name: 'Your workouts'});
  await history.locator('details').filter({hasText: 'Fictional run b'}).locator('summary').click();
  await history.getByRole('combobox', {name: 'Shoes for Fictional run b'}).selectOption({label: 'Fictional trainers'});
  await expect(page.getByRole('status').filter({hasText: 'Fictional trainers picked for Fictional run b.'})).toBeVisible();
  await expect(shoes.getByRole('progressbar', {name: 'Fictional trainers'})).toHaveAttribute('aria-valuetext', '630 km of 700 km');
  await expect(shoes.locator('.av2-shoe-note')).toHaveText('Near its limit: 70 km to go.');
  const findings = await axe(page, shoes);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
