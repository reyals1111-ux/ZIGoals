import {addLocalDays} from '../local-date';
import {formatDate} from '../visual-format';
import {PROJECT_NAME_MAX, type Tasks} from './schema';
import {MAX_REPEATS, applyTemplate, taskTemplatesSchema, type ProjectRepeat, type RepeatEvery, type TaskTemplates, type TemplateItem} from './templates';

/**
 * Session AV lane 2 (rest, LEDGER #17; Things' repeating projects): a project made from a template comes round by itself,
 * every week or month from its first day, or every few days. The project for the current period is made when Tasks
 * opens (one per period; never for periods missed while it was closed; never twice: `lastMade`), named with the period's
 * first day ("Weekly reset · Nov 30, 2026") and with its days counted from that day. Modelled on the repeating notes
 * (lib/notes/schedules.ts). Pure: records in, records out.
 */
const pad = (n: number) => String(n).padStart(2, '0');
const between = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const stepOf = (r: Pick<ProjectRepeat, 'every' | 'days'>) => r.every === 'week' ? 7 : r.every === 'days' ? Math.min(365, Math.max(2, r.days ?? 2)) : 0;
const monthDay = (start: string) => Math.min(28, Number(start.slice(8, 10)));
const monthOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** The first day of the period `today` is in, or null before the repeat's first day. */
export function repeatPeriod(r: Pick<ProjectRepeat, 'every' | 'days' | 'start'>, today: string): string | null {
  if (today < r.start) return null;
  const step = stepOf(r);
  if (step) return addLocalDays(r.start, Math.floor(between(r.start, today) / step) * step);
  const d = monthDay(r.start), y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
  const candidate = Number(today.slice(8, 10)) >= d ? monthOf(y, m, d) : m === 1 ? monthOf(y - 1, 12, d) : monthOf(y, m - 1, d);
  return candidate < r.start ? r.start : candidate;
}
/** The day the next project comes round (after today's period). */
export function nextRepeat(r: Pick<ProjectRepeat, 'every' | 'days' | 'start'>, today: string): string {
  const now = repeatPeriod(r, today);
  if (!now) return r.start;
  const step = stepOf(r);
  if (step) return addLocalDays(now, step);
  const d = monthDay(r.start), y = Number(now.slice(0, 4)), m = Number(now.slice(5, 7));
  return m === 12 ? monthOf(y + 1, 1, d) : monthOf(y, m + 1, d);
}
/** "every week", "every month", "every 10 days" (and the Dutch for NOVA's answers). */
export function repeatWords(r: Pick<ProjectRepeat, 'every' | 'days'>, lang: 'en' | 'nl' = 'en'): string {
  if (r.every === 'week') return lang === 'nl' ? 'elke week' : 'every week';
  if (r.every === 'month') return lang === 'nl' ? 'elke maand' : 'every month';
  return lang === 'nl' ? `elke ${stepOf(r)} dagen` : `every ${stepOf(r)} days`;
}
/**
 * The project's name for a period: the repeat's name and the period's first day, as the app writes days ("Weekly reset ·
 * Nov 30, 2026"; review b2a #7), within the project name limit. `legacyRepeatName` is the name older builds gave it
 * ("Weekly reset · 2026-11-30"), so a project made by one is never made twice.
 */
export const repeatProjectName = (r: Pick<ProjectRepeat, 'name'>, period: string) => { const day = formatDate(period).slice(0, 24); return `${r.name.trim().slice(0, PROJECT_NAME_MAX - 8 - day.length)} · ${day}`; }; // at most 55, as before
const legacyRepeatName = (r: Pick<ProjectRepeat, 'name'>, period: string) => `${r.name.trim().slice(0, PROJECT_NAME_MAX - 18)} · ${period}`;
export const repeatsOf = (record: Pick<TaskTemplates, 'repeats'>): ProjectRepeat[] => record.repeats ?? [];
/** The repeats whose project for the current period is still to be made. */
export const dueRepeats = (record: Pick<TaskTemplates, 'repeats'>, today: string) => repeatsOf(record).filter(r => {
  if (r.paused) return false;
  const period = repeatPeriod(r, today);
  return !!period && (!r.lastMade || r.lastMade < period);
});
export type RepeatInput = {name: string; every: RepeatEvery; days?: number; start: string; items: readonly TemplateItem[]};
export function repeatIssue(record: Pick<TaskTemplates, 'repeats'>, input: Pick<RepeatInput, 'name' | 'every' | 'days' | 'start'>): string | null {
  if (!input.name.trim()) return 'Give the repeating project a name.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start)) return 'Choose the day it starts.';
  if (input.every === 'days' && (!Number.isInteger(input.days) || input.days! < 2 || input.days! > 365)) return 'Repeat every 2 to 365 days.';
  if (repeatsOf(record).length >= MAX_REPEATS) return `Up to ${MAX_REPEATS} repeating projects. Stop one first.`;
  if (repeatsOf(record).some(r => r.name.trim().toLowerCase() === input.name.trim().toLowerCase())) return 'A project with that name already repeats.';
  return null;
}
/** Adds a repeat; `madeFor` is the period whose project was just made (so it is not made again on open). */
export function addRepeat(record: TaskTemplates, input: RepeatInput, {id, madeFor}: {id: string; madeFor?: string}): TaskTemplates {
  const issue = repeatIssue(record, input); if (issue) throw new Error(issue);
  const repeat = {id, name: input.name.trim().slice(0, PROJECT_NAME_MAX), every: input.every, ...(input.every === 'days' ? {days: input.days} : {}), start: input.start, ...(madeFor ? {lastMade: madeFor} : {}), items: [...input.items]};
  return taskTemplatesSchema.parse({...record, repeats: [...repeatsOf(record), repeat]});
}
export const pauseRepeat = (record: TaskTemplates, id: string, paused: boolean): TaskTemplates => taskTemplatesSchema.parse({...record,
  repeats: repeatsOf(record).map(r => r.id !== id ? r : paused ? {...r, paused: true} : (({paused: _p, ...rest}) => { void _p; return rest; })(r))});
export function removeRepeat(record: TaskTemplates, id: string): {record: TaskTemplates; removed: ProjectRepeat | null; at: number} {
  const at = repeatsOf(record).findIndex(r => r.id === id);
  return {record: taskTemplatesSchema.parse({...record, repeats: repeatsOf(record).filter(r => r.id !== id)}), removed: at >= 0 ? repeatsOf(record)[at]! : null, at};
}
export function restoreRepeat(record: TaskTemplates, repeat: ProjectRepeat, at: number): TaskTemplates {
  if (repeatsOf(record).some(r => r.id === repeat.id)) return record;
  const list = [...repeatsOf(record)]; list.splice(Math.min(at, list.length), 0, repeat);
  return taskTemplatesSchema.parse({...record, repeats: list.slice(0, MAX_REPEATS)});
}
/**
 * Makes the due projects in `tasks` (a project of the same name already there counts as made) and marks each repeat's
 * period as made in `templates`. Returns both records and what was made.
 */
export function runRepeats(tasks: Tasks, templates: TaskTemplates, {today, at, ids}: {today: string; at: Date; ids: () => string}): {tasks: Tasks; templates: TaskTemplates; made: {repeat: ProjectRepeat; projectId: string; name: string}[]} {
  const due = dueRepeats(templates, today);
  if (!due.length) return {tasks, templates, made: []};
  let next = tasks; const made: {repeat: ProjectRepeat; projectId: string; name: string}[] = [];
  for (const r of due) {
    const period = repeatPeriod(r, today)!, name = repeatProjectName(r, period), names = new Set([name, legacyRepeatName(r, period)].map(x => x.toLowerCase()));
    if ((next.projects ?? []).some(p => names.has(p.name.toLowerCase()))) continue;
    const out = applyTemplate(next, {name: r.name, items: r.items}, {name, start: period, today, at, ids});
    next = out.record; made.push({repeat: r, projectId: out.projectId, name});
  }
  return {tasks: next, templates: markRepeats(templates, today), made};
}
/** Marks every due repeat's current period as made (the templates half of `runRepeats`, for the latest record). */
export function markRepeats(templates: TaskTemplates, today: string): TaskTemplates {
  const due = new Set(dueRepeats(templates, today).map(r => r.id));
  if (!due.size) return templates;
  return taskTemplatesSchema.parse({...templates, repeats: repeatsOf(templates).map(r => due.has(r.id) ? {...r, lastMade: repeatPeriod(r, today)!} : r)});
}
