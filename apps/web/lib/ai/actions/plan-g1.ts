import {HEALTH_NUMBERS, HEALTH_NUMBERS_KEY, MAX_NUMBERS, type HealthNumbers} from '../../health-numbers/store';
import {BP_LINE, LIMIT_MESSAGE, bpEntry} from '../../health-numbers/engine';
import {SCALES, SCALES_KEY, type Scales} from '../../scales/store';
import {valueWords} from '../../scales/engine';
import {TASKS, TASKS_KEY, type Task, type Tasks} from '../../tasks/schema';
import {openTasks, taskState} from '../../tasks/engine';
import {tomorrowOf} from '../../wrap-up-tasks/move';
import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import {formatDate} from '../../visual-format';
import './g1-writes';
import './nova-writes';
import type {AaHelpers} from './plan-aa';
import type {Env, PlanResult} from './plan';
import type {Action} from './schema';

/**
 * Owner follow-up 2 (G8, "tools for G1"): the planner's cases for BUILD list 2's cards, in the lazy planner chunk beside
 * plan-nova.ts. Every card is `target: 'form'`: never batched, never automatic (auto-accept's never list), and each
 * carries its Undo (`device.undo`, applied by device-undo.ts through g1-writes.ts or nova-writes.ts). A scale or a task is
 * named by the reply and matched against the person's own records on the device (exactly one, never a guess); a record
 * that cannot be read proposes nothing. The blood pressure card says the numbers as given and nothing about them.
 */
export type G1Records = {healthNumbers?: HealthNumbers | null; scales?: Scales | null; tasks?: Tasks | null};
const UNREADABLE = 'The records for this card cannot be read on this device, so nothing was proposed.';
const SPECS: {[K in keyof G1Records]-?: DeviceRecordSpec<NonNullable<G1Records[K]>>} = {healthNumbers: HEALTH_NUMBERS, scales: SCALES, tasks: TASKS};
function read<K extends keyof G1Records>(env: Env, key: K): NonNullable<G1Records[K]> | null {
  const given = (env.akRecords as {nova?: G1Records} | undefined)?.nova;
  if (given && key in given) return (given[key] ?? null) as NonNullable<G1Records[K]> | null;
  try { const r = readDeviceRecord(getAppStorage(), SPECS[key] as DeviceRecordSpec<unknown>); return r.unreadable ? null : r.data as NonNullable<G1Records[K]>; } catch { return null; }
}
const fold = (s: string) => s.normalize('NFC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
const short = (s: string, n = 60) => s.length > n ? `${s.slice(0, n - 1)}…` : s;
/** Exactly one of the list by its name: the same name first, then a name that holds the words. */
function oneNamed<T>(list: readonly T[], named: string, name: (x: T) => string): {ok: true; item: T} | {ok: false; many: boolean} {
  const key = fold(named), exact = list.filter(x => fold(name(x)) === key), near = exact.length ? exact : list.filter(x => fold(name(x)).includes(key));
  return near.length === 1 ? {ok: true, item: near[0]!} : {ok: false, many: near.length > 1};
}
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function planG1Action(action: Action, env: Env, h: AaHelpers): PlanResult | null {
  const today = env.habitDay;
  switch (action.kind) {
    case 'log-blood-pressure': {
      const record = read(env, 'healthNumbers'); if (!record) return h.refuse(UNREADABLE);
      if (record.entries.length >= MAX_NUMBERS) return h.refuse(LIMIT_MESSAGE);
      const day = h.resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return h.refuse(day.message);
      let entry: ReturnType<typeof bpEntry>;
      try { entry = bpEntry({date: day.day, systolic: String(action.systolic), diastolic: String(action.diastolic), ...(action.pulse !== undefined ? {pulse: String(action.pulse)} : {}), ...(action.note ? {note: action.note} : {})}, newId('bp'), env.healthDay); }
      catch (e) { return h.refuse(e instanceof Error ? e.message : 'That reading cannot be kept.'); }
      if (record.entries.some(e => e.kind === 'bp' && e.date === entry.date && e.systolic === entry.systolic && e.diastolic === entry.diastolic && e.pulse === entry.pulse)) return h.refuse(`${entry.systolic}/${entry.diastolic} is already among your readings for ${h.dayLabel(entry.date, env.healthDay)}.`);
      const reading = `${entry.systolic}/${entry.diastolic} mmHg`;
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Blood pressure: ${reading}`, lines: [`${entry.pulse !== undefined ? `Pulse ${entry.pulse} a minute, ` : ''}${h.dayLabel(entry.date, env.healthDay)}`,
        ...(entry.note ? [`Note: ${short(entry.note, 120)}`] : []), BP_LINE, 'Kept in Health → Your numbers on this device; Undo removes it again'], where: 'Health → Your numbers', day: entry.date, estimate: false},
        write: () => ({}), undo: null, healthContent: true, ak: {button: 'Keep the reading'},
        device: {key: HEALTH_NUMBERS_KEY, patch: {add: {entry}}, label: `Blood pressure kept: ${reading}`, undo: {patch: {remove: {id: entry.id, date: entry.date}}, label: 'Remove the reading'}}}};
    }
    case 'rate-scale': {
      const record = read(env, 'scales'); if (!record) return h.refuse(UNREADABLE);
      if (!record.scales.length) return h.refuse('You have no scales in your check-in yet. Add one in the Journal (Your own scales), then rate it.');
      const found = oneNamed(record.scales, action.scale, s => s.name);
      if (!found.ok) return h.refuse(found.many ? `More than one scale matches "${short(action.scale)}"; name it exactly.` : `No scale of yours is called "${short(action.scale)}". Your scales: ${record.scales.map(s => s.name).join(', ')}.`);
      const scale = found.item, day = h.resolveDay(action.day, today, today); if (!day.ok) return h.refuse(day.message);
      const before = record.days[day.day]?.[scale.id] ?? null;
      if (before === action.value) return h.refuse(`${scale.name} is already rated ${action.value} for ${h.dayLabel(day.day, today)}.`);
      const words = valueWords(scale, action.value);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `${scale.name}: ${action.value} of 5${words === `${action.value} of 5` ? '' : ` (${words})`}`,
        lines: [`${h.dayLabel(day.day, today)}${before !== null ? `, instead of ${before}` : ''}`, `Your words: 1 = ${scale.low}, 5 = ${scale.high}`, 'Undo puts the day back as it was'], where: 'Journal → Your own scales', day: day.day, estimate: false},
        write: () => ({}), undo: null, ak: {button: 'Rate it'},
        device: {key: SCALES_KEY, patch: {rate: {day: day.day, id: scale.id, value: action.value, before}}, label: `${scale.name} rated ${action.value}`,
          undo: {patch: {restore: {day: day.day, id: scale.id, value: action.value, before}}, label: 'Put the rating back'}}}};
    }
    case 'move-task': {
      const record = read(env, 'tasks'); if (!record) return h.refuse(UNREADABLE);
      // The wrap-up's own list first (due today or overdue), then any open task.
      const open = openTasks(record, today), dueNow = open.filter(t => { const s = taskState(t, today); return s === 'today' || s === 'overdue'; });
      let found = oneNamed(dueNow, action.task, t => t.title);
      if (!found.ok && !found.many) found = oneNamed(open, action.task, t => t.title);
      if (!found.ok) return h.refuse(found.many ? `More than one open task matches "${short(action.task)}"; name it exactly.` : `No open task of yours is called "${short(action.task)}".`);
      const task: Task = found.item, tomorrow = tomorrowOf(today), due = action.to === 'tomorrow' ? tomorrow : null;
      if (due && task.due === due) return h.refuse(`"${short(task.title)}" is already due tomorrow.`);
      if (!due && !task.due) return h.refuse(`"${short(task.title)}" has no day already; it stays in your tasks.`);
      const from = task.due ? `${task.due < today ? 'due since' : 'due'} ${formatDate(task.due)}` : 'no day';
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: due ? `Move to tomorrow: ${short(task.title)}` : `Let it go for now: ${short(task.title)}`,
        lines: due ? [`From ${from} to ${formatDate(tomorrow)}; its time, priority and goal stay`, 'Undo puts it back as it was'] : [`From ${from} to no day: it stays in Tasks${task.time ? ' (its time goes with the day)' : ''}`, 'Undo puts it back as it was'],
        where: 'Tasks', day: due, estimate: false},
        write: () => ({}), undo: null, ak: {button: due ? 'Move it' : 'Let it go'},
        device: {key: TASKS_KEY, patch: {move: {id: task.id, due, expect: task}}, label: due ? `Moved to tomorrow: ${short(task.title)}` : `Let go for now: ${short(task.title)}`,
          undo: {patch: {restore: {before: task, due}}, label: 'Put the task back'}}}};
    }
    default: return null;
  }
}
