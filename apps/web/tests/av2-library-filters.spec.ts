import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {WORKOUT_PLACES_KEY} from '../lib/workouts/places-schema';
import {GUIDES} from '../lib/workouts/routine-library';
import {filterGuides, NO_FILTER} from '../lib/workouts/library-filter';

/**
 * Session AV lane 2 (health r3; LEDGER #288, Nike Training Club): Health → Workouts → Ready-made routines → "Find a
 * routine": Up to 30 min, then Legs, then the place Travel (no equipment) narrow the list to what fits, the count is said,
 * "Clear the filters" shows all again; in Dutch the labels follow — at 390 and 1440, in Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: find a routine by length, muscle and place`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([wk, pk]) => {
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem(wk, JSON.stringify({version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90}));
    localStorage.setItem(pk, JSON.stringify({version: 1, places: [{id: 'place-travel', name: 'Travel', equipment: [], createdAt: '2026-11-01T08:00:00.000Z'}]}));
  }, [WORKOUTS_KEY, WORKOUT_PLACES_KEY] as const);
  await page.goto('/app/health?view=workouts'); await settle(page);
  const start = page.getByRole('region', {name: 'Start a workout'});
  await start.locator('details.workouts-guides-fold > summary').click();
  const filters = start.getByRole('group', {name: 'Find a routine'});
  const count = filters.getByRole('status');
  await expect(count).toHaveText(`${GUIDES.length} of ${GUIDES.length} routines`);

  await filters.getByRole('radio', {name: 'Up to 30 min'}).check();
  const short = filterGuides(GUIDES, {...NO_FILTER, maxMinutes: 30});
  await expect(count).toHaveText(`${short.length} of ${GUIDES.length} routines`);
  await expect(start.locator('.av2-guide-list > li')).toHaveCount(short.length);
  await filters.getByRole('radio', {name: 'Any length'}).check();
  await filters.getByLabel('Main muscle group').selectOption('Legs');
  const legs = filterGuides(GUIDES, {...NO_FILTER, muscle: 'Legs'});
  await expect(start.locator('.av2-guide-list > li')).toHaveCount(legs.length);
  await filters.getByLabel('Main muscle group').selectOption('');
  await filters.getByLabel('Place').selectOption({label: 'Travel'});
  const travel = filterGuides(GUIDES, {...NO_FILTER, equipment: []});
  await expect(count).toHaveText(`${travel.length} of ${GUIDES.length} routines`);
  await expect(start.getByRole('article', {name: 'Full body A'})).toHaveCount(0);
  const findings = await axe(page, filters);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await filters.getByRole('button', {name: 'Clear the filters'}).click();
  await expect(count).toHaveText(`${GUIDES.length} of ${GUIDES.length} routines`);

  // Session AV lane 2 (fixb3: the running tip has its own "In het Nederlands" in this region, deliberate): the routines' own.
  await start.locator('.av2-routines').getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(start.getByRole('group', {name: 'Zoek een routine'})).toContainText('Belangrijkste spiergroep');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
