import {expect, test} from '@playwright/test';
import {HABITS_KEY} from '../lib/habits';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../lib/af-checklist-keys';
import {ID, TITLE, browserToday, seedChecklist, settled, stored} from './checklist-fixtures';

/**
 * Session AF (L3; P7.1–P7.12, P7.17): the Checklist end to end. A star on a habit card puts it on the path; a tick writes
 * the habit's own record (Habits agrees) and Undo takes it back; any order; a value dot opens the stepper with the item's
 * default and remembers the last value; a custom item lives on the path; Edit path reorders by keyboard; the List view.
 * Every request stays on the app's own origin (no new egress).
 */
type Habits = {habits: {id: string; entries: {date: string; count: number; disposition: string}[]}[]};
const entryToday = async (page: import('@playwright/test').Page, id: string) => { const today = await browserToday(page), data = await stored<Habits>(page, HABITS_KEY); return data?.habits.find(h => h.id === id)?.entries.find(e => e.date === today) ?? null; };

test.beforeEach(async ({page}) => {
  const foreign: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) foreign.push(r.url()); });
  (page as unknown as {foreign: string[]}).foreign = foreign;
});
test.afterEach(async ({page}) => { expect((page as unknown as {foreign: string[]}).foreign, 'every request stays on the app\'s own origin').toEqual([]); });

test('a star on a habit puts it on the path; a tick writes the habit’s record; Undo takes it back', async ({page}) => {
  await seedChecklist(page, {path: null});
  await page.goto('/app/habits');
  const card = page.getByRole('article', {name: TITLE.stretch, exact: true});
  const star = card.getByRole('button', {name: `Star ${TITLE.stretch} for your Checklist path`, exact: true});
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await star.click();
  await expect(card.getByRole('button', {name: `${TITLE.stretch} is on your Checklist path. Take it off`, exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.aa-toast')).toContainText(`${TITLE.stretch} added to your path.`);
  const path = await stored<{items: {kind: string; ref: {habitId: string}; section: string}[]}>(page, CHECKLIST_KEY);
  expect(path?.items).toEqual([expect.objectContaining({kind: 'habit', ref: {habitId: ID.stretch}, section: 'morning'})]);

  await page.goto('/app/checklist');
  await expect(page.getByRole('heading', {level: 1, name: 'Your orbit'})).toBeVisible();
  await expect(page.getByRole('heading', {level: 2, name: 'Morning orbit'})).toBeVisible();
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 1 dot today');
  const dot = page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true});
  await dot.click();
  await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.checklist-progress-line')).toContainText('1 of 1 dot today');
  await expect.poll(() => entryToday(page, ID.stretch)).toMatchObject({count: 1, disposition: 'logged'});
  const receipts = await stored<{today: {ticks: {id: string}[]}}>(page, CHECKLIST_DAYS_KEY);
  expect(receipts?.today.ticks).toHaveLength(1);
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 1 dot today');
  await expect.poll(() => entryToday(page, ID.stretch)).toBeNull();
  await page.goto('/app/habits');
  await expect(page.getByRole('article', {name: TITLE.stretch, exact: true}).getByRole('button', {name: `Complete ${TITLE.stretch}`, exact: true})).toHaveAttribute('aria-pressed', 'false');
});

test('any order; a value dot opens the stepper with the default, logs to Health and remembers the last value', async ({page}) => {
  await seedChecklist(page);
  await page.goto('/app/checklist');
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 4 dots today');
  // The last dot first: the custom item, ticked on the path.
  await page.getByRole('button', {name: `${TITLE.custom}: not done yet`, exact: true}).click();
  await expect(page.locator('.checklist-progress-line')).toContainText('1 of 4 dots today');
  // Water: the stepper opens with the item's default (250 ml) …
  await page.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
  const stepper = page.getByRole('form', {name: 'Log Water'});
  await expect(stepper.getByRole('textbox')).toHaveValue('250');
  await stepper.getByRole('button', {name: 'More, by 50 ml'}).click();
  await stepper.getByRole('button', {name: 'Log 300 ml'}).click();
  await expect(page.getByRole('button', {name: /^Water: 300 ml today: done$/})).toBeVisible();
  const health = await stored<{daily?: {water: {amountMilli: number; unit: string; date: string}[]}}>(page, HEALTH_STORAGE_KEY);
  expect(health?.daily?.water.map(w => [w.amountMilli, w.unit, w.date])).toEqual([[300000, 'ml', await browserToday(page)]]);
  // … and remembers 300 next time.
  await page.getByRole('button', {name: /^Water: 300 ml today: done$/}).click();
  await expect(page.getByRole('form', {name: 'Log Water'}).getByRole('textbox')).toHaveValue('300');
  await page.getByRole('form', {name: 'Log Water'}).getByRole('button', {name: 'Cancel'}).click();
  // A count habit takes the stepper too, and its record reads the value.
  await page.getByRole('button', {name: `${TITLE.push}: not done yet`, exact: true}).click();
  const push = page.getByRole('form', {name: `Log ${TITLE.push}`});
  await push.getByRole('textbox').fill('20');
  await push.getByRole('button', {name: 'Log 20 times'}).click();
  await expect.poll(() => entryToday(page, ID.push)).toMatchObject({count: 20});
  await expect(page.locator('.checklist-progress-line')).toContainText('3 of 4 dots today');
  // The half-way chest is reached; the line between two lit dots is lit.
  await expect(page.locator('.path-chest[data-milestone="half"]')).toHaveAttribute('data-reached', 'true');
  await expect(page.locator('.path-segment[data-lit]')).not.toHaveCount(0);
});

test('Edit path: a custom item, reorder by keyboard, an orbit renamed; the List view keeps the order', async ({page}) => {
  await seedChecklist(page);
  await page.goto('/app/checklist');
  await page.getByRole('button', {name: 'Edit path', exact: true}).click();
  const edit = page.getByRole('region', {name: 'Edit path'});
  await edit.getByLabel('What to do').fill('Fictional tea ritual');
  await edit.getByRole('button', {name: 'Add to path', exact: true}).click();
  await expect(edit.getByRole('status')).toContainText('Fictional tea ritual added to your path.');
  // Keyboard: the handle's arrow keys move an item within its orbit.
  const order = () => edit.locator('.checklist-edit-label strong').allTextContents();
  expect((await order()).slice(0, 2)).toEqual([TITLE.stretch, 'Water']);
  await edit.getByRole('button', {name: `Move Water: drag, or use the arrow keys`}).press('ArrowUp');
  await expect.poll(async () => (await order()).slice(0, 2)).toEqual(['Water', TITLE.stretch]);
  await expect(edit.getByRole('button', {name: 'Move Water: drag, or use the arrow keys'})).toBeFocused();
  await page.getByRole('button', {name: 'Done', exact: true}).first().click();
  await expect(page.locator('.path-step .path-label-text').first()).toHaveText('Water');
  // The List view: the same dots as pills, in the same order; the choice is remembered.
  await page.getByRole('group', {name: 'View'}).getByRole('button', {name: 'List'}).click();
  await expect(page.locator('.checklist-pill-label').first()).toHaveText('Water');
  await expect(page.locator('.checklist-pill-label')).toContainText([ 'Water', TITLE.stretch, TITLE.push ]);
  await page.reload(); await settled(page);
  await expect(page.getByRole('list', {name: "Today's list"})).toBeVisible();
});

test('an empty path says how to build one; Jump to next focuses the first waiting dot', async ({page}) => {
  await seedChecklist(page, {path: null});
  await page.goto('/app/checklist');
  await expect(page.getByRole('heading', {name: 'Your path is empty.'})).toBeVisible();
  await seedChecklist(page);
  await page.setViewportSize({width: 1280, height: 520});
  await page.goto('/app/checklist');
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const jump = page.getByRole('button', {name: /^Jump to next/});
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(page.getByRole('button', {name: 'Water: not done yet', exact: true})).toBeFocused();
});
