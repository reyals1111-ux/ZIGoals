import {NOTES, NOTES_KEY, type Notes} from '../../notes/schema';
import {fileNote, newNoteId, type FileTarget} from '../../notes/store';
import {noteName} from '../../notes/schema';
import {TASKS, TASKS_KEY, type Tasks} from '../../tasks/schema';
import {goalKeyOf} from '../../tasks/engine';
import {WORKOUTS, WORKOUTS_KEY, type Workouts} from '../../workouts/schema';
import {readDeviceRecord} from '../../device-record';
import {addLocalDays} from '../../local-date';
import {getAppStorage} from '../../showcase-storage';
import {formatClock, formatDate, formatNumber} from '../../visual-format';
import {instantAt} from '../../zone-time';
import './nova-writes';
import {planG1Action} from './plan-g1';
import type {AaHelpers} from './plan-aa';
import type {Env, PlanResult} from './plan';
import type {Action} from './schema';

/**
 * Owner follow-up 2 (N5): the planner's cases for NOVA's new cards, in the lazy planner chunk beside plan-ak-f9.ts. Every
 * card is `target: 'form'`: never batched, never automatic (auto-accept's never list), and the three that write carry
 * their Undo (`device.undo`, applied by device-undo.ts through nova-writes.ts). Arguments are data: a goal is matched
 * against the person's own open goals (one match, never a guess); titles and words are theirs, bounded by the schema.
 * The records come from `env.akRecords.nova` when the caller has them, else from this device's storage when the card is
 * planned; a record that cannot be read proposes nothing (it is never overwritten from empty).
 */
export type NovaRecords = {tasks?: Tasks | null; workouts?: Workouts | null; notes?: Notes | null};
const UNREADABLE = 'The records for this card cannot be read on this device, so nothing was proposed.';
const SPECS = {tasks: TASKS, workouts: WORKOUTS, notes: NOTES} as const;
function read<K extends keyof NovaRecords>(env: Env, key: K): NonNullable<NovaRecords[K]> | null {
  const given = (env.akRecords as {nova?: NovaRecords} | undefined)?.nova;
  if (given && key in given) return (given[key] ?? null) as NonNullable<NovaRecords[K]> | null;
  try { const r = readDeviceRecord(getAppStorage(), SPECS[key] as never) as {data: unknown; unreadable: boolean}; return r.unreadable ? null : r.data as NonNullable<NovaRecords[K]>; } catch { return null; }
}
const fold = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const short = (s: string, n = 60) => s.length > n ? `${s.slice(0, n - 1)}…` : s;
/** One of the person's own open goals, by handle or name (exactly one). */
function goalNamed(env: Env, h: AaHelpers, named: string): {ok: true; id: string; name: string} | {ok: false; message: string} {
  const byHandle = h.goalOf(env, named);
  if (byHandle.ok) {
    const id = byHandle.found.id.startsWith('private:') ? byHandle.found.id.slice('private:'.length) : null, goal = id ? env.stores.platform.goals.find(g => g.id === id) : undefined;
    return goal ? {ok: true, id: goal.id, name: goal.name} : {ok: false, message: 'That goal is not one of your own goals in Goals, so nothing was proposed.'};
  }
  const key = fold(named.replace(/\s+goal$/i, '')), open = env.stores.platform.goals.filter(g => g.status !== 'closed');
  const exact = open.filter(g => fold(g.name) === key), near = exact.length ? exact : open.filter(g => fold(g.name).includes(key) || key.includes(fold(g.name)));
  if (near.length === 1) return {ok: true, id: near[0]!.id, name: near[0]!.name};
  return {ok: false, message: near.length ? `More than one goal matches "${short(named)}"; name it exactly.` : `No goal of yours is called "${short(named)}".`};
}
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function planNovaAction(action: Action, env: Env, h: AaHelpers): PlanResult | null {
  const at = env.now.toISOString(), today = env.habitDay;
  switch (action.kind) {
    case 'add-task': {
      const record = read(env, 'tasks'); if (!record) return h.refuse(UNREADABLE);
      const due = action.due === 'today' ? today : action.due === 'tomorrow' ? addLocalDays(today, 1) : action.due;
      if (due && due < today) return h.refuse('That day is already past; a task is due today or later.');
      if (due && due > addLocalDays(today, 730)) return h.refuse('That day is more than two years ahead; choose a nearer one.');
      let goal: {id: string; name: string} | null = null;
      if (action.goal) { const g = goalNamed(env, h, action.goal); if (!g.ok) return h.refuse(g.message); goal = g; }
      const title = action.title.replace(/\s+/g, ' ').trim();
      if (record.tasks.some(t => !t.doneAt && fold(t.title) === fold(title) && (t.due ?? null) === (due ?? null))) return h.refuse(`"${short(title)}" is already on your tasks${due ? ` for ${formatDate(due)}` : ''}.`);
      const id = newId('task'), priority = action.priority ?? 'normal';
      const when = due ? `Due ${formatDate(due)}${action.time ? ` at ${formatClock(action.time)}` : ''}` : 'No day yet (on your task list until you give it one)';
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Task: ${title}`, lines: [when, ...(priority !== 'normal' ? [`Priority: ${priority}`] : []), ...(goal ? [`For your goal ${goal.name}`] : []),
        ...(due ? ['It shows on the agenda that day'] : []), 'Undo takes it off again; change it later in your tasks'], where: 'Tasks', day: due ?? null, estimate: false},
        write: () => ({}), undo: null, ak: {button: 'Add the task'},
        device: {key: TASKS_KEY, patch: {add: {id, title, priority, ...(due ? {due} : {}), ...(action.time ? {time: action.time} : {}), ...(goal ? {goal: goalKeyOf(goal.id)} : {}), at, today}}, label: `Task added: ${short(title)}`,
          undo: {patch: {remove: {id, title, createdAt: at}}, label: 'Take the task off again'}}}};
    }
    case 'log-workout': {
      const record = read(env, 'workouts'); if (!record) return h.refuse(UNREADABLE);
      const day = h.resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return h.refuse(day.message);
      let end: number, start: number;
      if (action.time) { start = instantAt(day.day, action.time, env.timeZone); end = start + action.minutes * 60_000; }
      else if (day.day === env.healthDay) { end = env.now.getTime(); start = end - action.minutes * 60_000; }
      else return h.refuse('Say when the workout started (a time such as 07:30) for a day other than today.');
      if (!Number.isFinite(start) || end > env.now.getTime() + 60_000) return h.refuse('That workout would end later than now; ZIGi logs workouts that are done.');
      const name = (action.name ?? '').replace(/\s+/g, ' ').trim() || `${action.type[0]!.toUpperCase()}${action.type.slice(1)} workout`;
      const same = record.workouts.find(w => w.date === day.day && fold(w.name) === fold(name) && w.endedAt && Math.abs(Date.parse(w.startedAt) - start) < 30 * 60_000);
      if (same) return h.refuse(`${short(same.name)} is already on your workout log for ${h.dayLabel(day.day, env.healthDay)}.`);
      const id = newId('workout'), startedAt = new Date(start).toISOString(), endedAt = new Date(end).toISOString();
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Workout: ${name}`, lines: [`${formatNumber(action.minutes)} minutes, ${action.type}, ${h.dayLabel(day.day, env.healthDay)}${action.time ? ` from ${formatClock(action.time)}` : ''}`,
        ...(action.note ? [`Note: ${short(action.note, 120)}`] : []), 'Minutes only, no sets; add sets in Health → Workouts', 'Undo removes it again'], where: 'Health → Workouts', day: day.day, estimate: false},
        write: () => ({}), undo: null, healthContent: true, ak: {button: 'Log the workout'},
        device: {key: WORKOUTS_KEY, patch: {add: {id, name, type: action.type, date: day.day, startedAt, endedAt, ...(action.note ? {notes: action.note} : {})}}, label: `Workout logged: ${short(name)}`,
          undo: {patch: {remove: {id, startedAt}}, label: 'Remove the workout'}}}};
    }
    case 'capture-note': {
      const record = read(env, 'notes'); if (!record) return h.refuse(UNREADABLE);
      const id = newNoteId(), title = action.title?.trim() || undefined, words = action.text.replace(/\r\n?/g, '\n').trim();
      if (record.notes.some(n => n.kind === 'inbox' && n.body === words)) return h.refuse('These words are already in your notes inbox.');
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Note${title ? `: ${short(title)}` : ' for your inbox'}`, lines: [`“${short(words.replace(/\s+/g, ' '), 140)}”`, 'Lands in Notes → Inbox to file later, marked as from NOVA', 'Undo removes it again'], where: 'Notes → Inbox', day: null, estimate: false},
        write: () => ({}), undo: null, ak: {button: 'Keep the note'},
        device: {key: NOTES_KEY, patch: {capture: {id, text: words, ...(title ? {title} : {}), day: today, now: at}}, label: 'Note kept in your inbox',
          undo: {patch: {remove: {id, createdAt: at}}, label: 'Remove the note'}}}};
    }
    case 'file-note': {
      const record = read(env, 'notes'); if (!record) return h.refuse(UNREADABLE);
      const one = <T extends {id: string}>(list: readonly T[], named: string, name: (x: T) => string) => { const key = fold(named), byId = list.filter(x => x.id === named.trim()); if (byId.length) return byId; const exact = list.filter(x => fold(name(x)) === key); return exact.length ? exact : list.filter(x => fold(name(x)).includes(key)); };
      const inbox = one(record.notes.filter(n => n.kind === 'inbox'), action.note, noteName);
      if (inbox.length !== 1) return h.refuse(inbox.length ? `More than one note in your inbox matches "${short(action.note)}"; name it exactly.` : `No note in your inbox is called "${short(action.note)}".`);
      const note = inbox[0]!;
      let target: FileTarget, where: string, createdDaily: string | null = null;
      if (action.to === 'daily') {
        const day = h.resolveDay(action.day ?? 'today', today, today); if (!day.ok) return h.refuse(day.message);
        target = {kind: 'daily', day: day.day}; where = `the daily note of ${formatDate(day.day)}`;
        if (!record.notes.some(n => n.kind === 'daily' && n.day === day.day)) createdDaily = day.day;
      } else if (action.to === 'topic') { target = {kind: 'topic', title: action.title!}; where = `a new note, "${short(action.title!)}"`; }
      else if (action.to === 'goal') { const g = goalNamed(env, h, action.name!); if (!g.ok) return h.refuse(g.message); target = {kind: 'goal', name: g.name}; where = `beside your goal ${g.name} (a link to it)`; }
      else if (action.to === 'habit') { const found = h.habitOf(env, action.name!); if (!found.ok) return h.refuse(found.message); target = {kind: 'habit', name: found.habit.title}; where = `beside your habit ${found.habit.title} (a link to it)`; }
      else {
        const into = one(record.notes.filter(n => n.kind !== 'inbox'), action.name!, noteName);
        if (into.length !== 1) return h.refuse(into.length ? `More than one note matches "${short(action.name!)}"; name it exactly.` : `No note is called "${short(action.name!)}".`);
        target = {kind: 'note', id: into[0]!.id}; where = `your note "${short(noteName(into[0]!))}"`;
      }
      let filed: ReturnType<typeof fileNote>;
      try { filed = fileNote(record, note.id, target, at); } catch (e) { return h.refuse(e instanceof Error ? e.message : 'That note cannot be filed there.'); }
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `File: ${short(noteName(note))}`, lines: [`Into ${where}`, 'It leaves the inbox; its words are kept as they are', 'Undo puts it back in the inbox while nothing changed since'], where: 'Notes', day: null, estimate: false},
        write: () => ({}), undo: null, ak: {button: 'File it'},
        device: {key: NOTES_KEY, patch: {file: {id: note.id, target, now: at, expect: filed.undo.before, ...(createdDaily ? {dailyAbsent: true} : {})}}, label: `Filed: ${short(noteName(note))}`,
          undo: {patch: {unfile: {before: filed.undo.before, filedAt: at, ...(createdDaily ? {createdDaily} : {into: filed.into})}}, label: 'Put it back in the inbox'}}}};
    }
    case 'start-focus': {
      let goal: {id: string; name: string} | null = null;
      if (action.goal) { const g = goalNamed(env, h, action.goal); if (!g.ok) return h.refuse(g.message); goal = g; }
      const href = `/app/journey?focus=${action.minutes}${goal ? `&goal=${encodeURIComponent(goal.id)}` : ''}#focus`;
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Focus: ${action.minutes} minutes${goal ? ` for ${goal.name}` : ''}`, lines: ['Opens Focus sessions with this length chosen; the session starts on your own tap there',
        'ZIGoals only notices when that page is hidden (the web cannot block other apps)', 'Nothing is written until the session ends'], where: 'Journey → Focus sessions', day: null, estimate: false},
        write: () => ({}), undo: null, navigate: {href, label: 'Journey → Focus sessions'}, ak: {button: 'Open Focus'}}};
    }
    // Owner follow-up 2 (G8): BUILD list 2's cards, in the same chunk (plan-g1.ts).
    default: return planG1Action(action, env, h);
  }
}
