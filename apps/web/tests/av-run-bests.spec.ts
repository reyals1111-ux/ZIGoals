import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {WORKOUT_SPLITS_KEY} from '../lib/workouts/splits-schema';

/**
 * Session AV, owner follow-up 1 (F-RUN-BESTS; Strava): Health → Workouts shows "Your running bests" — the fastest 1 and
 * 5 km from a run kept with per-kilometre splits, and the longest run — labelled as from imported files, at 390 and 1440,
 * three themes, axe-clean. Fictional runs; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const workout = (id: string, date: string) => ({id, name: `Fictional park run`, date, type: 'cardio', startedAt: `${date}T07:00:00.000Z`, endedAt: `${date}T07:40:00.000Z`, exercises: []});
for (const theme of THEMES) test(`${theme}: the fastest 1 and 5 km and the longest run`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  const splits = {version: 1, workouts: {r1: {source: 'gpx', paceSecondsPerKm: 310, splits: [1, 2, 3, 4, 5, 6].map(k => ({km: k, meters: 1000, seconds: k === 3 ? 292 : 310}))}}};
  await page.evaluate(([wk, wv, sk, sv]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(wk, wv); localStorage.setItem(sk, sv); }, [WORKOUTS_KEY, JSON.stringify({version: 1, templates: [], exercises: [], workouts: [workout('r1', '2026-11-22')]}), WORKOUT_SPLITS_KEY, JSON.stringify(splits)] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const bests = page.getByRole('region', {name: 'Your running bests'});
  await expect(bests.getByRole('listitem')).toHaveText([/^Fastest 1 km\s*4:52/, /^Fastest 5 km\s*25:32/, /^Longest\s*6 km/]);
  await expect(bests).toContainText('from runs imported from GPX or TCX files');
  await expect(bests).toContainText('on whole-km splits'); // q3 #13: the card says how the bests are found
  const findings = await axe(page, bests);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
});
