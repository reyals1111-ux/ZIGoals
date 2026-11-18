import {habitRows} from '../../../ai/local-answers/exact/habits';
import {previousPeriod, resolvePeriod, type Period} from '../../../ai/local-answers/exact/period';
import type {Habit} from '../../../habits';
import {addLocalDays} from '../../../local-date';
import {DONE_KEEP_DAYS, type Tasks} from '../../../tasks/schema';
import {formatDate} from '../../../visual-format';
import {taskLoad, type DoneDay} from './day-tasks';

/**
 * Session AS (ADR-042 Part 2, family: radar and scanner; addition A3): "how am I doing" as facts beside the person's own
 * past. Never a score, a grade or a judgement: each spoke is one count from the records, this period and the same days
 * of the period before (lib/ai/local-answers/exact/period.ts `previousPeriod`), each said in words.
 * - `lifeRadar`: four spokes — the share of due habit check-ins done, the tasks finished, the minutes focused and the
 *   share of Checklist dots done. A share is its own scale (0–100 %); a count is drawn against the larger of its two
 *   periods. A spoke whose record was not given, or that holds nothing for the period, is unknown (null), never zero.
 * - `dayScan`: today across what the Today switch covers — habits done and open, tasks open and overdue, focus minutes
 *   and the agenda's items left. A part that was not given is left out.
 */
type Session = {day: string; focusedSeconds: number};
export type LifeInput = {
  habits?: readonly Habit[] | null;
  tasks?: Tasks | null;
  focus?: readonly Session[] | null;
  /** The Checklist's day history as counts (`zigoals:checklist-days:v1` `days`) and today's live count. */
  checklist?: {days: Readonly<Record<string, {done: number; total: number}>>; today?: {date: string; done: number; total: number} | null} | null;
};
export type SpokeSide = {value: number | null; /** 0–1 along the spoke; null: unknown. */ share: number | null; text: string; /** The count behind it (check-ins done, tasks, minutes, dots) and, for a share, what it is of. */ n?: number; of?: number};
export type Spoke = {key: 'habits' | 'tasks' | 'focus' | 'checklist'; label: string; /** This period as a figure and words ("11" "of 11" "habit check-ins done"). */ figure: string; unit: string; words: string; now: SpokeSide; before: SpokeSide};
export type RadarView = {period: Period; before: Period | null; spokes: Spoke[]; /** Spokes with a figure for this period. */ known: number; beforeWords: string | null};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const UNKNOWN: SpokeSide = {value: null, share: null, text: 'Nothing recorded'};
export function lifeRadar(input: LifeInput, period: Period, today: string, doneDay: DoneDay): RadarView {
  const before = previousPeriod(period, today), keptFrom = addLocalDays(today, -DONE_KEEP_DAYS);
  const ratio = (done: number, due: number, what: string): SpokeSide => due ? {value: done / due, share: done / due, text: `${done} of ${due} ${what}`, n: done, of: due} : UNKNOWN;
  const habits = (p: Period | null): SpokeSide => {
    if (!input.habits || !p) return UNKNOWN;
    const rows = habitRows(input.habits, p, today), done = rows.reduce((n, r) => n + r.T.done, 0), due = rows.reduce((n, r) => n + r.T.due - r.T.open - r.T.skipped, 0);
    return ratio(done, due, 'due check-ins done');
  };
  // Nothing kept at all (no task, no session) is unknown, not a count of zero.
  const tasks = (p: Period | null): number | null => !input.tasks?.tasks.length || !p || p.from < keptFrom ? null : input.tasks.tasks.filter(t => { const d = t.doneAt ? doneDay(t.doneAt) : null; return !!d && d >= p.from && d <= p.to; }).length;
  const focus = (p: Period | null): number | null => !input.focus?.length || !p ? null : Math.round(input.focus.filter(s => s.day >= p.from && s.day <= p.to).reduce((n, s) => n + s.focusedSeconds, 0) / 60);
  const checklist = (p: Period | null): SpokeSide => {
    if (!input.checklist || !p) return UNKNOWN;
    let done = 0, total = 0;
    for (const day of p.days) {
      const live = input.checklist.today?.date === day ? input.checklist.today : null, kept = live ?? input.checklist.days[day];
      if (kept) { done += kept.done; total += kept.total; }
    }
    return ratio(done, total, 'Checklist dots done');
  };
  const counted = (a: number | null, b: number | null, text: (n: number) => string): [SpokeSide, SpokeSide] => {
    const top = Math.max(a ?? 0, b ?? 0, 1), side = (n: number | null): SpokeSide => n === null ? UNKNOWN : {value: n, share: n / top, text: text(n), n};
    return [side(a), side(b)];
  };
  const h = habits(period), hb = habits(before), c = checklist(period), cb = checklist(before);
  const t = tasks(period), f = focus(period), [tNow, tBefore] = counted(t, tasks(before), n => `${plural(n, 'task')} done`), [fNow, fBefore] = counted(f, focus(before), n => `${plural(n, 'minute')} focused`);
  const spokes: Spoke[] = [
    {key: 'habits', label: 'Habits', figure: h.share === null ? '—' : String(h.n), unit: h.share === null ? '' : `of ${h.of}`, words: 'habit check-ins done', now: h, before: hb},
    {key: 'tasks', label: 'Tasks', figure: t === null ? '—' : String(t), unit: '', words: t === 1 ? 'task done' : 'tasks done', now: tNow, before: tBefore},
    {key: 'focus', label: 'Focus', figure: f === null ? '—' : String(f), unit: 'min', words: 'focused', now: fNow, before: fBefore},
    {key: 'checklist', label: 'Checklist', figure: c.share === null ? '—' : String(c.n), unit: c.share === null ? '' : `of ${c.of}`, words: 'Checklist dots done', now: c, before: cb},
  ];
  return {period, before, spokes, known: spokes.filter(s => s.now.share !== null).length,
    beforeWords: before ? (before.from === before.to ? formatDate(before.from, {year: false}) : `${formatDate(before.from, {year: false})} – ${formatDate(before.to, {year: false})}`) : null};
}

export type Pip = 'lit' | 'open' | 'late';
export type ScanLane = {key: 'habits' | 'tasks' | 'focus' | 'agenda'; label: string; figure: string; unit: string; words: string; text: string; pips: Pip[]; /** Marks beyond the pips drawn. */ more: number; /** The lane's own counts, by name. */ counts: Readonly<Record<string, number>>};
export type ScanInput = Pick<LifeInput, 'habits' | 'tasks' | 'focus'> & {agenda?: readonly {state: 'done' | 'skipped' | 'open'}[] | null};
export const SCAN_PIPS = 14;
export function dayScan(input: ScanInput, today: string, clock?: string): ScanLane[] {
  const lanes: ScanLane[] = [];
  const pips = (groups: readonly (readonly [Pip, number])[]) => { const all = groups.flatMap(([kind, n]) => Array.from({length: Math.max(0, n)}, () => kind)); return {pips: all.slice(0, SCAN_PIPS), more: Math.max(0, all.length - SCAN_PIPS)}; };
  if (input.habits) {
    const rows = habitRows(input.habits, resolvePeriod('today', today)!, today), skipped = rows.filter(r => r.T.skipped > 0).length, due = rows.length - skipped;
    const done = rows.filter(r => r.T.done > 0).length, open = rows.filter(r => r.T.open > 0).length;
    if (rows.length) lanes.push({key: 'habits', label: 'Habits', figure: String(done), unit: `of ${due}`, words: 'habits done today', text: `${done} of ${due} done, ${open} open${skipped ? `, ${skipped} skipped` : ''}`, counts: {done, due, open, skipped}, ...pips([['lit', done], ['open', due - done]])});
  }
  if (input.tasks && input.tasks.tasks.length) {
    const load = taskLoad(input.tasks, today, clock);
    lanes.push({key: 'tasks', label: 'Tasks', figure: String(load.open), unit: 'open', words: load.open === 1 ? 'open task' : 'open tasks', text: `${load.open} open, ${load.overdue} overdue`, counts: {open: load.open, overdue: load.overdue}, ...pips([['late', load.overdue], ['open', load.open - load.overdue]])});
  }
  if (input.focus && input.focus.length) {
    const mine = input.focus.filter(s => s.day === today), minutes = Math.round(mine.reduce((n, s) => n + s.focusedSeconds, 0) / 60);
    lanes.push({key: 'focus', label: 'Focus', figure: String(minutes), unit: 'min', words: 'focused today', text: mine.length ? `${plural(minutes, 'minute')} in ${plural(mine.length, 'session')}` : 'No session yet today', counts: {minutes, sessions: mine.length}, ...pips([['lit', mine.length]])});
  }
  if (input.agenda && input.agenda.length) {
    const total = input.agenda.length, done = input.agenda.filter(i => i.state === 'done').length, left = input.agenda.filter(i => i.state === 'open').length;
    lanes.push({key: 'agenda', label: 'Agenda', figure: String(left), unit: `of ${total}`, words: left === 1 ? 'agenda item left' : 'agenda items left', text: `${left} of ${plural(total, 'item')} left, ${done} done`, counts: {total, done, left}, ...pips([['lit', done], ['open', left]])});
  }
  return lanes;
}
