import {readFile} from 'node:fs/promises';
import {expect, test, type Page} from '@playwright/test';
import {hydrated, offlineApis, seedRecords, stored} from './journeys/journey-helpers';
import {loadShowcase, showcaseRecord} from './wiring-helpers';
import {ROUTINE_SHARE_KIND} from '../lib/routines/share';

/**
 * Session AK Q1 (WIRING_AUDIT 5.1–5.4, #21): habits that worked in the build but had no browser test on the UI path: a
 * schedule typed in words (due on its days only, "none due" on the others), a skip with the person's own reason, the
 * Strength line, and a routine played in full screen, then shared as a file and added back. Fictional data; every /api
 * route answers 503; the clock is fixed on a Wednesday.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-04', NOW = new Date(`${TODAY}T09:00:00.000Z`); // a Wednesday
test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'these wiring specs run once, on the desktop project'); });
type Habits = {habits: {id: string; title: string; timeOfDay: string; rules: {schedule: Record<string, unknown>}[]; checkins?: Record<string, {status?: string; note?: string}> | {date: string; status?: string; note?: string}[]}[]};
async function fresh(page: Page) {
  await page.clock.install({time: NOW});
  await offlineApis(page);
  await seedRecords(page, {});
  await page.goto('/app/habits'); await hydrated(page);
}
async function newHabit(page: Page, title: string) {
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
}

test('#21 and 5.1: "every other tue 7am" typed in words is due on its Tuesdays only; a daily habit is due today', async ({page}) => {
  await fresh(page);
  await newHabit(page, 'Fictional swim');
  await page.getByText('Type the schedule in words').click();
  await page.getByRole('textbox', {name: /^Type when/}).fill('every other tue 7am');
  await expect(page.getByRole('list', {name: 'Understood'})).toBeVisible();
  await page.getByRole('button', {name: 'Use this schedule'}).click();
  await expect(page.getByText(/^Schedule set: .*Check it below before you save\.$/)).toBeVisible();
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional swim', exact: true})).toBeVisible();
  const swim = (await stored<Habits>(page, 'zigoals:habits:v1'))!.habits.find(h => h.title === 'Fictional swim')!;
  expect(swim.rules[0]!.schedule).toEqual({kind: 'interval', every: 14, anchor: '2026-11-10'}); // the next Tuesday
  expect(swim.timeOfDay).toBe('morning');

  await newHabit(page, 'Fictional stretch');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional stretch', exact: true})).toBeVisible();
  // Today is a Wednesday: the swim is listed but not due (the morning has "none due"); the stretch is due.
  const morning = page.locator('details.habit-section-morning > summary');
  await expect(morning).toContainText('none due');
  await expect(page.locator('details.habit-section-anytime > summary')).toContainText('0 / 1');
});

test('5.2: skip a habit today with my own reason; it is a skip, not a miss, and it stays after a reload', async ({page}) => {
  await fresh(page);
  await newHabit(page, 'Fictional stretch');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Fictional stretch', exact: true});
  await card.locator('summary[aria-label="Details for Fictional stretch"]').click();
  await card.getByRole('button', {name: 'Skip today…'}).click();
  const form = card.getByRole('form', {name: 'Skip Fictional stretch today'});
  await form.getByRole('group', {name: 'Reason'}).getByRole('button', {name: 'Other'}).click();
  await form.getByLabel('Your reason').fill('Fictional dentist visit');
  await form.getByRole('button', {name: 'Skip today'}).click();
  await expect(card.getByRole('status')).toHaveText('Skipped today · Fictional dentist visit. Your streak keeps its place.');
  expect(JSON.stringify((await stored<Habits>(page, 'zigoals:habits:v1'))!.habits[0])).toContain('Skipped · Fictional dentist visit');
  await page.reload(); await hydrated(page);
  const again = page.getByRole('article', {name: 'Fictional stretch', exact: true});
  await again.locator('summary[aria-label="Details for Fictional stretch"]').click();
  await expect(again.getByRole('button', {name: 'Remove one from Fictional stretch'})).toBeAttached();
  await expect(again.getByRole('button', {name: 'Skip today…'})).toHaveCount(0); // already skipped today
});

test('5.4: a routine from a template plays in full screen (done, skip, close keeps its place); its structure is shared and added back', async ({page}) => {
  await fresh(page);
  const routines = page.getByRole('region', {name: 'Routines'});
  const morning = routines.getByRole('group', {name: 'Routine templates'}).getByRole('listitem').filter({hasText: 'Morning routine'});
  await morning.getByRole('button', {name: 'Add routine'}).click();
  await morning.getByRole('button', {name: 'Add 4 habits'}).click();
  await expect(routines.getByRole('status')).toHaveText('Morning routine ready: 4 new habits.');
  await routines.getByRole('button', {name: 'Start'}).click();
  const player = page.locator('section.routine-player');
  await expect(player).toContainText('Morning routine · step 1 of 4');
  await player.getByRole('button', {name: 'Full screen'}).click();
  const full = page.getByRole('dialog', {name: 'Glass of water'});
  await expect(full).toBeVisible();
  await full.getByRole('button', {name: 'Done', exact: true}).click();
  const stretch = page.getByRole('dialog', {name: 'Stretch'});
  await expect(stretch.getByRole('timer')).toHaveAccessibleName('0:00 of 5 minutes');
  await stretch.getByRole('button', {name: 'Skip', exact: true}).click();
  const meditate = page.getByRole('dialog', {name: 'Meditate'});
  await expect(meditate.getByRole('list', {name: 'Steps'}).getByRole('listitem')).toHaveCount(4);
  await expect(meditate.getByRole('listitem', {name: 'Glass of water: done'})).toBeAttached();
  await expect(meditate.getByRole('listitem', {name: 'Stretch: skipped'})).toBeAttached();
  await meditate.getByRole('button', {name: 'Close the full-screen player; the routine keeps its place'}).click();
  await expect(page.getByRole('dialog', {name: 'Meditate'})).toHaveCount(0);
  await expect(player).toContainText('Morning routine · step 3 of 4');
  const water = (await stored<Habits>(page, 'zigoals:habits:v1'))!.habits.find(h => h.title === 'Glass of water')!;
  expect(JSON.stringify(water.checkins ?? water)).toContain(TODAY);
  await player.getByRole('button', {name: 'Pause the routine and close'}).click();

  // Share the routine's structure (with names, by choice) as a file.
  await routines.getByRole('button', {name: 'Share or add'}).click();
  const share = routines.getByRole('region', {name: 'Share or add a routine'});
  await share.getByLabel('Include step names').check();
  const saving = page.waitForEvent('download');
  await share.getByRole('button', {name: 'Save routine file'}).click();
  const file = await saving;
  expect(file.suggestedFilename()).toBe('morning-routine.zigoals-routine.json');
  const shared = JSON.parse(await readFile((await file.path())!, 'utf8')) as {title?: string; steps: {title?: string; minutes?: number}[]};
  expect(shared.title).toBe('Morning routine');
  expect(shared.steps.map(s => [s.title, s.minutes ?? null])).toEqual([['Glass of water', null], ['Stretch', 5], ['Meditate', 10], ['Plan the day', null]]);
  expect(JSON.stringify(shared)).not.toContain(TODAY); // no history, notes or dates

  // Someone's shared routine, without names: two steps come in as two new daily habits.
  const incoming = {kind: ROUTINE_SHARE_KIND, version: 1, steps: [{minutes: 3}, {}]};
  await share.getByLabel('Routine file').setInputFiles({name: 'friend.zigoals-routine.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming))});
  await share.getByRole('button', {name: 'Add 2 habits'}).click();
  await expect.poll(async () => (await stored<Habits>(page, 'zigoals:habits:v1'))!.habits.length).toBe(6);
});

test('5.3: the Showcase\'s habit shows its Strength from the last 90 days, and a planned skip keeps its reason', async ({page}) => {
  await offlineApis(page);
  await loadShowcase(page);
  await page.goto('/app/habits'); await hydrated(page);
  const read = page.getByRole('article', {name: 'Read', exact: true});
  await read.locator('summary[aria-label="Details for Read"]').click();
  await read.locator('summary[aria-label="Consistency & trends for Read"]').click();
  await expect(read.locator('.habit-strength')).toContainText(/^Strength \d{1,3} of 100, from \d+ scheduled days in the last 90\./);
  await read.locator('summary[aria-label^="History & reflection for Read"]').click();
  await read.getByRole('button', {name: 'Plan a skip'}).click();
  const plan = read.getByRole('form', {name: 'Plan a skip for Read'});
  const tomorrow = await page.evaluate(() => { const d = new Date(Date.now() + 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await plan.getByLabel('Day to skip').fill(tomorrow);
  await plan.getByLabel('Reason (optional)').fill('Fictional trip');
  await plan.getByRole('button', {name: 'Save skip'}).click();
  await expect(read.getByRole('list', {name: 'Planned skips for Read'})).toContainText('Fictional trip');
  expect(JSON.stringify(await showcaseRecord(page, 'zigoals:habits:v1'))).toContain('Fictional trip');
});
