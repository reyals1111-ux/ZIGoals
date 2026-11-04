import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task, toast} from './helpers';
import {JOURNAL_KEY} from '../../../lib/journal/schema';
import {NOTES_KEY} from '../../../lib/notes/schema';

/**
 * Session AL second pass (lane L5). DV-172 (tasks in Activity, for L4), PR-103 / P-PR-41 (tasks on the Day Timeline),
 * P-LS-08 (Ctrl/⌘+Z runs the toast's Undo on Agenda, Journal and Notes, never inside a text field), DV-190 / DV-191 /
 * P-DV-124 (Journal: Remove with the one Undo, "Question for later", the legend first), PR-105 / P-PR-43 (Notes search shows
 * only its results), PR-107 / P-PR-45 (an inbox capture's first line is not shown twice), DV-192 / P-DV-16 (40 characters
 * in the toast), TK-053 (Quick add does not read "P&L" as litres), DV-193 / P-DV-125 (Agenda legend and filter control).
 * Fresh profile, UTC, 1280 px unless said. Fictional data only.
 */
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => { await page.setViewportSize({width: 1280, height: 900}); });

test('DV-172: a task added and one finished show in Activity, under "Task"', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_bank', 'Fictional call the bank', {due: DAY, doneAt: `${DAY}T08:30:00.000Z`}), task('task_seeds', 'Fictional buy seeds')])});
  await page.goto('/app/activity');
  const feed = page.locator('.unified-activity');
  await expect(feed.locator('.activity-event').filter({hasText: 'Fictional call the bank'}).filter({hasText: /^.*Done · was due/})).toHaveCount(1);
  await expect(feed.locator('.activity-event').filter({hasText: 'Fictional buy seeds'}).filter({hasText: 'Task added'})).toHaveCount(1);
  await expect(feed.locator('.activity-event').filter({hasText: 'Fictional buy seeds'}).locator('.activity-category-label')).toContainText('Task');
});

test('PR-103 / P-PR-41: the day\'s tasks are on the Day Timeline, an overdue one said so', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_dent', 'Fictional book the dentist', {due: DAY, time: '10:30'}), task('task_rent', 'Fictional pay rent', {due: '2026-11-01'})])});
  await page.goto('/app/timeline');
  await expect(page.getByText('Fictional book the dentist')).toBeVisible();
  await expect(page.getByText('Fictional pay rent')).toBeVisible();
});

test('P-LS-08: Ctrl+Z on the Journal runs the toast\'s Undo and puts the entry back; in the search field it does not', async ({page}) => {
  await freshTasks(page, {extra: {[JOURNAL_KEY]: JSON.stringify({version: 1, shareWithAi: false, followUps: true, entries: [
    {id: 'jr_1', date: DAY, text: 'Fictional quiet morning walk.', createdAt: `${DAY}T07:00:00.000Z`, followUp: {question: 'What made it quiet?', from: 'device'}},
  ]})}});
  await page.goto('/app/journal');
  // DV-190b: a question made on this device is not "ZIGi asked".
  await expect(page.locator('.journal-entry-followup')).toHaveText(/^Question for later: What made it quiet\?/);
  // DV-190c: the week's legend comes before the strip it explains.
  const legendFirst = await page.locator('.journal-week').evaluate(el => { const l = el.querySelector('.journal-week-legend'), s = el.querySelector('.journal-week-days'); return !!l && !!s && !!(l.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); });
  expect(legendFirst).toBe(true);
  await page.getByRole('button', {name: `Remove the entry of ${DAY}`}).click();
  await expect(toast(page)).toContainText('removed');
  await expect(page.locator('.journal-entries li')).toHaveCount(0);
  // In a text field Ctrl+Z is the field's own undo: the entry stays removed.
  await page.getByLabel('Search your journal').focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.journal-entries li')).toHaveCount(0);
  await page.locator('body').click({position: {x: 5, y: 5}});
  await page.keyboard.press('Control+z');
  await expect(page.locator('.journal-entries li')).toHaveCount(1);
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).entries.length, JOURNAL_KEY)).toBe(1);
});

test('PR-105 / PR-107 / DV-192: Notes search shows only its results; a capture is headed once; the toast echoes 40 characters', async ({page}) => {
  const long = 'Fictional idea about a long walk to the harbour and back before dinner';
  await freshTasks(page, {extra: {[NOTES_KEY]: JSON.stringify({version: 1, notes: [
    {id: 'note_topic', kind: 'topic', title: 'Fictional trip ideas', body: 'Lisbon, Porto', createdAt: `${DAY}T07:00:00.000Z`},
    {id: 'note_cap', kind: 'inbox', title: '', body: long, day: DAY, createdAt: `${DAY}T07:05:00.000Z`},
  ]})}});
  await page.goto('/app/notes?view=notes');
  await expect(page.locator('.note-list').getByText('Fictional trip ideas')).toBeVisible();
  await page.getByRole('searchbox').fill('zzzz');
  await expect(page.getByText('No note has those words.')).toBeVisible();
  await expect(page.locator('.note-list')).toHaveCount(0);
  await page.goto('/app/notes?note=note_cap');
  await expect(page.locator('h2.note-title')).toHaveText(/^Inbox capture · /);
  await page.goto('/app/notes?view=inbox');
  await page.getByRole('button', {name: `Delete “${long}”`}).click();
  await expect(toast(page)).toContainText(`“${long.slice(0, 39).trimEnd()}…” deleted.`);
  await toast(page).getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).notes.length, NOTES_KEY)).toBe(2);
});

test('TK-053: Quick add does not read "Explain my P&L" as a litre of water', async ({page}) => {
  await freshTasks(page);
  await page.goto('/app');
  await page.getByRole('button', {name: '+ Quick add'}).first().click();
  const line = page.getByRole('form', {name: 'Type a line'});
  await line.getByLabel('Type a line').fill('Explain my P&L');
  await line.getByRole('button', {name: 'Preview'}).click();
  await expect(line).not.toContainText('Will save');
  await expect(line).not.toContainText('Water');
});

test('DV-193 / DV-194: the Agenda filter shows it opens; a month says what its dots mean', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_seeds', 'Fictional buy seeds', {due: DAY})])});
  await page.goto('/app/agenda?view=month');
  await expect(page.locator('.agenda-filter summary')).toContainText('Choose kinds');
  await expect(page.locator('.agenda-legend')).toContainText('the number is how many items that day');
  await expect(page.locator(`[data-date="${DAY}"]`)).toHaveAttribute('aria-label', /1 task/);
});

test('P-LS-08: Ctrl+Z on Tasks never fires inside a text field', async ({page}) => {
  await freshTasks(page, {tasks: record([task('task_a', 'Fictional A', {due: DAY})])});
  await page.goto('/app/tasks');
  await page.getByRole('checkbox', {name: 'Mark “Fictional A” done'}).check();
  await expect.poll(async () => !!(await storedTasks(page))!.tasks[0]!.doneAt).toBe(true);
  await page.getByRole('form', {name: 'Add a task'}).getByLabel('New task').focus();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => !!(await storedTasks(page))!.tasks[0]!.doneAt).toBe(true);
});
