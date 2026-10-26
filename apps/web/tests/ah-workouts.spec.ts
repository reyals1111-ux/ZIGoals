import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {HEALTH_STORAGE_KEY} from '../lib/health';

// Session AH Part 6 (DE8; N-083, N-084, N-085): log a workout like the best workout apps do — sets of weight × reps with
// last time beside each, a rest timer, personal bests, routines — and its minutes land in Health. Fictional data.
test.beforeEach(async ({page}) => { await offlineApi(page); });
const stored = <T,>(page: import('@playwright/test').Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T>;

test('log a workout: add an exercise, log and tick a set, rest, finish; the minutes reach Health; repeat shows last time', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/health'); await hydrated(page);
  const enter = page.getByRole('link', {name: 'Log your first workout'});
  // On a phone the card sits in its fold. The card says "Opening your workout log…" until the log has loaded, so wait
  // for the link or the fold before choosing.
  const fold = page.getByRole('button', {name: 'Workouts', exact: true});
  await expect(enter.or(fold).first()).toBeVisible();
  if (!await enter.isVisible()) await fold.click();
  await enter.click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Train with a plan.');
  await page.getByRole('button', {name: 'Start an empty workout'}).click();
  const now = page.getByRole('region', {name: 'Workout in progress'});
  await now.getByLabel('Find an exercise').fill('bench');
  await now.getByRole('button', {name: /^Bench press/}).click();
  await now.getByLabel('Bench press, set 1: weight in kg').fill('60');
  await now.getByLabel('Bench press, set 1: reps').fill('8');
  await now.getByRole('button', {name: 'Mark Bench press, set 1 done'}).click();
  await expect(now.getByRole('timer')).toContainText('Rest 1:');
  await now.getByRole('button', {name: 'Skip rest'}).click();
  await now.getByRole('button', {name: '+ Add set'}).click();
  await now.getByRole('button', {name: 'Finish workout'}).click();
  // The new set copies the one before (as Strong and Hevy do) but was never ticked: finishing asks, then leaves it out.
  await page.getByRole('alertdialog', {name: 'Finish with unticked sets?'}).getByRole('button', {name: 'Finish workout'}).click();
  await expect(page.getByRole('region', {name: 'Workout, done'})).toBeVisible();
  await expect(page.locator('.aa-toast')).toContainText('Workout saved');
  const w = await stored<{workouts: {endedAt?: string; activityId?: string; exercises: {sets: {weightKg: number; reps: number}[]}[]}[]}>(page, WORKOUTS_KEY);
  expect(w.workouts).toHaveLength(1); expect(w.workouts[0]!.endedAt).toBeTruthy(); expect(w.workouts[0]!.exercises[0]!.sets).toEqual([expect.objectContaining({weightKg: 60, reps: 8})]);
  const health = await stored<{activity: {id: string; name: string; minutes: number}[]}>(page, HEALTH_STORAGE_KEY);
  expect(health.activity.find(a => a.id === w.workouts[0]!.activityId)).toMatchObject({name: 'Workout'});
  await page.reload(); await hydrated(page);
  await page.getByRole('button', {name: 'Repeat Workout'}).click();
  await expect(page.getByRole('button', {name: 'Bench press, set 1: use last time, 60 kg × 8'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Discard asks first and adds nothing to Health.
  await page.getByRole('button', {name: 'Discard'}).click();
  await page.getByRole('alertdialog', {name: 'Discard this workout?'}).getByRole('button', {name: 'Discard workout'}).click();
  await expect(page.getByRole('button', {name: 'Start an empty workout'})).toBeVisible();
  expect((await stored<{activity: unknown[]}>(page, HEALTH_STORAGE_KEY)).activity).toHaveLength(1);
});

test('the Showcase has a training log: history with personal bests per exercise, and routines to start', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  await expect(page.getByRole('region', {name: 'Your workouts'}).getByRole('listitem').first()).toContainText('Push day');
  const progress = page.getByRole('region', {name: 'Exercise history'});
  await expect(progress.getByText('Estimated one-rep max')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Start Leg day'})).toBeVisible();
});
