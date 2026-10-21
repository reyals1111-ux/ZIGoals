import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY} from '../lib/habits';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {FASTING_KEY} from '../lib/fasting/schema';
import {MEDITATION_RUN_KEY} from '../lib/meditation/schema';
import {ID, TITLE, fixturePath, seedChecklist, stored} from './checklist-fixtures';

/**
 * Session AF (L3; P7.16): the corner timers start and end each page's own timer; the record lands on its page. Sleep: a
 * running night, then the whole night on Health. Meditate: Health's meditation timer, then a saved session. Fast: a fast,
 * then a stopped one. Focus: shown only with a timed habit on the path; its own timer, then the time on Habits.
 */
type Health = {sleep?: {nights: {start: string; end: string | null}[]}; meditation?: {sessions: {seconds: number}[]}; fasting?: {sessions: {endedAt: string | null}[]}};
const timer = (page: Page, name: string) => page.getByRole('group', {name: 'Quick timers'}).getByRole('button', {name: new RegExp(`^${name}:`)});
/** Session AF (L3b): the timers in view — round 4: the foot bar's own chips on a phone or tablet, the side column on a computer (a corner button, where one is, is opened first). */
async function openTimers(page: Page) {
  const fab = page.getByRole('button', {name: /^Timers:/});
  await expect(page.locator('.checklist-timers-wrap')).toBeAttached();
  if (await fab.isVisible() && await fab.getAttribute('aria-expanded') !== 'true') await fab.click();
  await expect(page.getByRole('group', {name: 'Quick timers'})).toBeVisible();
}
const fasts = async (page: Page) => (await stored<{sessions: {endedAt: string | null}[]}>(page, FASTING_KEY))?.sessions ?? (await stored<Health>(page, HEALTH_STORAGE_KEY))?.fasting?.sessions ?? [];

test('Sleep, Meditate and Fast: one tap starts the page’s own timer, the next ends it on its page', async ({page}) => {
  await seedChecklist(page);
  await page.goto('/app/checklist');
  await openTimers(page);
  await expect(timer(page, 'Sleep')).toBeVisible();
  await expect(timer(page, 'Focus')).toHaveCount(0);
  // Sleep.
  await timer(page, 'Sleep').click();
  await expect(timer(page, 'Sleep')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await stored<Health>(page, HEALTH_STORAGE_KEY))?.sleep?.nights.map(n => n.end)).toEqual([null]);
  await page.waitForTimeout(1100);
  await timer(page, 'Sleep').click();
  await expect(timer(page, 'Sleep')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await stored<Health>(page, HEALTH_STORAGE_KEY))?.sleep?.nights.every(n => typeof n.end === 'string')).toBe(true);
  await expect(page.locator('.aa-toast')).toContainText('Your night is saved on Health.');
  // Meditate.
  await timer(page, 'Meditate').click();
  await expect.poll(async () => (await stored<{run: unknown}>(page, MEDITATION_RUN_KEY))?.run).not.toBeNull();
  await expect(timer(page, 'Meditate')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1600);
  await timer(page, 'Meditate').click();
  await expect.poll(async () => (await stored<Health>(page, HEALTH_STORAGE_KEY))?.meditation?.sessions.length).toBe(1);
  await expect.poll(async () => (await stored<{run: unknown}>(page, MEDITATION_RUN_KEY))?.run).toBeNull();
  // Fast.
  await timer(page, 'Fast').click();
  await expect.poll(async () => (await fasts(page)).map(f => f.endedAt)).toEqual([null]);
  await expect(timer(page, 'Fast')).toHaveAttribute('aria-pressed', 'true');
  await timer(page, 'Fast').click();
  await expect.poll(async () => (await fasts(page)).every(f => typeof f.endedAt === 'string')).toBe(true);
  // The running state was on the buttons, and is gone now.
  for (const name of ['Sleep', 'Meditate', 'Fast']) await expect(timer(page, name)).toHaveAttribute('aria-pressed', 'false');
});

test('Focus shows with a timed habit on the path: its own timer starts, then the time is logged on Habits', async ({page}) => {
  await seedChecklist(page, {path: fixturePath({piano: true})});
  await page.goto('/app/checklist');
  await openTimers(page);
  const focus = timer(page, 'Focus');
  // Session AF (L3b), moved at equal strength: the timer's card no longer carries a second line (the critique's "no
  // sub-lines"); its name still says which habit it times.
  await expect(focus).toContainText('Focus');
  await expect(focus).toHaveAccessibleName(new RegExp(`^Focus: ${TITLE.piano}\\.`));
  await focus.click();
  await expect.poll(async () => (await stored<{habits: {id: string; timer?: {state: string}}[]}>(page, HABITS_KEY))?.habits.find(h => h.id === ID.piano)?.timer?.state).toBe('running');
  await expect(focus).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1200);
  await focus.click();
  await expect.poll(async () => { const h = (await stored<{habits: {id: string; timer?: unknown; timerReceipts?: {status: string}[]}[]}>(page, HABITS_KEY))?.habits.find(x => x.id === ID.piano); return h ? {timer: h.timer ?? null, receipts: h.timerReceipts?.map(r => r.status)} : null; }).toEqual({timer: null, receipts: ['logged']});
  await expect(page.locator('.aa-toast')).toContainText('your time is logged on Habits');
});

test('honest timer cards: only a goal the person set says "Goal"; otherwise the card says what its value is', async ({page}, info) => {
  // Session AG (owner amendment 3, non-negotiable 3): no invented "8h 0m Goal". The fixture sets no sleep or meditation
  // goal and has never fasted; the piano habit's own target (15 minutes a day) is the person's goal for Focus.
  test.skip(info.project.name !== 'desktop', 'the side column shows every card\'s sub line');
  await seedChecklist(page, {path: fixturePath({piano: true})});
  await page.goto('/app/checklist');
  await openTimers(page);
  const sub = (name: string) => timer(page, name).locator('small');
  await expect(sub('Sleep')).toHaveText('No goal set · tap at bedtime');
  await expect(sub('Meditate')).toHaveText('No goal set · starts 10m');
  await expect(sub('Fast')).toHaveText('No goal set · starts at 16h');
  await expect(sub('Focus')).toHaveText('15m Goal');
  // The number wears the card's colour; the words stay plain.
  await expect(timer(page, 'Focus').locator('small b')).toHaveText('15m');
  for (const name of ['Sleep', 'Meditate', 'Fast']) await expect(sub(name), `${name}: never "Goal" for a value the person did not set`).not.toContainText(/\bGoal\b/);
});
