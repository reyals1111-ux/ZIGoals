// Session AF (L3; ADR-028 H24, H57): the hosted verifier's Checklist stage, number 10, appended after every existing
// stage (no stage is renumbered). The lead appends CHECKLIST_STAGE to VERIFIER_STAGES and its sentinel to SENTINELS.
//
// Browser-local only, like the goal stage: a fictional habit named by a sentinel is created on Habits, starred for the
// Checklist, ticked on /app/checklist (its habit record gains today's check-in through Habits' own change), the day's
// celebration that this completes is closed (Session AG Polish 2: it holds the toast while open), then Undo puts the record
// back (no entry for today). No wallet, no signature, nothing written to a server; every request the page makes
// stays on the base (the verifier's GET-only and origin rules apply unchanged). `expect` is Playwright's, passed in by the
// caller. No import.meta and no top-level await: the browser spec loads this file too.
import assert from 'node:assert/strict';

export const CHECKLIST_SENTINELS = Object.freeze({habit: 'Verifier orbit sip 7f3e'});
export const CHECKLIST_PATH = '/app/checklist';
const HABITS_KEY = 'zigoals:habits:v1';
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A done dot's name: its label, its note when it has one, then "done" (lib/path/model.ts stepAriaLabel). */
export const doneName = title => new RegExp(`^${escape(title)}(: .+)?: done$`);

/** Habits → "+ New habit" → a daily habit with the sentinel title (the editor's defaults: one check-in a day). */
export async function createFictionalHabit(page, expect, base, title = CHECKLIST_SENTINELS.habit) {
  await page.goto(base + '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: title, exact: true});
  await expect(card).toBeVisible();
  return card;
}
/** The habit card's Checklist star: outlined, then pressed (on the path). */
export async function starHabit(page, expect, title = CHECKLIST_SENTINELS.habit) {
  const card = page.getByRole('article', {name: title, exact: true});
  await card.getByRole('button', {name: `Star ${title} for your Checklist path`, exact: true}).click();
  await expect(card.getByRole('button', {name: `${title} is on your Checklist path. Take it off`, exact: true})).toHaveAttribute('aria-pressed', 'true');
}
/** The Checklist with its one dot waiting. */
export async function openChecklist(page, expect, base, title = CHECKLIST_SENTINELS.habit) {
  await page.goto(base + CHECKLIST_PATH);
  await expect(page.getByRole('heading', {level: 1, name: 'Your orbit'})).toBeVisible();
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 1 planet today');
  return page.getByRole('button', {name: `${title}: not done yet`, exact: true});
}
/** Today's check-in of the sentinel habit as the Habits record holds it in this browser (null: none). */
export async function habitEntryToday(page, title = CHECKLIST_SENTINELS.habit) {
  return page.evaluate(({key, title}) => {
    const raw = localStorage.getItem(key); if (!raw || !raw.startsWith('{')) return {readable: false, entry: null};
    const data = JSON.parse(raw), habit = (data.habits ?? []).find(h => h.title === title); if (!habit) return {readable: true, entry: null};
    const parts = new Intl.DateTimeFormat('en', {timeZone: data.timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type).value, today = `${get('year')}-${get('month')}-${get('day')}`;
    const entry = habit.entries.find(e => e.date === today) ?? null;
    return {readable: true, entry: entry && {count: entry.count, disposition: entry.disposition}};
  }, {key: HABITS_KEY, title});
}
/** Tick the dot: it lights, the day reads 1 of 1, and the habit's own record holds today's check-in. */
export async function tickAndCheck(page, expect, title = CHECKLIST_SENTINELS.habit) {
  await page.getByRole('button', {name: `${title}: not done yet`, exact: true}).click();
  await expect(page.getByRole('button', {name: doneName(title)})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.checklist-progress-line')).toContainText('1 of 1 planet today');
  await expect(page.locator('.aa-toast')).toContainText(`${title} logged for today.`);
  await expect.poll(async () => (await habitEntryToday(page, title)).entry?.disposition ?? null).toBe('logged');
  const {entry} = await habitEntryToday(page, title);
  assert(entry && entry.count >= 1, 'the habit record holds today\'s check-in');
}
/** Session AG Polish 2 (ADR-031 K13): the day's only planet completes the day, so its celebration opens (once a day on this
 *  device) and holds the toast while it is open; Escape closes it and the toast comes back with its Undo. Where it does not
 *  open (already played today in this browser), there is nothing to close. */
export async function closeCelebration(page, expect) {
  const party = page.locator('dialog.checklist-celebration');
  const opened = await party.waitFor({state: 'visible', timeout: 10_000}).then(() => true, () => false);
  if (opened) {
    await page.keyboard.press('Escape');
    await expect(party).toHaveCount(0);
  }
  await expect(page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true})).toBeVisible();
}
/** Undo in the toast: the dot waits again and the habit's record is back as it was (no check-in today); Habits agrees. */
export async function undoAndCheck(page, expect, base, title = CHECKLIST_SENTINELS.habit) {
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.locator('.aa-toast')).toContainText(`${title}: back as it was.`);
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 1 planet today');
  await expect(page.getByRole('button', {name: `${title}: not done yet`, exact: true})).toBeVisible();
  await expect.poll(async () => (await habitEntryToday(page, title)).entry).toBeNull();
  await page.goto(base + '/app/habits');
  const card = page.getByRole('article', {name: title, exact: true});
  await expect(card.getByRole('button', {name: `Complete ${title}`, exact: true})).toHaveAttribute('aria-pressed', 'false');
}

/** Stage 10: the Checklist ticks a fictional favourite's real record, and Undo restores it. Ends on Habits. */
export async function checklistStage(page, {base, expect, report}) {
  await createFictionalHabit(page, expect, base);
  await starHabit(page, expect);
  const dot = await openChecklist(page, expect, base);
  await expect(dot).toBeVisible();
  await tickAndCheck(page, expect);
  await closeCelebration(page, expect);
  await undoAndCheck(page, expect, base);
  if (report) report.checklist = {habit: 'fictional sentinel', ticked: true, undone: true};
  await page.waitForLoadState('networkidle');
}
export const CHECKLIST_STAGE = Object.freeze({number: 10, key: 'checklist', name: 'Checklist: a fictional favourite habit ticks its own record, and Undo restores it', browser: true, liveOnly: false, reportsItself: false, run: checklistStage});
