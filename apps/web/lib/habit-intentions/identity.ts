import {habitDay, type Habit} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * Session AV lane 2 (r4-mind; LEDGER #323, Atoms' "the person behind the habits"): up to five lines in the person's own
 * words ("I am someone who moves every day"), each joined to the habits that serve it, with the ticks this week (Monday
 * first) and this month counted toward it — counts only, never a score, a level or a streak to lose. Kept in the loose
 * habit extras (`zigoals:habit-extras:v1`) as the optional `identities` list (TIER 3 (stored format)); it syncs with that
 * section as `intentions` does. Read with plain checks, so one odd item never makes the record unreadable; an item this
 * build cannot read is kept as it is on every write. Pure.
 */
export const MAX_IDENTITIES = 5, IDENTITY_MAX = 80, IDENTITY_HABITS = 30;
export const IDENTITY_ID = /^id-[a-z0-9]{4,24}$/;
export type Identity = {id: string; text: string; habits: string[]};
const PLAIN = /^[^\u0000-\u001f\u007f]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const readOne = (v: unknown): Identity | null => {
  if (!isObj(v) || typeof v.id !== 'string' || !IDENTITY_ID.test(v.id) || typeof v.text !== 'string') return null;
  const text = v.text.trim();
  if (!text || text.length > IDENTITY_MAX || !PLAIN.test(text)) return null;
  const habits = Array.isArray(v.habits) ? [...new Set(v.habits.filter((h): h is string => typeof h === 'string' && h.length > 0 && h.length <= 100))].slice(0, IDENTITY_HABITS) : [];
  return {id: v.id, text, habits};
};
/** The lines this build can read, in the person's order. */
export function identitiesOf(extras: unknown): Identity[] {
  const raw = isObj(extras) && Array.isArray(extras.identities) ? extras.identities : [];
  return raw.map(readOne).filter((x): x is Identity => !!x).slice(0, MAX_IDENTITIES);
}
/** One plain line: control characters out, runs of spaces as one, at most 80 characters. */
export const cleanIdentity = (text: string) => text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, IDENTITY_MAX).trim();
export const newIdentityId = () => `id-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 16)}`;
/** Writes the list back: items this build cannot read stay where they were (a later build's own items survive). */
function withList<T extends object>(extras: T, change: (list: Identity[]) => Identity[]): T {
  const raw: unknown[] = isObj(extras) && Array.isArray((extras as {identities?: unknown}).identities) ? (extras as unknown as {identities: unknown[]}).identities : [];
  const unread = raw.filter(v => !readOne(v)), next = change(identitiesOf(extras));
  const all = [...next, ...unread];
  const {identities: _drop, ...rest} = extras as T & {identities?: unknown}; void _drop;
  return (all.length ? {...rest, identities: all} : rest) as T;
}
/** Adds a line (with the habits that serve it), or changes one by its id. Says plainly what is wrong. */
export function saveIdentity<T extends object>(extras: T, draft: {id?: string; text: string; habits: readonly string[]}, keep: ReadonlySet<string> | null = null, newId = newIdentityId): T {
  const text = cleanIdentity(draft.text);
  if (!text) throw new Error('Write the line in your own words first, for example “I am someone who moves every day”.');
  const habits = [...new Set(draft.habits)].filter(h => !keep || keep.has(h)).slice(0, IDENTITY_HABITS);
  return withList(extras, list => {
    if (draft.id && list.some(i => i.id === draft.id)) return list.map(i => i.id === draft.id ? {id: i.id, text, habits} : i);
    if (list.length >= MAX_IDENTITIES) throw new Error(`Up to ${MAX_IDENTITIES} lines. Remove one first.`);
    return [...list, {id: newId(), text, habits}];
  });
}
export const removeIdentity = <T extends object>(extras: T, id: string): T => withList(extras, list => list.filter(i => i.id !== id));
/** Puts a removed line back where it was (Undo). */
export const restoreIdentity = <T extends object>(extras: T, item: Identity, at: number): T => withList(extras, list => list.some(i => i.id === item.id) ? list : [...list.slice(0, at), item, ...list.slice(at)].slice(0, MAX_IDENTITIES));
/** Drops habits that no longer exist from every line (the line itself stays). */
export const pruneIdentityHabits = <T extends object>(extras: T, keep: ReadonlySet<string>): T => withList(extras, list => list.map(i => ({...i, habits: i.habits.filter(h => keep.has(h))})));

/** Monday of the week `day` is in. */
const monday = (day: string) => addLocalDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
/** A habit's done days in [from, to] (complete days only; a skipped or rest day is not counted against anyone). */
function doneDays(habit: Habit, from: string, to: string, today: string): number {
  let n = 0;
  for (let d = from; d <= to; d = addLocalDays(d, 1)) if (habitDay(habit, d, today).status === 'complete') n++;
  return n;
}
export type IdentityCount = {identity: Identity; week: number; month: number; habits: Habit[]};
/** Each line with the ticks of its habits this week (Monday to today) and this month (the 1st to today). */
export function identityCounts(identities: readonly Identity[], habits: readonly Habit[], today: string): IdentityCount[] {
  const byId = new Map(habits.map(h => [h.id, h])), week = monday(today), month = `${today.slice(0, 7)}-01`;
  return identities.map(identity => {
    const hs = identity.habits.flatMap(id => byId.get(id) ? [byId.get(id)!] : []);
    return {identity, habits: hs, week: hs.reduce((n, h) => n + doneDays(h, week, today, today), 0), month: hs.reduce((n, h) => n + doneDays(h, month, today, today), 0)};
  });
}
/** "12 times this month · 3 this week", or a calm line when nothing is joined or done yet. */
export function countLine(c: Pick<IdentityCount, 'week' | 'month' | 'habits'>): string {
  if (!c.habits.length) return 'No habit joined yet. Edit to choose the habits that serve it.';
  if (!c.month) return 'Nothing ticked this month yet; each tick counts toward it.';
  return `${c.month === 1 ? 'Once' : `${c.month} times`} this month · ${c.week === 1 ? 'once' : `${c.week} times`} this week`;
}
