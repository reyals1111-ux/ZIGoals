import {expect, test, type Page} from '@playwright/test';
import {NOTES_KEY} from '../lib/notes/schema';
import {TASKS_KEY} from '../lib/tasks/schema';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {askNova, cards, mockModel, novaChat, raw, seedDevice} from './wiring-2-helpers';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md N5): NOVA's five own cards on the UI path. A MOCK local model proposes add-task,
 * log-workout, capture-note, file-note and start-focus in one answer (lib/ai/actions/schema-nova.ts); every card waits
 * for the person's tap and nothing is written before it; each card that writes adds its record on the tap and its Undo
 * takes it back exactly; the focus card opens Focus sessions with the length chosen and writes nothing. Fictional records.
 */
test.skip(({isMobile}) => isMobile, 'the command bar is a computer shortcut; NOVA\'s phone chat is covered by wiring-2-r2.spec.ts');

const INBOX = {version: 1, voice: false, notes: [{id: 'wb-inbox-1', kind: 'inbox', title: '', body: 'Fictional rail pass question', day: '2026-09-20', source: 'text', createdAt: '2026-09-20T08:00:00.000Z'}]};
const FIVE = [
  {kind: 'add-task', title: 'Fictional call to the library', due: 'tomorrow', time: '10:30'},
  {kind: 'log-workout', name: 'Fictional swim', type: 'cardio', minutes: 30},
  {kind: 'capture-note', text: 'Fictional idea: a reading corner by the window', title: 'Reading corner'},
  {kind: 'file-note', note: 'Fictional rail pass question', to: 'topic', title: 'Fictional travel'},
  {kind: 'start-focus', minutes: 25},
];
const KEYS = [TASKS_KEY, WORKOUTS_KEY, NOTES_KEY] as const;
const snapshot = async (page: Page) => Object.fromEntries(await Promise.all(KEYS.map(async k => [k, await raw(page, k)] as const)));
/** A record as data, without its bookkeeping stamps (updatedAt), which a write and its Undo may move. */
const data = (value: string | null | undefined) => JSON.parse(value ?? 'null', (key, v: unknown) => key === 'updatedAt' ? undefined : v);

test('N5: NOVA proposes its five own cards; nothing is written before a tap; each confirmed card is undone exactly; Focus only opens', async ({page}) => {
  test.setTimeout(120_000);
  await mockModel(page, () => cards(FIVE, 'Five things, each for you to confirm.'));
  await seedDevice(page, {[NOTES_KEY]: INBOX});
  await page.goto('/app/habits');
  await askNova(page, 'Fictional: put these in order for me');
  const turn = novaChat(page).locator('.nova-turn-assistant').last();
  const card = (title: string | RegExp) => turn.locator('.ai-card').filter({hasText: title});
  await expect(turn.locator('.ai-card')).toHaveCount(5, {timeout: 20_000});
  const before = await snapshot(page);

  // Every card is proposed with its own button; none was applied for the person.
  const buttons: [RegExp, string][] = [[/Task: Fictional call to the library/, 'Add the task'], [/Workout: Fictional swim/, 'Log the workout'], [/Note: Reading corner/, 'Keep the note'], [/File: Fictional rail pass question/, 'File it'], [/Focus: 25 minutes/, 'Open Focus']];
  for (const [title, button] of buttons) {
    await expect(card(title)).toHaveClass(/ai-card-proposed/);
    await expect(card(title).getByRole('button', {name: button, exact: true})).toBeVisible();
  }
  expect(await snapshot(page)).toEqual(before);

  // Each writing card: the tap adds exactly its record; Undo puts the device back as it was.
  const confirmAndUndo = async (title: RegExp, button: string, written: (records: Record<string, string | null>) => void) => {
    await card(title).getByRole('button', {name: button, exact: true}).click();
    await expect(card(title)).toHaveClass(/ai-card-added/);
    written(await snapshot(page));
    await turn.getByRole('button', {name: /^Undo/}).click();
    await expect(card(title)).toHaveClass(/ai-card-undone/);
    const now = await snapshot(page);
    for (const key of KEYS) expect(data(now[key]), `${key} after Undo`).toEqual(data(before[key]));
  };
  await confirmAndUndo(/Task: Fictional call to the library/, 'Add the task', r => {
    const task = (data(r[TASKS_KEY]) as {tasks: {title: string; due?: string; time?: string}[]}).tasks.find(t => t.title === 'Fictional call to the library');
    expect(task).toMatchObject({due: '2026-09-21', time: '10:30'});
  });
  await confirmAndUndo(/Workout: Fictional swim/, 'Log the workout', r => {
    expect((data(r[WORKOUTS_KEY]) as {workouts: {name: string; type: string; date: string}[]}).workouts.find(w => w.name === 'Fictional swim')).toMatchObject({type: 'cardio', date: '2026-09-20'});
  });
  await confirmAndUndo(/Note: Reading corner/, 'Keep the note', r => {
    expect((data(r[NOTES_KEY]) as {notes: {kind: string; body: string; source?: string}[]}).notes.find(n => n.body.startsWith('Fictional idea'))).toMatchObject({kind: 'inbox', source: 'nova'});
  });
  await confirmAndUndo(/File: Fictional rail pass question/, 'File it', r => {
    const notes = (data(r[NOTES_KEY]) as {notes: {kind: string; title: string; body: string}[]}).notes;
    expect(notes.some(n => n.kind === 'inbox')).toBe(false);
    expect(notes.find(n => n.title === 'Fictional travel')?.body).toContain('Fictional rail pass question');
  });

  // The focus card writes nothing: it opens Focus sessions with 25 minutes chosen; the session starts on the person's tap.
  await card(/Focus: 25 minutes/).getByRole('button', {name: 'Open Focus', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/journey\?focus=25#focus$/);
  const after = await snapshot(page);
  for (const key of KEYS) expect(data(after[key]), `${key} after Open Focus`).toEqual(data(before[key]));
});
