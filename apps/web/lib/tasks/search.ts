import {addLocalDays} from '../local-date';
import {taskLevel, type Task, type TaskLevel, type Tasks} from './schema';
import {taskState} from './engine';

/**
 * Session AL (Part 8, P-LS-05 / LS-005, LS-047, LS-H47): finding tasks by words and simple operators, for the Tasks
 * page's filter field, its saved filters and the app's global search (lane L6 calls `searchTasks`). Pure apart from
 * `searchTasks`, which reads this device's record. Nothing is sent anywhere.
 *
 * The language (Todoist's, kept small):
 * - words: every word must appear in the title or notes, as a part of a word ("L1" finds "L11"); "quoted words" as typed;
 * - `#Home` a project, `@bills` a label, `p1`…`p4` (or `priority:high|medium|normal|low`), `goal:` a linked goal key;
 * - days: `today`, `tomorrow`, `overdue`, `no date`, `due:today`, `due:tomorrow`, `due:week` (the next 7 days),
 *   `due:2026-12-05`, `due before:2026-12-05`, `due after:…`; `recurring`, `subtask`, `done`;
 * - `&` / `and` between terms (also plain spaces), `|` / `or` between groups, `!` or `-` before a term negates it.
 */
type Pred = (t: Task) => boolean;
export type TaskSearchContext = {today: string; projectName?: (id: string) => string | undefined; nowClock?: string};
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LEVELS: Record<string, TaskLevel> = {high: 1, medium: 2, normal: 3, low: 4, urgent: 1, none: 3};

function term(raw: string, ctx: TaskSearchContext, record: Tasks): Pred | null {
  let word = raw.trim();
  if (!word) return null;
  let negate = false;
  if ((word.startsWith('!') || word.startsWith('-')) && word.length > 1) { negate = true; word = word.slice(1); }
  const low = fold(word);
  const pred = ((): Pred => {
    if (low.startsWith('"') && low.endsWith('"') && low.length > 2) { const phrase = low.slice(1, -1); return t => fold(`${t.title} ${t.notes ?? ''}`).includes(phrase); }
    if (low.startsWith('#') && low.length > 1) {
      const name = low.slice(1).replace(/_/g, ' ');
      if (name === 'inbox') return t => !t.projectId;
      const ids = new Set((record.projects ?? []).filter(p => fold(p.name) === name || fold(p.name).startsWith(name)).map(p => p.id));
      return t => !!t.projectId && ids.has(t.projectId);
    }
    if (low.startsWith('@') && low.length > 1) { const name = low.slice(1); return t => (t.labels ?? []).some(l => fold(l) === name || fold(l).startsWith(name)); }
    const p = /^p([1-4])$/.exec(low); if (p) return t => taskLevel(t) === Number(p[1]);
    const pr = /^priority:(\w+)$/.exec(low); if (pr && LEVELS[pr[1]!]) return t => taskLevel(t) === LEVELS[pr[1]!];
    if (low.startsWith('goal:') && low.length > 5) { const g = low.slice(5); return t => !!t.goal && fold(t.goal).includes(g); }
    if (low === 'today' || low === 'due:today') return t => !!t.due && t.due <= ctx.today && !t.doneAt;
    if (low === 'tomorrow' || low === 'due:tomorrow') return t => t.due === addLocalDays(ctx.today, 1);
    if (low === 'overdue' || low === 'due:overdue') return t => !t.doneAt && taskState(t, ctx.today, ctx.nowClock) === 'overdue';
    if (low === 'nodate' || low === 'no-date' || low === 'no_date' || low === 'due:none') return t => !t.due;
    if (low === 'due:week' || low === 'week') return t => !!t.due && t.due >= ctx.today && t.due <= addLocalDays(ctx.today, 7);
    const d = /^due:(\d{4}-\d{2}-\d{2})$/.exec(low); if (d) return t => t.due === d[1];
    const b = /^due(?:_|-)?before:(\d{4}-\d{2}-\d{2})$/.exec(low); if (b) return t => !!t.due && t.due < b[1]!;
    const a = /^due(?:_|-)?after:(\d{4}-\d{2}-\d{2})$/.exec(low); if (a) return t => !!t.due && t.due > a[1]!;
    if (low === 'recurring' || low === 'repeating') return t => !!t.recur;
    if (low === 'subtask' || low === 'subtasks') return t => !!t.parentId;
    if (low === 'done' || low === 'completed') return t => !!t.doneAt;
    if (low === 'open') return t => !t.doneAt;
    return t => fold(`${t.title} ${t.notes ?? ''}`).includes(low);
  })();
  return negate ? t => !pred(t) : pred;
}
/** Splits a query into OR groups of AND terms; "no date", "due before:" and quoted words stay one term. */
export function parseQuery(query: string): string[][] {
  const tidy = query.replace(/\bno date\b/gi, 'nodate').replace(/\bdue (before|after):/gi, 'due_$1:').replace(/\s+/g, ' ').trim();
  if (!tidy) return [];
  return tidy.split(/\s*(?:\||\bor\b)\s*/i).map(group => {
    const out: string[] = [];
    for (const m of group.matchAll(/[!-]?"[^"]*"|[^\s&]+/g)) { const w = m[0]; if (/^and$/i.test(w)) continue; out.push(w); }
    return out;
  }).filter(g => g.length);
}
/**
 * The tasks a query matches. By default only open ones, unless the query asks for `done`. Every term of a group must
 * match; any group may.
 */
export function matchTasks(record: Tasks, query: string, ctx: TaskSearchContext): Task[] {
  const groups = parseQuery(query);
  if (!groups.length) return [];
  const wantsDone = groups.some(g => g.some(w => /^(done|completed)$/i.test(w)));
  const preds = groups.map(g => g.map(w => term(w, ctx, record)).filter((p): p is Pred => !!p));
  return record.tasks.filter(t => (wantsDone || !t.doneAt) && preds.some(group => group.length > 0 && group.every(p => p(t))));
}
/** Whether a query uses an operator (so a search page can say "Tasks matching p1 & today"). */
export const hasOperator = (query: string) => /(^|\s)([#@!]|p[1-4]\b|due:|priority:|goal:|today\b|overdue\b|tomorrow\b|no date\b|recurring\b)|[&|]/i.test(query);

export type TaskSearchHit = {id: string; title: string; detail: string; href: string};
/**
 * For the global search (lane L6): the tasks on this device that match, as hits with the page that opens them. Reads the
 * app storage (the Showcase's in a Showcase tab); an unreadable record gives no hits. Up to `limit` hits.
 */
export async function searchTasks(query: string, {today, limit = 20, storage}: {today?: string; limit?: number; storage?: Pick<Storage, 'getItem'>} = {}): Promise<TaskSearchHit[]> {
  const {readTasks, tasksToday} = await import('./device');
  const record = readTasks(storage);
  if (!record || !query.trim()) return [];
  const day = today ?? tasksToday();
  const names = new Map((record.projects ?? []).map(p => [p.id, p.name]));
  return matchTasks(record, query, {today: day}).slice(0, limit).map(t => ({
    id: t.id, title: t.title,
    detail: ['Task', t.doneAt ? 'done' : t.due ? (t.due < day ? `overdue · ${t.due}` : t.due === day ? 'today' : t.due) : 'no date', t.projectId ? `#${names.get(t.projectId) ?? 'project'}` : 'Inbox', ...(t.labels ?? []).map(l => `@${l}`)].join(' · '),
    href: `/app/tasks?task=${encodeURIComponent(t.id)}`,
  }));
}
