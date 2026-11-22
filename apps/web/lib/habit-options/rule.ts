/**
 * Session AV lane 2 (habits; LEDGER #45, #49, #50, #52, #57 — Habitica's difficulty, Streaks' 2-day rule and unscheduled
 * tasks, Finch's Goal of the Day reward, Habitify's auto-skip): a habit's own options, chosen per habit and kept as the
 * optional `options` map ({habitId: {...}}) of the loose habit extras record (`zigoals:habit-extras:v1`; TIER 3 stored
 * format, additive: older builds keep the map through a read-modify-write and read every habit as before). The strict
 * synced habit record is unchanged. Each entry is checked here, where it is read, so one odd entry never makes the
 * record unreadable. Plain checks (no schema module), so the habits route's first chunk gains almost nothing. Pure.
 *
 * - `twoDay`: the streak itself keeps one missed day; two missed scheduled days in a row end it (opt-in; off, the streak
 *   breaks on any miss, as before, and "Never missed twice" stays the line beside it).
 * - `unloggedSkip`: a past scheduled day with nothing logged counts as skipped (neutral) instead of missed.
 * - `whenever`: no schedule: log it on any day; it is never due, never missed, never reminded.
 * - `difficulty`: the XP a completed day earns when the game layer is on (Easy is the 10 XP every habit earned before).
 */
export const DIFFICULTIES = ['trivial', 'easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_XP: Record<Difficulty, number> = {trivial: 5, easy: 10, medium: 15, hard: 20};
export const DIFFICULTY_WORDS: Record<Difficulty, {en: string; nl: string}> = {
  trivial: {en: 'Tiny', nl: 'Heel klein'}, easy: {en: 'Easy', nl: 'Makkelijk'}, medium: {en: 'Medium', nl: 'Gemiddeld'}, hard: {en: 'Hard', nl: 'Zwaar'},
};
/** Finch's Goal of the Day: the small bonus when today's focus habit is done (game layer on). */
export const FOCUS_BONUS_XP = 5;
export type HabitOptions = {twoDay?: true; unloggedSkip?: true; whenever?: true; difficulty?: Difficulty};
const MAX = 400, ID = /^[^\u0000-\u001f\u007f]{1,100}$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** One stored entry read safely: unknown fields are dropped from the reading (kept in storage), odd values ignored. */
export function readOption(raw: unknown): HabitOptions {
  if (!isObj(raw)) return {};
  const out: HabitOptions = {};
  if (raw.twoDay === true) out.twoDay = true;
  if (raw.unloggedSkip === true) out.unloggedSkip = true;
  if (raw.whenever === true) out.whenever = true;
  if (typeof raw.difficulty === 'string' && (DIFFICULTIES as readonly string[]).includes(raw.difficulty)) out.difficulty = raw.difficulty as Difficulty;
  return out;
}
/** Every habit's options from an extras record (or anything unreadable: none). */
export function readHabitOptions(extras: unknown): Record<string, HabitOptions> {
  const map = isObj(extras) ? extras.options : undefined, out: Record<string, HabitOptions> = {};
  if (!isObj(map)) return out;
  for (const [id, raw] of Object.entries(map).slice(0, MAX)) if (ID.test(id)) { const o = readOption(raw); if (Object.keys(o).length) out[id] = o; }
  return out;
}
export const optionsOf = (extras: unknown, habitId: string): HabitOptions => readHabitOptions(extras)[habitId] ?? {};
/**
 * The extras with one habit's options changed (`null`/`false` clears a field; an empty entry is removed). Every other
 * field of the record, and any field a later build added to this habit's entry, is kept. `keep` prunes ids the journal
 * no longer has.
 */
export function withHabitOptions<T extends object>(extras: T, habitId: string, patch: {twoDay?: boolean; unloggedSkip?: boolean; whenever?: boolean; difficulty?: Difficulty | null}, keep: ReadonlySet<string> | null = null): T {
  if (!ID.test(habitId)) throw new Error('This habit could not be found.');
  const map: Record<string, unknown> = {...(isObj((extras as {options?: unknown}).options) ? (extras as {options: Record<string, unknown>}).options : {})};
  const entry: Record<string, unknown> = {...(isObj(map[habitId]) ? map[habitId] as Record<string, unknown> : {})};
  for (const k of ['twoDay', 'unloggedSkip', 'whenever'] as const) if (k in patch) { if (patch[k]) entry[k] = true; else delete entry[k]; }
  if ('difficulty' in patch) { if (patch.difficulty && patch.difficulty !== 'easy') entry.difficulty = patch.difficulty; else delete entry.difficulty; }
  // A whenever habit has no due days, so "skipped when unlogged" and the two-day streak say nothing for it.
  if (entry.whenever === true) { delete entry.unloggedSkip; delete entry.twoDay; }
  if (Object.keys(entry).length) map[habitId] = entry; else delete map[habitId];
  for (const id of Object.keys(map)) if (keep && id !== habitId && !keep.has(id)) delete map[id];
  if (Object.keys(map).length > MAX) throw new Error('Too many habits remembered on this device.');
  const {options: _drop, ...rest} = extras as T & {options?: unknown}; void _drop;
  return (Object.keys(map).length ? {...rest, options: map} : rest) as T;
}
/**
 * The focus habit of each day (`focusDays`, {date: habitId}, the last 400 days), written beside today's `focus` so a past
 * day's focus bonus stays earned after the focus moves on. Read safely.
 */
export function readFocusDays(extras: unknown): Record<string, string> {
  const map = isObj(extras) ? extras.focusDays : undefined, out: Record<string, string> = {};
  if (!isObj(map)) return out;
  for (const [day, id] of Object.entries(map)) if (DAY.test(day) && typeof id === 'string' && ID.test(id)) out[day] = id;
  return out;
}
/** `focusDays` with `day` set to `habitId` (or cleared), at most the 400 latest days. */
export function withFocusDay(map: unknown, day: string, habitId: string | null): Record<string, string> | undefined {
  const next = readFocusDays({focusDays: map});
  if (habitId) next[day] = habitId; else delete next[day];
  const days = Object.keys(next).sort().slice(-MAX);
  return days.length ? Object.fromEntries(days.map(d => [d, next[d]!])) : undefined;
}
