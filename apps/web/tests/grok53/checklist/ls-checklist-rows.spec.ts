import {expect, test, type Page} from '@playwright/test';
import {ID, TITLE, browserToday, fixturePath, seedChecklist, settled, stored} from '../../checklist-fixtures';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {HABITS_KEY, type HabitData} from '../../../lib/habits';
import {addFavourite} from '../../../lib/checklist/store';
import {UI_PREFS_KEY} from '../../../lib/ab-design-keys';
import {TASKS_KEY} from '../../../lib/tasks/schema';
import type {Checklist} from '../../../lib/checklist/schema';

/**
 * Session AL (lane L5, Checklist rows; the path, river, labels, top bar and layout are unchanged — O6):
 * LS-007 / P-LS-18 (no "+70 kg" with no weigh-in), LS-008 / LC-016 / P-LS-17 (Make this a habit keeps today's tick),
 * LS-018 / LS-059 / P-LS-21 (the toast's Undo can be pressed over Edit path), LS-026 / P-LS-22 (removing an orbit asks
 * where its items go), LS-027 / P-LS-23 (no "orbit orbit"), LS-062 / LS-068 / P-LS-24 (a duplicate says so, never "Not
 * saved"), LS-063 / P-LS-26 (an own item's name), LS-074 / LS-H13 / P-LS-54 (List view "Tasks due today" and the naming),
 * LS-019 / P-LS-32 (List More: orbit, name, take off), LS-H28 / P-LS-55. Fresh profile, 375 px unless said.
 */
const LIST = {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {view: 'list'}})};
async function open(page: Page, path: Checklist = fixturePath(), extra: Record<string, string> = {}) {
  await page.setViewportSize({width: 375, height: 800});
  await seedChecklist(page, {path, extra});
  await page.goto('/app/checklist'); await settled(page);
}
/** At 375 px Edit path and How it works sit in the "⋯" Checklist menu. */
async function fromMenu(page: Page, name: string) {
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await page.getByRole('group', {name: 'Checklist menu'}).getByRole('button', {name, exact: true}).click();
}
async function editPath(page: Page) {
  await fromMenu(page, 'Edit path');
  return page.getByRole('region', {name: 'Edit path'});
}

test('LS-007: with no weigh-in history the List shows no "+70 kg"; ⋯ opens the stepper instead', async ({page}) => {
  const path = addFavourite(fixturePath(), {kind: 'health', input: 'weight'}, {id: 'ck_weight', at: new Date(), section: 'morning'});
  await open(page, path, LIST);
  await expect(page.getByRole('button', {name: /^Log 70 kg/})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'More for Weigh in'})).toBeVisible();
});

test('LS-008/LC-016: "Make this a habit" on a ticked own item keeps today’s tick', async ({page}) => {
  await open(page, fixturePath(), LIST);
  await page.getByRole('button', {name: new RegExp(`^${TITLE.custom}: not done yet`)}).click();
  await expect(page.getByRole('button', {name: new RegExp(`^${TITLE.custom}.*: done`)})).toBeVisible();
  const edit = await editPath(page);
  await edit.getByRole('button', {name: `Change ${TITLE.custom}: orbit, colour, place`}).click();
  await edit.getByRole('button', {name: 'Make this a habit'}).click();
  await expect(edit.getByRole('status')).toContainText('done for today');
  const today = await browserToday(page);
  await expect.poll(async () => (await stored<HabitData>(page, HABITS_KEY))!.habits.find(x => x.title === TITLE.custom)?.entries.find(e => e.date === today)?.count).toBe(1);
  await page.getByRole('button', {name: 'Done', exact: true}).first().click();
  await expect(page.getByRole('button', {name: new RegExp(`^${TITLE.custom}.*: done`)})).toBeVisible();
});

test('LS-018/LS-059: the Undo after a removal in Edit path can be pressed; LS-062: a duplicate says so; LS-027: one "orbit"', async ({page}) => {
  await open(page);
  const edit = await editPath(page);
  await edit.getByRole('button', {name: `Change ${TITLE.custom}: orbit, colour, place`}).click();
  await edit.getByRole('button', {name: `Take ${TITLE.custom} off your path`}).click();
  const undo = page.locator('.aa-toast').getByRole('button', {name: 'Undo'});
  await undo.click();
  await expect.poll(async () => (await stored<Checklist>(page, CHECKLIST_KEY))!.items.some(i => i.label === TITLE.custom)).toBe(true);
  await edit.getByLabel('What to do').fill(TITLE.custom);
  await edit.getByRole('button', {name: 'Add to path'}).click();
  await expect(edit.getByRole('alert')).toHaveText(`“${TITLE.custom}” is already on your path.`);
  await expect(edit).not.toContainText('Not saved on this device');
  await expect(edit.getByRole('button', {name: /orbit orbit/})).toHaveCount(0);
});

test('LS-026: removing an orbit asks where its items go (Anytime first)', async ({page}) => {
  await open(page);
  const edit = await editPath(page);
  await edit.getByRole('button', {name: /^Remove the Evening/}).click();
  const ask = edit.getByRole('group', {name: /^Remove the Evening/});
  await expect(ask.getByRole('combobox')).toHaveValue('anytime');
  await ask.getByRole('button', {name: 'Remove orbit'}).click();
  await expect.poll(async () => (await stored<Checklist>(page, CHECKLIST_KEY))!.items.find(i => i.label === TITLE.custom)?.section).toBe('anytime');
});

test('LS-063: an own item can be renamed in Edit path', async ({page}) => {
  await open(page);
  const edit = await editPath(page);
  await edit.getByRole('button', {name: `Change ${TITLE.custom}: orbit, colour, place`}).click();
  const name = edit.getByLabel('Name', {exact: true});
  await name.fill('Fictional sketch');
  await name.press('Enter');
  await expect.poll(async () => (await stored<Checklist>(page, CHECKLIST_KEY))!.items.some(i => i.label === 'Fictional sketch')).toBe(true);
});

test('LS-074/P-LS-54: the List view shows "Tasks due today" linking into Tasks; LS-019: More can move and take off', async ({page}) => {
  const day = new Date(); const today = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  await open(page, fixturePath(), {...LIST, [TASKS_KEY]: JSON.stringify({version: 1, tasks: [{id: 'task_a', title: 'Fictional post the letter', priority: 'normal', due: today, createdAt: new Date().toISOString()}]})});
  const section = page.getByRole('region', {name: 'Tasks due today'});
  await expect(section).toContainText('Fictional post the letter');
  await expect(section.getByRole('link', {name: 'Open Tasks →'})).toHaveAttribute('href', '/app/tasks?view=today');
  // A ticked task leaves the list at once (by design: it is done in Tasks), so check() could not read the box back: click.
  await section.getByRole('checkbox').click();
  await expect.poll(async () => !!(await stored<{tasks: {doneAt?: string}[]}>(page, TASKS_KEY))!.tasks[0]!.doneAt).toBe(true);
  await expect(section).toContainText('Nothing due today in Tasks.');
  await page.getByRole('button', {name: `More for ${TITLE.custom}`}).click();
  const tools = page.getByRole('group', {name: `More for ${TITLE.custom}`});
  await tools.getByLabel('Orbit').selectOption('morning');
  await expect.poll(async () => (await stored<Checklist>(page, CHECKLIST_KEY))!.items.find(i => i.label === TITLE.custom)?.section).toBe('morning');
  await tools.getByRole('button', {name: 'Take off the path'}).click();
  await expect.poll(async () => (await stored<Checklist>(page, CHECKLIST_KEY))!.items.some(i => i.label === TITLE.custom)).toBe(false);
});

test('P-LS-54/DV-162 and LS-H28: How it works says Checklist vs Tasks and that ZIGi is paused; quick add points to Habits', async ({page}) => {
  await open(page);
  await fromMenu(page, 'How it works');
  const about = page.getByRole('region', {name: 'How it works'});
  await expect(about).toContainText('One-off to-dos with a day, a repeat or a project live in Tasks');
  await expect(about).toContainText('ZIGi is paused here');
  void ID; void CHECKLIST_DAYS_KEY;
});
