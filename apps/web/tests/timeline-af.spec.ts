import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY} from '../lib/habits';
import {DAY_TIMELINE_KEY} from '../lib/af-extras-keys';
import {FASTING_KEY} from '../lib/fasting/schema';
import {ID, TITLE, browserToday, seedChecklist, settled, stored} from './checklist-fixtures';

/**
 * Session AF (L5b; P9.2, ADR-028 D2 (a), H76): the Day Timeline at /app/timeline — habits at their parts of the day, the
 * Checklist's dots through the source the Checklist registers (a habit dot marks its habit, no twin), the now line, tap
 * to complete with Undo through the Habits page's own Done, a move by drag, by keyboard and by the time picker (each one
 * writing only `zigoals:day-timeline:v1`, never the synced habit record), a running fast that never moves, the day's-end
 * Replan, a quiet day, viewing that writes nothing, and no motion under reduced motion. Fictional records; the clock is
 * fixed at 10:30 (20:30 for the Replan) in UTC.
 */
test.use({timezoneId: 'UTC'});
async function at(page: Page, clock: string) { const day = new Date().toISOString().slice(0, 10); await page.clock.install({time: new Date(`${day}T${clock}:00.000Z`)}); }
const row = (page: Page, id: string) => page.locator(`[data-block="${id}"]`);
const habitRow = (page: Page, key: keyof typeof ID) => row(page, `habit:${ID[key]}`);
const storage = (page: Page) => page.evaluate(() => JSON.stringify([Object.entries(localStorage).sort(), Object.entries(sessionStorage).filter(([k]) => !k.startsWith('zigoals-checklist-mark')).sort()]));
async function open(page: Page) {
  await page.goto('/app/timeline');
  await expect(page).toHaveTitle('Timeline · ZIGoals Alpha');
  await expect(page.getByRole('heading', {level: 1, name: 'Your day on one line'})).toBeVisible();
  await expect(page.locator('.timeline-page')).toHaveAttribute('data-timeline', 'ready');
}

test('today on one line: parts of the day, the Checklist’s dots, the now line; viewing writes nothing', async ({page}) => {
  await at(page, '10:30');
  await seedChecklist(page);
  await open(page);
  const morning = page.getByRole('region', {name: /^Morning/}), afternoon = page.getByRole('region', {name: /^Afternoon/}), evening = page.getByRole('region', {name: /^Evening/});
  await expect(morning.locator(`[data-block="habit:${ID.stretch}"] .timeline-time`)).toHaveText('8:00 AM');
  await expect(habitRow(page, 'stretch')).toContainText('on your Checklist');
  await expect(morning.locator('[data-kind=checklist]')).toContainText('Water');
  await expect(afternoon.locator(`[data-block="habit:${ID.push}"] .timeline-time`)).toHaveText('2:00 PM');
  await expect(evening.locator(`[data-block="habit:${ID.piano}"]`)).toContainText('15 min');
  await expect(evening.locator('[data-kind=checklist]')).toContainText(TITLE.custom);
  // One block per habit: the Checklist's habit dots mark the habit rather than adding a twin.
  await expect(page.locator('[data-kind=checklist]')).toHaveCount(2);
  const now = page.getByRole('listitem', {name: 'Now, 10:30 AM'});
  await expect(now).toBeVisible();
  const [nowBox, stretchBox, pushBox] = await Promise.all([now.boundingBox(), habitRow(page, 'stretch').boundingBox(), habitRow(page, 'push').boundingBox()]);
  expect(nowBox!.y).toBeGreaterThan(stretchBox!.y); expect(nowBox!.y).toBeLessThan(pushBox!.y);
  await expect(page.getByText('Times you move here are kept on this device only', {exact: false})).toBeVisible();
  const before = await storage(page);
  await page.reload();
  await expect(page.locator('.timeline-page')).toHaveAttribute('data-timeline', 'ready');
  await expect(habitRow(page, 'stretch')).toBeVisible();
  expect(await storage(page)).toBe(before);
  expect(await stored(page, DAY_TIMELINE_KEY)).toBeNull();
});

test('tap Done completes through the habit’s own Done, and Undo puts the day back', async ({page}) => {
  await at(page, '10:30');
  await seedChecklist(page);
  const today = await browserToday(page);
  await open(page);
  await habitRow(page, 'push').getByRole('button', {name: `Done: ${TITLE.push}`}).click();
  await expect(habitRow(page, 'push')).toHaveAttribute('data-done', 'true');
  await expect.poll(async () => (await stored<{habits: {id: string; entries: {date: string; count: number}[]}[]}>(page, HABITS_KEY))!.habits.find(h => h.id === ID.push)!.entries.find(e => e.date === today)?.count).toBe(20);
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(habitRow(page, 'push')).not.toHaveAttribute('data-done', /./);
  await expect.poll(async () => (await stored<{habits: {id: string; entries: {date: string}[]}[]}>(page, HABITS_KEY))!.habits.find(h => h.id === ID.push)!.entries.some(e => e.date === today)).toBe(false);
});

test('a move by drag, by keyboard and by the picker: 15-minute steps, kept on this device, the habit record untouched', async ({page, isMobile}) => {
  await at(page, '10:30');
  await seedChecklist(page);
  await open(page);
  const habits = JSON.stringify(await stored(page, HABITS_KEY));
  // Drag: four steps of 15 minutes down.
  const handle = habitRow(page, 'stretch').getByRole('button', {name: /^Move Fictional stretch, now at 8:00 AM/});
  const box = (await handle.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  if (!isMobile) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 24, {steps: 4});
    await expect(habitRow(page, 'stretch').locator('.timeline-time')).toHaveText('8:30 AM');
    await page.mouse.move(x, y + 48, {steps: 4});
    await page.mouse.up();
  } else {
    // The phone project: a finger's pointer events (the emulated mouse does not drag under touch emulation).
    const finger = {pointerId: 3, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x};
    await handle.dispatchEvent('pointerdown', {...finger, clientY: y, button: 0, buttons: 1});
    for (const dy of [12, 24]) await handle.dispatchEvent('pointermove', {...finger, clientY: y + dy, buttons: 1});
    await expect(habitRow(page, 'stretch').locator('.timeline-time')).toHaveText('8:30 AM');
    for (const dy of [36, 48]) await handle.dispatchEvent('pointermove', {...finger, clientY: y + dy, buttons: 1});
    await handle.dispatchEvent('pointerup', {...finger, clientY: y + 48, button: 0, buttons: 0});
  }
  await expect(habitRow(page, 'stretch').locator('.timeline-time')).toHaveText('9:00 AM');
  await expect.poll(() => stored(page, DAY_TIMELINE_KEY)).toEqual({version: 1, times: {[`habit:${ID.stretch}`]: {time: '09:00'}}});
  await expect(habitRow(page, 'stretch')).toContainText('at moved here');
  // Keyboard: two steps down and Enter; Escape leaves it where it was.
  const push = habitRow(page, 'push').getByRole('button', {name: /^Move Fictional push-ups/});
  await push.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  await expect(habitRow(page, 'push').locator('.timeline-time')).toHaveText('2:00 PM');
  await push.focus();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await expect(habitRow(page, 'push').locator('.timeline-time')).toHaveText('2:30 PM');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await stored<{times: Record<string, {time: string}>}>(page, DAY_TIMELINE_KEY))!.times[`habit:${ID.push}`]).toEqual({time: '14:30'});
  // The picker: a time and a length, then back to the habit's own time.
  await habitRow(page, 'piano').getByRole('button', {name: `Change the time of ${TITLE.piano}`}).click();
  const picker = page.getByRole('form', {name: `Change the time of ${TITLE.piano}`});
  await picker.getByLabel('Time').fill('06:30');
  await picker.getByLabel('How long').selectOption('30');
  await picker.getByRole('button', {name: 'Save time', exact: true}).click();
  await expect(page.getByRole('region', {name: /^Morning/}).locator(`[data-block="habit:${ID.piano}"] .timeline-time`)).toHaveText('6:30 AM');
  await expect(habitRow(page, 'piano')).toContainText('30 min');
  await expect.poll(async () => (await stored<{times: Record<string, unknown>}>(page, DAY_TIMELINE_KEY))!.times[`habit:${ID.piano}`]).toEqual({time: '06:30', minutes: 30});
  await habitRow(page, 'piano').getByRole('button', {name: `Change the time of ${TITLE.piano}`}).click();
  await page.getByRole('button', {name: 'Put it back at 7:00 PM', exact: true}).click();
  await expect(page.getByRole('region', {name: /^Evening/}).locator(`[data-block="habit:${ID.piano}"]`)).toBeVisible();
  await expect.poll(async () => Object.keys((await stored<{times: Record<string, unknown>}>(page, DAY_TIMELINE_KEY))!.times).sort()).toEqual([`habit:${ID.push}`, `habit:${ID.stretch}`].sort());
  // Every move was a timeline record: the synced habit journal is byte for byte the same.
  expect(JSON.stringify(await stored(page, HABITS_KEY))).toBe(habits);
});

test('a running fast keeps its own clock: shown, never movable', async ({page}) => {
  await at(page, '10:30');
  const day = new Date().toISOString().slice(0, 10);
  await seedChecklist(page, {extra: {[FASTING_KEY]: JSON.stringify({version: 1, sessions: [{id: 'fast-fixture', startedAt: `${day}T06:00:00.000Z`, endedAt: null, targetHours: 16, timeZone: 'UTC'}]})}});
  await open(page);
  const fast = page.locator('[data-kind=fast]');
  await expect(fast).toContainText('Fasting · 16 h target');
  await expect(fast).toContainText('A running fast keeps its own clock.');
  await expect(fast.getByRole('button', {name: /^Move /})).toHaveCount(0);
  await expect(fast.getByRole('button', {name: /^Change the time/})).toHaveCount(0);
});

test('at the day’s end the leftovers get a Replan card; Skip today uses the habit’s own skip and nothing moves by itself', async ({page}) => {
  await at(page, '20:30');
  await seedChecklist(page);
  const today = await browserToday(page);
  await open(page);
  const replan = page.getByRole('region', {name: 'Still open today'});
  await expect(replan).toContainText('Nothing moves to tomorrow by itself.');
  await expect(replan.locator(`[data-block="habit:${ID.stretch}"]`)).toBeVisible();
  await expect(replan.locator(`[data-block="habit:${ID.piano}"]`)).toBeVisible();
  await replan.getByRole('button', {name: `Skip today: ${TITLE.stretch}`}).click();
  await expect(replan.locator(`[data-block="habit:${ID.stretch}"]`)).toHaveCount(0);
  await expect.poll(async () => (await stored<{habits: {id: string; entries: {date: string; disposition: string}[]}[]}>(page, HABITS_KEY))!.habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === today)?.disposition).toBe('skipped');
  await expect(habitRow(page, 'stretch').first()).toHaveAttribute('data-skipped', 'true');
  expect(await stored(page, DAY_TIMELINE_KEY)).toBeNull();
});

test('a quiet day says so; reduced motion: nothing on the timeline animates', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await at(page, '10:30');
  await seedChecklist(page, {path: null, extra: {[HABITS_KEY]: JSON.stringify({schemaVersion: 2, kind: 'zigoals-habits', habits: []})}});
  await page.goto('/app/timeline');
  await expect(page.getByRole('region', {name: 'A quiet day'})).toContainText('Nothing is scheduled yet.');
  await settled(page);
  const animated = await page.locator('.timeline-page *').evaluateAll(nodes => nodes.filter(n => getComputedStyle(n).animationName !== 'none').length);
  expect(animated).toBe(0);
});
