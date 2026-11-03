import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from './plan';
beforeAll(() => loadAaPlanner()); // NOVA's planner rides in the AA chunk with Session AK's and F9's
import {buildShowcase} from '../../showcase-data';
import {emptyHabitData} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {emptyAutoRules} from '../../auto-rules/schema';
import {emptyBills} from '../../bills/schema';
import {emptyTasks, TASKS, TASKS_KEY, type Tasks} from '../../tasks/schema';
import {finishTask} from '../../tasks/engine';
import {emptyWorkouts, WORKOUTS_KEY, type Workouts} from '../../workouts/schema';
import {emptyNotes, NOTES_KEY, type Notes} from '../../notes/schema';
import {captureInto, updateNote} from '../../notes/store';
import {updateDeviceRecord} from '../../device-record';
import {withChoice} from '../../pages/visibility';
import type {Handle} from '../context/types';
import {planAction, type Env, type Plan, type Stores} from './plan';
import {actionSchema, KIND_ALIASES, type Action} from './schema';
import {applyDeviceWrite, DEVICE_WRITE_KEYS, deviceWriteSpec} from './device-writes';
import {AUTO_ACCEPT_NEVER, autoAcceptVerdict} from './auto-accept';
import {answerOnly} from './decline';
import {deviceUndoOf, DEVICE_UNDO_FAILED, undoDeviceWrite} from './device-undo';
import {NOVA_UNDO_REFUSED} from './nova-writes';
import {NOVA_ACTION_KINDS} from './schema-nova';
import type {NovaRecords} from './plan-nova';
import {runnerEffect} from '../../../components/ai/runner-effects';

/**
 * Owner follow-up 2 (N5): NOVA's new cards (shared with ZIGi). Each is a confirm card (a form card, never batched, never
 * automatic even when switched on); the three that write go through their owner's own functions (lane T's tasks, the
 * workout log, lane B's notes inbox) with one fixed patch shape and an Undo that takes exactly that change back and is
 * refused when the record moved since; focus and the new pages only open a page. Nothing pays, signs, sends or moves.
 */
const DAY = '2026-10-31', now = new Date(`${DAY}T10:00:00Z`);
const {records} = buildShowcase(DAY);
const platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform;
const stores = (): Stores => ({habits: {...emptyHabitData(), timeZone: 'UTC'}, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform, fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), version: 1} as Stores['settings']});
const records0 = (): NovaRecords => ({tasks: emptyTasks(), workouts: emptyWorkouts(), notes: emptyNotes()});
const env = (nova: NovaRecords = records0(), s = stores()): Env => {
  const handles: Handle[] = s.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name}));
  return {stores: s, handles, now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', akRecords: {autoRules: emptyAutoRules(), bills: emptyBills(), nova} as Env['akRecords']};
};
const plan = (raw: Record<string, unknown>, e = env()): Plan => { const r = planAction(actionSchema.parse(raw) as Action, e); if (!r.ok) throw new Error(r.message); return r.plan; };
const refusal = (raw: Record<string, unknown>, e = env()): string => { const r = planAction(actionSchema.parse(raw) as Action, e); if (r.ok) throw new Error('expected a refusal'); return r.message; };
const apply = <T>(p: Plan, record: T): T => applyDeviceWrite(p.device!.key, record, p.device!.patch) as T;
const undo = <T>(p: Plan, record: T): T => applyDeviceWrite(p.device!.key, record, deviceUndoOf(p)!.patch) as T;
const japan = platform.goals.find(g => g.name === 'Japan adventure')!;

test('every NOVA kind is a confirm card: a form card on the never list, never automatic even when switched on; three records join the writers', () => {
  const all = {version: 1 as const, autoAccept: {kinds: Object.fromEntries(NOVA_ACTION_KINDS.map(k => [k, true])), dailyCap: 100, days: {}}};
  for (const kind of NOVA_ACTION_KINDS) { expect(AUTO_ACCEPT_NEVER).toContain(kind); expect(autoAcceptVerdict(all, kind, DAY, true)).toEqual({ok: false, reason: 'never'}); }
  for (const key of [TASKS_KEY, WORKOUTS_KEY, NOTES_KEY]) expect(DEVICE_WRITE_KEYS).toContain(key);
  expect(KIND_ALIASES.task).toBe('add-task'); expect(KIND_ALIASES.workout).toBe('log-workout'); expect(KIND_ALIASES.pomodoro).toBe('start-focus'); expect(KIND_ALIASES.capture).toBe('capture-note');
  // An older alias keeps its meaning: "add-note" is still a goal's note.
  expect(KIND_ALIASES['add-note']).toBe('add-goal-note');
  for (const raw of [{kind: 'add-task', title: 'Call the bank', due: 'tomorrow'}, {kind: 'log-workout', minutes: 30}, {kind: 'capture-note', text: 'An idea'}, {kind: 'start-focus'}]) expect(plan(raw).target, raw.kind).toBe('form');
});

describe('add-task', () => {
  test('a task for tomorrow at a time, for a goal: written through addTask; Undo takes exactly it off', () => {
    const p = plan({kind: 'add-task', title: '  Call   the bank ', due: 'tomorrow', time: '10:30', priority: 'high', goal: 'japan adventure'});
    expect(p.card.title).toBe('Task: Call the bank'); expect(p.card.day).toBe('2026-11-01'); expect(p.ak?.button).toBe('Add the task');
    expect(p.card.lines).toEqual([expect.stringMatching(/^Due .+ at /), 'Priority: high', 'For your goal Japan adventure', 'It shows on the agenda that day', 'Undo takes it off again; change it later in your tasks']);
    expect(runnerEffect(p)).toMatchObject({kind: 'record', key: TASKS_KEY});
    const after = apply<Tasks>(p, emptyTasks());
    expect(after.tasks).toEqual([expect.objectContaining({title: 'Call the bank', due: '2026-11-01', time: '10:30', priority: 'high', goal: `private:${japan.id}`, createdAt: now.toISOString()})]);
    expect(undo<Tasks>(p, after).tasks).toEqual([]);
    // Refused when the task moved since: done, or renamed.
    expect(() => undo<Tasks>(p, finishTask(after, after.tasks[0]!.id, now))).toThrow(NOVA_UNDO_REFUSED);
    expect(() => undo<Tasks>(p, {...after, tasks: [{...after.tasks[0]!, title: 'Call the bank today'}]})).toThrow(NOVA_UNDO_REFUSED);
  });
  test('refusals: a past day, the same open task again, a goal that is not theirs, a time with no day, an unreadable record', () => {
    expect(refusal({kind: 'add-task', title: 'Old', due: '2026-10-01'})).toBe('That day is already past; a task is due today or later.');
    const one = apply<Tasks>(plan({kind: 'add-task', title: 'Call the bank', due: 'today'}), emptyTasks());
    expect(refusal({kind: 'add-task', title: 'call the BANK', due: 'today'}, env({...records0(), tasks: one}))).toMatch(/^"call the BANK" is already on your tasks for /);
    expect(refusal({kind: 'add-task', title: 'Pack', goal: 'Mars base'})).toBe('No goal of yours is called "Mars base".');
    expect(actionSchema.safeParse({kind: 'add-task', title: 'Call', time: '10:00'}).success).toBe(false);
    expect(refusal({kind: 'add-task', title: 'Call'}, env({...records0(), tasks: null}))).toBe('The records for this card cannot be read on this device, so nothing was proposed.');
  });
  test('the writer checks the patch again: a widened or malformed patch is refused, never applied', () => {
    expect(() => applyDeviceWrite(TASKS_KEY, emptyTasks(), {add: {id: 'x', title: 'T', priority: 'urgent', at: now.toISOString(), today: DAY}})).toThrow('That change is not one a card can make.');
    expect(() => applyDeviceWrite(TASKS_KEY, emptyTasks(), {add: {id: 'x', title: 'T', priority: 'normal', at: now.toISOString(), today: DAY, doneAt: now.toISOString()}})).toThrow('That change is not one a card can make.');
    expect(() => applyDeviceWrite(TASKS_KEY, emptyTasks(), {remove: {id: 'x', title: 'T', createdAt: now.toISOString()}, add: {}})).toThrow('That change is not one a card can make.');
  });
});

describe('log-workout', () => {
  test('a workout that just ended today: its minutes on the log, no sets; Health content; Undo removes exactly it', () => {
    const p = plan({kind: 'log-workout', name: 'Run', type: 'cardio', minutes: 30, note: 'easy'});
    expect(p.card.title).toBe('Workout: Run'); expect(p.healthContent).toBe(true); expect(p.card.where).toBe('Health → Workouts');
    const after = apply<Workouts>(p, emptyWorkouts()), w = after.workouts[0]!;
    expect(w).toMatchObject({name: 'Run', type: 'cardio', date: DAY, startedAt: '2026-10-31T09:30:00.000Z', endedAt: '2026-10-31T10:00:00.000Z', exercises: [], notes: 'easy'});
    expect(undo<Workouts>(p, after).workouts).toEqual([]);
    expect(() => undo<Workouts>(p, {...after, workouts: [{...w, exercises: [{id: 'ex-1', exerciseId: 'squat', name: 'Squat', measure: 'reps', sets: []}]}]})).toThrow(NOVA_UNDO_REFUSED);
  });
  test('another day needs its start time; a workout that has not ended is refused; the same one twice is refused', () => {
    expect(refusal({kind: 'log-workout', minutes: 45, day: 'yesterday'})).toBe('Say when the workout started (a time such as 07:30) for a day other than today.');
    expect(plan({kind: 'log-workout', minutes: 45, day: 'yesterday', time: '07:30', type: 'strength'}).card.title).toBe('Workout: Strength workout');
    expect(refusal({kind: 'log-workout', minutes: 60, time: '09:30'})).toBe('That workout would end later than now; ZIGi logs workouts that are done.');
    const after = apply<Workouts>(plan({kind: 'log-workout', name: 'Run', minutes: 30}), emptyWorkouts());
    expect(refusal({kind: 'log-workout', name: 'run', minutes: 30}, env({...records0(), workouts: after}))).toMatch(/^Run is already on your workout log for today/);
  });
});

describe('capture-note', () => {
  test('the person\'s words into the inbox, marked from NOVA; Undo removes it; an edited or filed note stays', () => {
    const p = plan({kind: 'capture-note', title: 'Flat', text: 'Ask Mia about the flat\nbefore Friday'});
    expect(p.card.title).toBe('Note: Flat'); expect(p.card.lines[0]).toBe('“Ask Mia about the flat before Friday”'); expect(p.card.where).toBe('Notes → Inbox');
    const after = apply<Notes>(p, emptyNotes()), n = after.notes[0]!;
    expect(n).toMatchObject({kind: 'inbox', title: 'Flat', body: 'Ask Mia about the flat\nbefore Friday', source: 'nova', day: DAY, createdAt: now.toISOString()});
    expect(undo<Notes>(p, after).notes).toEqual([]);
    expect(() => undo<Notes>(p, updateNote(after, n.id, {body: 'Asked'}, '2026-10-31T11:00:00.000Z'))).toThrow(NOVA_UNDO_REFUSED);
    expect(refusal({kind: 'capture-note', text: 'Ask Mia about the flat\nbefore Friday'}, env({...records0(), notes: after}))).toBe('These words are already in your notes inbox.');
  });
});

describe('start-focus and the new pages', () => {
  test('focus opens Journey\'s Focus sessions with the length (and the goal) chosen; nothing is written', () => {
    const p = plan({kind: 'start-focus', minutes: 50, goal: 'g3'});
    expect(p.navigate).toEqual({href: `/app/journey?focus=50&goal=${japan.id}#focus`, label: 'Journey → Focus sessions'}); expect(p.device).toBeUndefined();
    expect(runnerEffect(p)).toEqual({kind: 'navigate', href: p.navigate!.href, label: 'Journey → Focus sessions'});
    expect(plan({kind: 'start-focus'}).navigate!.href).toBe('/app/journey?focus=25#focus');
    expect(actionSchema.safeParse({kind: 'start-focus', minutes: 30}).success).toBe(false);
    // A question with a focus card in a weak reply keeps it (it opens a page and writes nothing).
    expect(answerOnly('Focus 25 minutes.\n\n```zigoals-action\n{"kind":"start-focus","minutes":25}\n```', 'Can you start a focus session?')).toContain('"start-focus"');
  });
  test('open-page also opens the journal, the agenda, NOVA, notes, focus and workouts; Workouts follows Health', () => {
    const hrefs = Object.fromEntries((['journal', 'agenda', 'nova', 'notes', 'focus', 'workouts'] as const).map(page => [page, plan({kind: 'open-page', page}).navigate?.href]));
    expect(hrefs).toEqual({journal: '/app/journal', agenda: '/app/agenda', nova: '/app/nova', notes: '/app/notes', focus: '/app/journey#focus', workouts: '/app/health?view=workouts'});
    for (const href of Object.values(hrefs)) expect(runnerEffect({navigate: {href, label: 'x'}})?.kind).toBe('navigate');
    const s = stores(), hidden: Stores = {...s, settings: {...s.settings, pages: withChoice(s.settings.pages ?? {version: 1, choices: {}} as never, 'health', false, now.toISOString())} as Stores['settings']};
    expect(refusal({kind: 'open-page', page: 'workouts'}, env(records0(), hidden))).toBe('Health → Workouts follows Health, which is hidden in Settings → Your pages & buttons; show it there first.');
    expect(refusal({kind: 'open-page', page: 'journal', view: 'sleep'})).toBe('Journal opens as it is; ask for that page alone.');
  });
});

describe('Undo for a device-record card (device-undo.ts)', () => {
  const storage = () => { const map = new Map<string, string>(); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map}; };
  test('applied on this device\'s record; a second Undo, or one after a change, is refused with nothing changed', () => {
    const s = storage(), p = plan({kind: 'add-task', title: 'Call the bank', due: 'today'});
    updateDeviceRecord(s, deviceWriteSpec(TASKS_KEY)!, r => applyDeviceWrite(TASKS_KEY, r, p.device!.patch));
    expect((JSON.parse(s.getItem(TASKS_KEY)!) as Tasks).tasks).toHaveLength(1);
    expect(undoDeviceWrite(s, p)).toBeNull();
    expect((JSON.parse(s.getItem(TASKS_KEY)!) as Tasks).tasks).toEqual([]);
    expect(undoDeviceWrite(s, p)).toBe(NOVA_UNDO_REFUSED);
    // An unreadable record is never rewritten from empty.
    s.setItem(TASKS_KEY, '{"broken"'); expect(undoDeviceWrite(s, p)).toBe(DEVICE_UNDO_FAILED); expect(s.getItem(TASKS_KEY)).toBe('{"broken"');
    void TASKS;
  });
  test('only a known key with one remove patch is an Undo; the older device cards have none', () => {
    expect(deviceUndoOf({device: {key: TASKS_KEY, patch: {}, undo: {patch: {add: {}}, label: 'x'}}})).toBeNull();
    expect(deviceUndoOf({device: {key: 'zigoals:nope:v1', patch: {}, undo: {patch: {remove: {}}, label: 'x'}}})).toBeNull();
    expect(deviceUndoOf({device: {key: TASKS_KEY, patch: {}, undo: {patch: {remove: {}, add: {}}, label: 'x'}}})).toBeNull();
    expect(deviceUndoOf(plan({kind: 'open-agenda', view: 'week'}))).toBeNull();
    expect(deviceUndoOf(plan({kind: 'log-workout', minutes: 20}))).toMatchObject({key: WORKOUTS_KEY, label: 'Remove the workout'});
  });
});

describe('file-note (lane B\'s fileNote, with its Undo)', () => {
  const at = now.toISOString();
  const inbox = (): Notes => { let r = emptyNotes(); r = captureInto(r, {text: 'Rail pass prices', title: 'Rail pass', day: DAY, now: '2026-10-30T08:00:00.000Z', id: 'n-rail'}).record; return captureInto(r, {text: 'Call Mia', day: DAY, now: '2026-10-30T09:00:00.000Z', id: 'n-mia'}).record; };
  const withNotes = (notes: Notes) => env({...records0(), notes});
  test('beside a goal: the note becomes a topic linked to the goal; Undo puts it back in the inbox; a later edit keeps it', () => {
    const p = plan({kind: 'file-note', note: 'rail pass', to: 'goal', name: 'Japan'}, withNotes(inbox()));
    expect(p.card.title).toBe('File: Rail pass'); expect(p.card.lines[0]).toBe('Into beside your goal Japan adventure (a link to it)');
    const after = apply<Notes>(p, inbox()), filed = after.notes.find(n => n.id === 'n-rail')!;
    expect(filed).toMatchObject({kind: 'topic', title: 'Rail pass', updatedAt: at}); expect(filed.body.startsWith('[[Japan adventure]]')).toBe(true);
    expect(undo<Notes>(p, after)).toEqual(inbox());
    expect(() => undo<Notes>(p, updateNote(after, 'n-rail', {body: 'edited'}, '2026-10-31T11:00:00.000Z'))).toThrow(NOVA_UNDO_REFUSED);
  });
  test('into today\'s daily note it makes: Undo removes that daily note and the capture is back; a stale card is refused', () => {
    const p = plan({kind: 'file-note', note: 'Call Mia', to: 'daily'}, withNotes(inbox()));
    const after = apply<Notes>(p, inbox()), daily = after.notes.find(n => n.kind === 'daily')!;
    expect(daily).toMatchObject({day: DAY, body: 'Call Mia'}); expect(after.notes.some(n => n.id === 'n-mia')).toBe(false);
    expect(undo<Notes>(p, after)).toEqual(inbox());
    // The capture changed between the card and the tap: nothing is filed.
    expect(() => apply<Notes>(p, updateNote(inbox(), 'n-mia', {body: 'Call Mia today'}, '2026-10-31T09:30:00.000Z'))).toThrow('These notes changed since the card was made; ask again.');
  });
  test('refusals: no such inbox note, two that match, a topic with no title (schema)', () => {
    expect(refusal({kind: 'file-note', note: 'Groceries', to: 'daily'}, withNotes(inbox()))).toBe('No note in your inbox is called "Groceries".');
    let two = inbox(); two = captureInto(two, {text: 'Call Mia again', day: DAY, now: '2026-10-30T10:00:00.000Z', id: 'n-mia2'}).record;
    expect(refusal({kind: 'file-note', note: 'mia', to: 'daily'}, withNotes(two))).toBe('More than one note in your inbox matches "mia"; name it exactly.');
    expect(plan({kind: 'file-note', note: 'call mia', to: 'daily'}, withNotes(two)).card.title).toBe('File: Call Mia'); // an exact name wins
    expect(actionSchema.safeParse({kind: 'file-note', note: 'Rail pass', to: 'topic'}).success).toBe(false);
    expect(deviceUndoOf(plan({kind: 'file-note', note: 'Rail pass', to: 'topic', title: 'Japan'}, withNotes(inbox()))))?.toMatchObject({key: NOTES_KEY, label: 'Put it back in the inbox'});
  });
});

describe('remember with a memory kind and a source (lane ND, through addMemory)', () => {
  const remember = (raw: Record<string, unknown>, e = env()) => { const p = plan({kind: 'remember', ...raw}, e); return {p, memory: p.write(e.stores).memory!}; };
  test('a kind and a label are kept with who proposed it; on NOVA the proposer is NOVA; Undo forgets it', () => {
    const {p, memory} = remember({text: 'Prefers short answers', memory_kind: 'preference', label: 'Review my week'});
    expect(p.card.lines).toEqual(['Prefers short answers', 'Kept as: Preferences', 'From: Review my week', expect.stringContaining('On this device only')]);
    expect(memory.notes![0]).toMatchObject({text: 'Prefers short answers', kind: 'preference', source: 'zigi', from: {by: 'zigi', label: 'Review my week'}});
    const nova = remember({text: 'Mia is my sister', memory_kind: 'person'}, {...env(), surface: 'nova'});
    expect(nova.memory.notes![0]).toMatchObject({kind: 'person', from: {by: 'nova'}}); expect(nova.p.card.where).toBe('NOVA → Memory');
    expect(p.undo!.write({...env().stores, memory}).memory!.notes).toEqual([]);
  });
  test('health-like words proposed by ZIGi or NOVA are held unless Health is shared; without a kind, label or NOVA the card is as before', () => {
    expect(refusal({kind: 'remember', text: 'Takes medication for migraine', memory_kind: 'context'})).toMatch(/reads like something about your health/);
    expect(remember({text: 'Takes medication for migraine', memory_kind: 'context'}, {...env(), healthShared: true}).memory.notes![0]).toMatchObject({category: 'health'});
    const plain = remember({text: 'Trains in the morning'});
    expect(plain.memory.notes![0]!.from).toBeUndefined(); expect(plain.p.card.where).toBe('ZIGi · What ZIGi knows about me');
  });
});

test('lane ND\'s workflow cards parse and plan as they are (no new kind needed)', () => {
  for (const raw of [{kind: 'grocery-list', items: ['Oats'], week: 'next'}, {kind: 'plan-meal', recipe_name: 'Lentil soup', meal: 'Dinner', day: '2026-11-01'}, {kind: 'open-review', period: 'month'}, {kind: 'open-page', page: 'health', view: 'planner'},
    {kind: 'create-goal', name: 'Kitchen', type: 'PROJECT', milestones: ['Plans', 'Quotes']}, {kind: 'create-habit', title: 'Stretch', type: 'build', measurement: 'minutes', target: 10, schedule: 'daily', timeOfDay: 'morning', description: ''},
    {kind: 'review-intention', intention: 'Walk after lunch'}, {kind: 'add-task', title: 'Compare rail passes', due: 'tomorrow', priority: 'high', goal: 'g3'}]) expect(actionSchema.safeParse(raw).success, raw.kind).toBe(true);
  for (const raw of [{kind: 'open-review', period: 'month'}, {kind: 'open-page', page: 'health', view: 'planner'}, {kind: 'create-goal', name: 'Kitchen', type: 'PROJECT', milestones: ['Plans', 'Quotes']}, {kind: 'create-habit', title: 'Stretch', measurement: 'minutes', target: 10, schedule: 'daily'}, {kind: 'review-intention', intention: 'Walk after lunch'}, {kind: 'add-task', title: 'Compare rail passes', due: 'tomorrow', priority: 'high', goal: 'g3'}])
    expect(planAction(actionSchema.parse(raw) as Action, env()).ok, raw.kind).toBe(true);
});
