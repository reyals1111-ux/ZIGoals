import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {WORKOUT_HR_KEY} from '../lib/workouts/hr-zones';
import {RACES_KEY} from '../lib/workouts/races';
import {COUNTDOWNS_KEY} from '../lib/countdowns/schema';

/**
 * Session AV lane 2, round 4 (health; Runna, LEDGER #336, #337): a run's heart-rate zones appear once the person types
 * their maximum (never from age; the split and its source named; an estimate), as a bar and minutes per zone; "Races
 * ahead" keeps a race (with a countdown on request), the weeks to it and, for a past race, the matching run beside the goal
 * — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; /api 503.
 */
test.use({timezoneId: 'UTC'});
const day = '2026-11-14', at = (s: number) => new Date(Date.parse(`${day}T09:00:00.000Z`) + s * 1000).toISOString();
const workouts = {version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [{id: 'run-fictional-1', name: 'Fictional parkrun', date: day, type: 'cardio', startedAt: at(0), endedAt: at(1500), exercises: [{id: 'e1', exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: 's1', kind: 'normal', distanceKm: 5, seconds: 1500, done: true}]}]}]};
const hr = {version: 1, runs: {'run-fictional-1': {from: 120, seconds: [600, ...Array(19).fill(0), 900]}}};

for (const theme of THEMES) test(`${theme}: heart-rate zones and races ahead`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-20T10:00:00Z')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(list => { for (const [k, v] of list) localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [[WORKOUTS_KEY, JSON.stringify(workouts)], [WORKOUT_HR_KEY, JSON.stringify(hr)]] as [string, string][]);
  await page.goto('/app/health?view=workouts'); await settle(page);

  const history = page.getByRole('region', {name: 'Your workouts'});
  await history.locator('summary', {hasText: 'Fictional parkrun'}).click();
  const zones = history.getByRole('region', {name: 'Heart-rate zones for Fictional parkrun'});
  await expect(zones).toContainText('never guessed from age');
  await zones.getByRole('textbox', {name: /^Maximum heart rate/}).fill('190');
  await zones.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(zones.getByRole('status')).toHaveText('Your maximum: 190 beats a minute. Every run’s zones use it.');
  await expect(zones).toContainText('Zone 2 (114–132 bpm): 10 min');
  await expect(zones).toContainText('Zone 3 (133–151 bpm): 15 min');
  await expect(zones).toContainText('Sally Edwards');
  await expect(zones).toContainText('an estimate, not medical advice');
  await expect(zones.getByRole('img', {name: /^Minutes in each zone: zone 1 0 min, zone 2 10 min, zone 3 15 min/})).toBeVisible();
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), WORKOUT_HR_KEY)).maxHr).toBe(190);

  const racesBox = page.getByRole('region', {name: 'Races ahead'});
  await racesBox.locator('details.workouts-races-fold > summary').click();
  await expect(racesBox).toContainText('No race yet.');
  // A past race: the run that day is its result beside the goal.
  await racesBox.getByRole('button', {name: '+ Add a race'}).click();
  let form = racesBox.getByRole('form', {name: 'Add a race'});
  await form.getByRole('textbox', {name: 'Name'}).fill('Fictional parkrun');
  await form.getByLabel('Race day').fill(day);
  await form.getByLabel('Distance', {exact: true}).selectOption('5');
  await form.getByRole('textbox', {name: /^Goal time/}).fill('26:00');
  await form.getByLabel('Which race').selectOption('b');
  await form.getByRole('button', {name: 'Save the race'}).click();
  await expect(racesBox).toContainText('Result: 25:00 for 5 km, 1:00 under your goal.');
  // A race ahead, with a countdown.
  await racesBox.getByRole('button', {name: '+ Add a race'}).click();
  form = racesBox.getByRole('form', {name: 'Add a race'});
  await form.getByRole('textbox', {name: 'Name'}).fill('Fictional half');
  await form.getByLabel('Race day').fill('2026-12-13');
  await form.getByLabel('Distance', {exact: true}).selectOption('21.0975');
  await form.getByRole('textbox', {name: /^Goal time/}).fill('1:55:00');
  await form.getByRole('checkbox', {name: 'Also make a countdown for it'}).check();
  await form.getByRole('button', {name: 'Save the race'}).click();
  await expect(racesBox.getByRole('status')).toContainText('A countdown is on Today’s cards too.');
  await expect(racesBox).toContainText('Main race · Half marathon');
  await expect(racesBox).toContainText('In 3 weeks · 4 weeks after the race before.');
  const stored = await page.evaluate(([r, c]) => [JSON.parse(localStorage.getItem(r)!), JSON.parse(localStorage.getItem(c)!)], [RACES_KEY, COUNTDOWNS_KEY] as const);
  expect(stored[0].races.map((x: {name: string}) => x.name)).toEqual(['Fictional parkrun', 'Fictional half']);
  expect(stored[1].items[0]).toMatchObject({title: 'Fictional half', date: '2026-12-13'});

  for (const box of [zones, racesBox]) {
    const findings = await axe(page, box);
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  }
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
