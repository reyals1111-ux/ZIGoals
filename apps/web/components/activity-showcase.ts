/**
 * Session AL fourth pass (PR-066, PR-099, N-170, D-227): in the Showcase, Activity said "Showcase example history" once
 * above the whole list, so the person's own new goal read as fictional too, and every seeded row said "Added by you".
 * Each row now says which it is: the Showcase's own example records are named from the Showcase's records themselves
 * (the same deterministic build the Showcase loaded), and anything the person adds keeps its own source.
 */
import {HABITS_KEY} from '../lib/habits';
import {AVERAGE_GOALS_KEY} from '../lib/average-goals/store';

export const SHOWCASE_ROW_SOURCE = 'Showcase example';
/** Prefixes the Activity feed puts before a record's own id. */
// Fifth pass (D-227): Health counters, nights and naps and tasks were "Counted by you" / "Private · this browser" /
// "Added by you" in the Showcase; their rows carry these prefixes (a repeating task's done row adds `:<when>`, a habit's
// paused or archived row `:<from>`).
const PREFIXES = ['contribution:', 'created:', 'account-payment:', 'account-balance:', 'average-created:', 'average-finished:', 'counter:', 'sleep:', 'task-added:', 'task-done:', 'habit-state:'];

/** Every record id in the Showcase's records, plus the composite ids Activity gives a habit day and an average day. */
export function showcaseRowIds(records: Readonly<Record<string, string>>): Set<string> {
  const ids = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) { for (const v of value) walk(v); return; }
    if (!value || typeof value !== 'object') return;
    for (const [k, v] of Object.entries(value)) { if (k === 'id' && typeof v === 'string') ids.add(v); else walk(v); }
  };
  for (const raw of Object.values(records)) { try { walk(JSON.parse(raw)); } catch { /* not JSON: no ids */ } }
  const read = (key: string) => { try { return JSON.parse(records[key] ?? 'null') as Record<string, unknown> | null; } catch { return null; } };
  const habits = read(HABITS_KEY)?.habits;
  if (Array.isArray(habits)) for (const h of habits as {id?: string; entries?: {date?: string}[]}[]) for (const e of h.entries ?? []) if (h.id && e.date) ids.add(`habit:${h.id}:${e.date}`);
  const averages = read(AVERAGE_GOALS_KEY)?.goals;
  if (Array.isArray(averages)) for (const g of averages as {id?: string; entries?: {day?: string}[]}[]) for (const e of g.entries ?? []) if (g.id && e.day) ids.add(`average-day:${g.id}:${e.day}`);
  return ids;
}

/** True when an Activity row is one of the Showcase's example records. */
export function isShowcaseRow(eventId: string, ids: ReadonlySet<string>): boolean {
  if (ids.has(eventId)) return true;
  const prefix = PREFIXES.find(p => eventId.startsWith(p));
  if (!prefix) return false;
  const rest = eventId.slice(prefix.length);
  return ids.has(rest) || ((prefix === 'task-done:' || prefix === 'habit-state:') && ids.has(rest.split(':')[0] ?? ''));
}

type GoalRecords = {
  contributions: readonly {id: string; goalId: string; goalScope?: string}[];
  goalHistory: readonly {id: string; goalId: string; kind: string}[];
  goals: readonly {id: string; lifecycle?: readonly {id: string; kind: string}[]}[];
};
/**
 * Fifth pass (D-227): "Target reached · My first 0.1 BTC" read "Your goal’s history" in the Showcase. A seeded goal that is
 * already at its target gets its completion row from the first valuation tick after loading (a new id), so the row is the
 * example's own when the goal is seeded and the person has changed nothing on it (no contribution, history or lifecycle
 * row of their own besides that completion).
 */
export function isShowcaseGoalCompletion(eventId: string, goalId: string, s: GoalRecords, ids: ReadonlySet<string>): boolean {
  if (!ids.has(goalId) || !eventId.startsWith('lifecycle:')) return false;
  const goal = s.goals.find(g => g.id === goalId);
  if (goal?.lifecycle?.find(l => l.id === eventId)?.kind !== 'completed') return false;
  const own = s.contributions.some(c => c.goalId === goalId && c.goalScope !== 'local' && !ids.has(c.id))
    || s.goalHistory.some(h => h.goalId === goalId && h.kind !== 'valuation' && !ids.has(h.id))
    || (goal.lifecycle ?? []).some(l => l.kind !== 'completed' && !ids.has(l.id));
  return !own;
}
