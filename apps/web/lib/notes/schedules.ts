import {addLocalDays} from '../local-date';
import {MAX_SCHEDULES, MAX_TEMPLATE_BODY, SCHEDULE_TITLE_MAX, notesSchema, type Note, type NoteSchedule, type Notes, type ScheduleEvery} from './schema';
import {addTopic, checked} from './store';

/**
 * Session AV lane 2 (notes; LEDGER #32, Notion's repeating database templates): a note template that makes a new note
 * each day, week (on a weekday) or month (on a day of the month), and the words a new daily note starts from. Kept in
 * the notes record (`schedules`, `dailyTemplate`, additive). A schedule's note for the current period is made when Notes
 * opens (one per period, never for periods missed while it was closed, never twice: `lastMade`); its title is the
 * schedule's with the period's first day ("Week plan · 2026-11-23"); `{date}` in the words becomes that day. Pure.
 */
const pad = (n: number) => String(n).padStart(2, '0');
const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
/** The first day of the period `today` is in: today; the latest given weekday; the latest given day of the month. */
export function periodStart(s: Pick<NoteSchedule, 'every' | 'weekday' | 'monthDay'>, today: string): string {
  if (s.every === 'day') return today;
  if (s.every === 'week') { const w = s.weekday ?? 1; return addLocalDays(today, -((weekdayOf(today) - w + 7) % 7)); }
  const d = s.monthDay ?? 1, y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  if (Number(today.slice(8, 10)) >= d) return `${y}-${pad(m)}-${pad(d)}`;
  return m === 1 ? `${y - 1}-12-${pad(d)}` : `${y}-${pad(m - 1)}-${pad(d)}`;
}
export const scheduleTitle = (s: Pick<NoteSchedule, 'title'>, start: string) => `${s.title} · ${start}`.slice(0, 120);
export const scheduleBody = (s: Pick<NoteSchedule, 'body'>, start: string) => s.body.replace(/\{date\}/g, start);
const WEEKDAY_WORDS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** "every day", "every Monday", "on the 1st of every month". */
export function everyWords(s: Pick<NoteSchedule, 'every' | 'weekday' | 'monthDay'>): string {
  if (s.every === 'day') return 'every day';
  if (s.every === 'week') return `every ${WEEKDAY_WORDS[s.weekday ?? 1]}`;
  const d = s.monthDay ?? 1, th = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th';
  return `on the ${d}${th} of every month`;
}
export const schedulesOf = (record: Pick<Notes, 'schedules'>) => record.schedules ?? [];
/** The schedules whose note for the current period is still to be made. */
export const dueSchedules = (record: Pick<Notes, 'schedules'>, today: string) => schedulesOf(record).filter(s => !s.paused && s.lastMade !== periodStart(s, today));
/** Makes the due notes (a note of the same title already there counts as made); returns what was made. */
export function runSchedules(record: Notes, today: string, now: string): {record: Notes; made: Note[]} {
  const due = dueSchedules(record, today);
  if (!due.length) return {record, made: []};
  let next = record; const made: Note[] = [];
  for (const s of due) {
    const start = periodStart(s, today), title = scheduleTitle(s, start);
    if (!next.notes.some(n => n.kind === 'topic' && n.title === title)) { const out = addTopic(next, {title, body: scheduleBody(s, start), now}); next = out.record; made.push(out.note); }
    next = {...next, schedules: schedulesOf(next).map(x => x.id === s.id ? {...x, lastMade: start} : x)};
  }
  return {record: checked(next), made};
}
export const newScheduleId = () => `s-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)}`;
export type ScheduleInput = {title: string; body: string; every: ScheduleEvery; weekday?: number; monthDay?: number};
export function scheduleIssue(record: Pick<Notes, 'schedules'>, input: ScheduleInput, editing?: string): string | null {
  const t = input.title.trim();
  if (!t) return 'Give the repeating note a title.';
  if (t.length > SCHEDULE_TITLE_MAX) return `A title can be at most ${SCHEDULE_TITLE_MAX} characters.`;
  if (input.body.length > MAX_TEMPLATE_BODY) return `A template holds at most ${MAX_TEMPLATE_BODY.toLocaleString('en-US')} characters.`;
  if (!editing && schedulesOf(record).length >= MAX_SCHEDULES) return `Up to ${MAX_SCHEDULES} repeating notes. Remove one first.`;
  if (schedulesOf(record).some(s => s.id !== editing && s.title.toLowerCase() === t.toLowerCase())) return 'You have a repeating note with that title.';
  return null;
}
const shape = (input: ScheduleInput) => ({title: input.title.trim(), body: input.body, every: input.every, ...(input.every === 'week' ? {weekday: input.weekday ?? 1} : {}), ...(input.every === 'month' ? {monthDay: Math.min(28, Math.max(1, input.monthDay ?? 1))} : {})});
export function addSchedule(record: Notes, input: ScheduleInput, id = newScheduleId()): Notes {
  const issue = scheduleIssue(record, input); if (issue) throw new Error(issue);
  return notesSchema.parse({...record, schedules: [...schedulesOf(record), {id, ...shape(input)}]});
}
/** A changed schedule keeps its `lastMade` only while its period rule is the same (a new rule makes this period's note). */
export function changeSchedule(record: Notes, id: string, input: ScheduleInput): Notes {
  const old = schedulesOf(record).find(s => s.id === id); if (!old) throw new Error('That repeating note is no longer on this device.');
  const issue = scheduleIssue(record, input, id); if (issue) throw new Error(issue);
  const next = {id, ...shape(input)}, same = old.every === next.every && old.weekday === (next as {weekday?: number}).weekday && old.monthDay === (next as {monthDay?: number}).monthDay;
  return notesSchema.parse({...record, schedules: schedulesOf(record).map(s => s.id === id ? {...next, ...(same && old.lastMade ? {lastMade: old.lastMade} : {}), ...(old.paused ? {paused: true} : {})} : s)});
}
export const pauseSchedule = (record: Notes, id: string, paused: boolean): Notes => notesSchema.parse({...record, schedules: schedulesOf(record).map(s => s.id === id ? (paused ? {...s, paused: true} : (({paused: _p, ...rest}) => { void _p; return rest; })(s)) : s)});
export function removeSchedule(record: Notes, id: string): {record: Notes; removed: NoteSchedule | null; at: number} {
  const at = schedulesOf(record).findIndex(s => s.id === id);
  return {record: notesSchema.parse({...record, schedules: schedulesOf(record).filter(s => s.id !== id)}), removed: at >= 0 ? schedulesOf(record)[at]! : null, at};
}
export function restoreSchedule(record: Notes, s: NoteSchedule, at: number): Notes {
  if (schedulesOf(record).some(x => x.id === s.id)) return record;
  const list = [...schedulesOf(record)]; list.splice(Math.min(at, list.length), 0, s);
  return notesSchema.parse({...record, schedules: list.slice(0, MAX_SCHEDULES)});
}
/** The daily note template: the words a new daily note starts from (empty: none). */
export function withDailyTemplate(record: Notes, text: string): Notes {
  if (text.length > MAX_TEMPLATE_BODY) throw new Error(`A template holds at most ${MAX_TEMPLATE_BODY.toLocaleString('en-US')} characters.`);
  const {dailyTemplate: _d, ...rest} = record; void _d;
  return notesSchema.parse(text.trim() ? {...rest, dailyTemplate: text} : rest);
}
/** What a new daily note for `day` starts with: the template with `{date}` as that day. */
export const dailyStart = (record: Pick<Notes, 'dailyTemplate'>, day: string) => (record.dailyTemplate ?? '').replace(/\{date\}/g, day);
