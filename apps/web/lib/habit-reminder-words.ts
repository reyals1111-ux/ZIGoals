/**
 * Session AV lane 2 (health r3; LEDGER #275, Way of Life's reminders with custom messages): a habit reminder in the
 * person's own words ("Shoes by the door?"), up to 80 characters, and up to two more reminder times a day, kept as
 * `reminderMore` ({habitId: {words?, times?}}) in the loose habit extras (`zigoals:habit-extras:v1`). Checked where read:
 * anything else reads as nothing. No schema module, so Today's reminder cards can read it cheaply. Pure.
 *
 * The words are the person's own, so a notification shows them only where names are allowed (as a habit's name is), and
 * never for a habit that ticks itself off from Health; in the app, Today's reminder card shows them.
 */
export const REMINDER_WORDS_MAX = 80, MORE_TIMES_MAX = 2, MAX_REMINDER_MORE = 400;
export type ReminderMore = {words?: string; times: string[]};
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
// Letters or numbers somewhere (a line of spaces or invisible marks reads as none).
const VISIBLE = /[\p{L}\p{N}\p{So}]/u;

export function reminderMoreOf(extras: unknown, habitId: string): ReminderMore {
  const all = (extras as {reminderMore?: unknown} | null | undefined)?.reminderMore;
  if (!all || typeof all !== 'object' || !Object.hasOwn(all, habitId)) return {times: []};
  const raw = (all as Record<string, unknown>)[habitId] as {words?: unknown; times?: unknown} | null;
  if (!raw || typeof raw !== 'object') return {times: []};
  const words = typeof raw.words === 'string' && raw.words.trim().length <= REMINDER_WORDS_MAX && VISIBLE.test(raw.words) ? raw.words.trim() : undefined;
  const times = Array.isArray(raw.times) ? [...new Set(raw.times.filter((t): t is string => typeof t === 'string' && CLOCK.test(t)))].sort().slice(0, MORE_TIMES_MAX) : [];
  return {...(words ? {words} : {}), times};
}
export type ReminderMoreIssue = {field: 'words' | 'times'; message: string};
/** Reads the editor's words and extra times; the reason is said under the field instead of thrown. */
export function readReminderMore(wordsText: string, timeTexts: readonly string[], baseTime: string): {ok: true; value: ReminderMore} | {ok: false; issue: ReminderMoreIssue} {
  const words = wordsText.trim();
  if (words.length > REMINDER_WORDS_MAX) return {ok: false, issue: {field: 'words', message: `Keep the line to ${REMINDER_WORDS_MAX} characters or fewer.`}};
  if (words && !VISIBLE.test(words)) return {ok: false, issue: {field: 'words', message: 'Type a line with letters or numbers, or leave it blank.'}};
  const filled = timeTexts.map(t => t.trim()).filter(Boolean);
  if (filled.some(t => !CLOCK.test(t))) return {ok: false, issue: {field: 'times', message: 'Enter each time like 07:30, or leave it blank.'}};
  if (filled.length > MORE_TIMES_MAX) return {ok: false, issue: {field: 'times', message: `Up to ${MORE_TIMES_MAX} more times a day.`}};
  const times = [...new Set(filled)].filter(t => t !== baseTime).sort();
  return {ok: true, value: {...(words ? {words} : {}), times}};
}
/** The extras with this habit's words and times set (or removed when both are empty); the others kept, at most 400. */
export function withReminderMore<T extends object>(extras: T, habitId: string, more: ReminderMore | null): T {
  const raw = (extras as {reminderMore?: unknown}).reminderMore, all: Record<string, ReminderMore> = {};
  if (raw && typeof raw === 'object') for (const k of Object.keys(raw as object)) { if (k === habitId || k === '__proto__') continue; const m = reminderMoreOf({reminderMore: raw}, k); if (m.words || m.times.length) all[k] = m; }
  if (more && (more.words || more.times.length)) {
    if (Object.keys(all).length >= MAX_REMINDER_MORE) throw new Error(`Up to ${MAX_REMINDER_MORE} habits can have their own reminder words.`);
    all[habitId] = {...(more.words ? {words: more.words.trim()} : {}), times: [...more.times]};
  }
  const {reminderMore: _drop, ...rest} = extras as T & {reminderMore?: unknown}; void _drop;
  return (Object.keys(all).length ? {...rest, reminderMore: all} : rest) as T;
}
/** Today's reminder card: the habit's own line, read straight from the stored extras text (null when none or unreadable). */
export function reminderWordsIn(rawExtras: string | null, habitId: string): string | null {
  if (!rawExtras) return null;
  try { return reminderMoreOf(JSON.parse(rawExtras), habitId).words ?? null; } catch { return null; }
}
