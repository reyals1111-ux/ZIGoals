import {NOTES, NOTES_KEY, noteSchema, type Note, type Notes} from '../../notes/schema';
import {applyUndo, captureInto, checked, fileNote, type FileTarget} from '../../notes/store';
import {TASK_PRIORITIES, TASKS, TASKS_KEY, type Tasks} from '../../tasks/schema';
import {addTask, removeTask} from '../../tasks/engine';
import {WORKOUT_TYPES, WORKOUTS, WORKOUTS_KEY, workoutsSchema, type Workouts} from '../../workouts/schema';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Owner follow-up 2 (N5): the three device records NOVA's new cards change, each through its owner's own functions and
 * with one fixed patch shape, checked again here (a card's patch can never widen what it does), and each with its Undo:
 * - `zigoals:tasks:v1` (lane T): `{add: {id, title, priority, due?, time?, goal?, at, today}}` through `addTask`;
 *   Undo `{remove: {id, title, createdAt}}` takes off exactly that task while it is unchanged and not done;
 * - `zigoals:workouts:v1`: `{add: {id, name, type, date, startedAt, endedAt, notes?}}`, a finished workout with its
 *   minutes and no sets; Undo `{remove: {id, startedAt}}` while it still has no sets and the same times;
 * - `zigoals:notes:v1` (lane B): `{capture: {id, text, title?, day, now}}` into the inbox through `captureInto`, marked as
 *   from NOVA; Undo `{remove: {id, createdAt}}` while it is still that unedited inbox note. `{file: {id, target, now,
 *   expect, dailyAbsent?}}` files an inbox note through `fileNote`, only while the notes it touches are exactly as the card
 *   showed them; Undo `{unfile: {before, into, filedAt, createdDaily?}}` puts them back (lane B's `applyUndo`) while
 *   nothing changed since the filing.
 * An Undo that finds the record changed since throws NOVA_UNDO_REFUSED and changes nothing.
 * Registered by the planner chunk (plan-nova.ts) before any of these cards can exist.
 */
export const NOVA_UNDO_REFUSED = 'Something changed since, so this undo was not applied. Your records are as they are now.';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const NOT_A_CARD = 'That change is not one a card can make.';
const ID = /^[A-Za-z0-9_-]{1,80}$/, DAY = /^\d{4}-\d{2}-\d{2}$/, CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const stamp = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const only = (patch: Record<string, unknown>, keys: readonly string[]) => Object.keys(patch).length > 0 && Object.keys(patch).every(k => keys.includes(k));
const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const tasksEntry: Entry<Tasks> = {spec: TASKS, apply: (record, patch) => {
  if (!object(patch) || (!only(patch, ['add']) && !only(patch, ['remove']))) throw new Error(NOT_A_CARD);
  if (object(patch.remove)) {
    const {id, title, createdAt} = patch.remove;
    if (!str(id, 80) || !ID.test(id) || !str(title, 140) || !stamp(createdAt) || !only(patch.remove, ['id', 'title', 'createdAt'])) throw new Error(NOT_A_CARD);
    const task = record.tasks.find(t => t.id === id);
    if (!task || task.title !== title || task.createdAt !== createdAt || task.doneAt) throw new Error(NOVA_UNDO_REFUSED);
    return removeTask(record, id);
  }
  const a = patch.add;
  if (!object(a) || !only(a, ['id', 'title', 'priority', 'due', 'time', 'goal', 'at', 'today']) || !str(a.id, 80) || !ID.test(a.id) || !str(a.title, 140) || !stamp(a.at) || typeof a.today !== 'string' || !DAY.test(a.today)
    || !(TASK_PRIORITIES as readonly unknown[]).includes(a.priority) || (a.due !== undefined && (typeof a.due !== 'string' || !DAY.test(a.due))) || (a.time !== undefined && (typeof a.time !== 'string' || !CLOCK.test(a.time)))
    || (a.goal !== undefined && !str(a.goal, 120))) throw new Error(NOT_A_CARD);
  if (record.tasks.some(t => t.id === a.id)) throw new Error('This task is already on your list.');
  return addTask(record, {title: a.title, priority: a.priority as (typeof TASK_PRIORITIES)[number], ...(a.due ? {due: a.due as string} : {}), ...(a.time ? {time: a.time as string} : {}), ...(a.goal ? {goal: a.goal as string} : {})}, {id: a.id, at: new Date(a.at), today: a.today});
}};

export const workoutsEntry: Entry<Workouts> = {spec: WORKOUTS, apply: (record, patch) => {
  if (!object(patch) || (!only(patch, ['add']) && !only(patch, ['remove']))) throw new Error(NOT_A_CARD);
  if (object(patch.remove)) {
    const {id, startedAt} = patch.remove;
    if (!str(id, 80) || !ID.test(id) || !stamp(startedAt) || !only(patch.remove, ['id', 'startedAt'])) throw new Error(NOT_A_CARD);
    const workout = record.workouts.find(w => w.id === id);
    if (!workout || workout.startedAt !== startedAt || workout.exercises.length) throw new Error(NOVA_UNDO_REFUSED);
    return workoutsSchema.parse({...record, workouts: record.workouts.filter(w => w.id !== id)});
  }
  const a = patch.add;
  if (!object(a) || !only(a, ['id', 'name', 'type', 'date', 'startedAt', 'endedAt', 'notes']) || !str(a.id, 80) || !ID.test(a.id) || !str(a.name, 80) || !(WORKOUT_TYPES as readonly unknown[]).includes(a.type)
    || typeof a.date !== 'string' || !DAY.test(a.date) || !stamp(a.startedAt) || !stamp(a.endedAt) || (a.notes !== undefined && (typeof a.notes !== 'string' || a.notes.length > 500))) throw new Error(NOT_A_CARD);
  const minutes = (Date.parse(a.endedAt) - Date.parse(a.startedAt)) / 60_000;
  if (!(minutes >= 1 && minutes <= 600)) throw new Error(NOT_A_CARD);
  if (record.workouts.some(w => w.id === a.id)) throw new Error('This workout is already on your log.');
  return workoutsSchema.parse({...record, workouts: [...record.workouts, {id: a.id, name: a.name, date: a.date, type: a.type, startedAt: a.startedAt, endedAt: a.endedAt, exercises: [], ...(a.notes ? {notes: a.notes} : {})}]});
}};

export const notesEntry: Entry<Notes> = {spec: NOTES, apply: (record, patch) => {
  if (!object(patch) || (!only(patch, ['capture']) && !only(patch, ['remove']) && !only(patch, ['file']) && !only(patch, ['unfile']))) throw new Error(NOT_A_CARD);
  if (object(patch.file)) return fileFrom(record, patch.file);
  if (object(patch.unfile)) return unfileFrom(record, patch.unfile);
  if (object(patch.remove)) {
    const {id, createdAt} = patch.remove;
    if (!str(id, 80) || !ID.test(id) || !stamp(createdAt) || !only(patch.remove, ['id', 'createdAt'])) throw new Error(NOT_A_CARD);
    const note = record.notes.find(n => n.id === id);
    // Edited, filed or photographed since: the person has worked on it, so Undo leaves it.
    if (!note || note.createdAt !== createdAt || note.kind !== 'inbox' || note.updatedAt || note.source !== 'nova') throw new Error(NOVA_UNDO_REFUSED);
    return checked({...record, notes: record.notes.filter(n => n.id !== id)});
  }
  const c = patch.capture;
  if (!object(c) || !only(c, ['id', 'text', 'title', 'day', 'now']) || !str(c.id, 80) || !ID.test(c.id) || !str(c.text, 2000) || (c.title !== undefined && (typeof c.title !== 'string' || c.title.length > 120))
    || typeof c.day !== 'string' || !DAY.test(c.day) || !stamp(c.now)) throw new Error(NOT_A_CARD);
  if (record.notes.some(n => n.id === c.id)) throw new Error('This note is already in your inbox.');
  return captureInto(record, {text: c.text, source: 'nova', day: c.day, now: c.now, id: c.id, ...(typeof c.title === 'string' && c.title.trim() ? {title: c.title} : {})}).record;
}};

const notesOf = (v: unknown): Note[] | null => { if (!Array.isArray(v) || !v.length || v.length > 2) return null; const parsed = v.map(n => noteSchema.safeParse(n)); return parsed.every(p => p.success) ? parsed.map(p => p.data!) : null; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function targetOf(v: unknown): FileTarget | null {
  if (!object(v)) return null;
  if (v.kind === 'daily' && typeof v.day === 'string' && DAY.test(v.day) && only(v, ['kind', 'day'])) return {kind: 'daily', day: v.day};
  if (v.kind === 'note' && str(v.id, 80) && ID.test(v.id) && only(v, ['kind', 'id'])) return {kind: 'note', id: v.id};
  if ((v.kind === 'goal' || v.kind === 'habit') && str(v.name, 120) && only(v, ['kind', 'name'])) return {kind: v.kind, name: v.name};
  if (v.kind === 'topic' && str(v.title, 120) && only(v, ['kind', 'title'])) return {kind: 'topic', title: v.title};
  return null;
}
function fileFrom(record: Notes, f: Record<string, unknown>): Notes {
  const target = targetOf(f.target), expect = notesOf(f.expect);
  if (!only(f, ['id', 'target', 'now', 'expect', 'dailyAbsent']) || !str(f.id, 80) || !ID.test(f.id) || !target || !stamp(f.now) || !expect || (f.dailyAbsent !== undefined && f.dailyAbsent !== true)) throw new Error(NOT_A_CARD);
  // The notes it touches must be exactly as the card showed them (and no daily note made for that day since).
  if (!expect.every(n => same(record.notes.find(x => x.id === n.id), n)) || (f.dailyAbsent && target.kind === 'daily' && record.notes.some(n => n.kind === 'daily' && n.day === target.day))) throw new Error('These notes changed since the card was made; ask again.');
  return fileNote(record, f.id, target, f.now).record;
}
function unfileFrom(record: Notes, u: Record<string, unknown>): Notes {
  const before = notesOf(u.before);
  const createdDaily = typeof u.createdDaily === 'string' && DAY.test(u.createdDaily) ? u.createdDaily : null;
  if (!only(u, ['before', 'into', 'filedAt', 'createdDaily']) || !before || !stamp(u.filedAt) || (u.createdDaily !== undefined && !createdDaily) || (createdDaily ? u.into !== undefined : !str(u.into, 80))) throw new Error(NOT_A_CARD);
  // Unchanged since the filing: the note it went into (a daily note it made, or the one that was there) still carries the filing's own time.
  const into = createdDaily ? record.notes.find(n => n.kind === 'daily' && n.day === createdDaily && n.createdAt === u.filedAt) : record.notes.find(n => n.id === u.into);
  if (!into || into.updatedAt !== u.filedAt) throw new Error(NOVA_UNDO_REFUSED);
  const daily = createdDaily ? into : undefined;
  return applyUndo(record, {before, created: daily ? [daily.id] : [], said: ''});
}

registerDeviceWrite(TASKS_KEY, tasksEntry);
registerDeviceWrite(WORKOUTS_KEY, workoutsEntry);
registerDeviceWrite(NOTES_KEY, notesEntry);
