import {MOOD_WORDS} from '../wrap-up/engine';
import {addLocalDays} from '../local-date';

/**
 * Session AV lane 2 (habits pillar; LEDGER #178 Daylio custom moods, #179 activities with icons and groups, #188
 * activity and mood statistics). Two optional fields of the energy record's loose `checkin` (`zigoals:energy:v1`:
 * device-only, never synced, exported, erased and restored with Health; TIER 3 stored format, additive):
 * - `moodLook`: {"1"…"5": {word?, symbol?}}, your own word and symbol for each of the five mood levels. Display only:
 *   the stored mood stays 1–5 (Health v4 `moods`, unchanged), so every reader and older build reads the same mood.
 * - `activities`: [{id, name, symbol, group}], at most 60, a saved list in your own groups, each with a symbol from a
 *   fixed set; tapping one in the mood check-in adds its name as that day's mood tag (`zigoals:mood-tags:v1`,
 *   unchanged), so Insights and the statistics read them as tags.
 * Read with plain checks: one odd entry is left out, never a reason to refuse the record. Pure.
 */
export const MOOD_SYMBOLS = ['☀', '☺', '○', '☁', '☂', '★', '♥', '☾', '✿', '❄', '⚡', '~'] as const;
export const ACTIVITY_SYMBOLS = ['☀', '☕', '♫', '⚽', '✎', '☾', '♥', '✈', '⌂', '☂', '✿', '☘', '★', '♨', '✉', '☎', '⚙', '☺', '♞', '⛰', '⚓', '✂', '⌨', '☯'] as const;
export const MAX_ACTIVITIES = 60, MAX_ACTIVITY_CHARS = 24, MAX_GROUP_CHARS = 24, MAX_MOOD_WORD = 16;
export type MoodLook = {words: string[]; symbols: (string | null)[]; custom: boolean};
export type Activity = {id: string; name: string; symbol: string; group: string};
const PLAIN = /^[^\u0000-\u001f\u007f]*$/, ID = /^[a-z0-9-]{1,40}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max && PLAIN.test(v) ? v.trim() : null;
const checkinOf = (energy: unknown): Record<string, unknown> => isObj(energy) && isObj(energy.checkin) ? energy.checkin : {};
function withCheckin<T extends object>(energy: T, change: (c: Record<string, unknown>) => void): T {
  const c: Record<string, unknown> = {...checkinOf(energy)};
  change(c);
  for (const k of Object.keys(c)) if ((isObj(c[k]) && !Object.keys(c[k] as object).length) || (Array.isArray(c[k]) && !(c[k] as unknown[]).length)) delete c[k];
  const {checkin: _drop, ...rest} = energy as T & {checkin?: unknown}; void _drop;
  return (Object.keys(c).length ? {...rest, checkin: c} : rest) as T;
}

/** The five mood words (1 = hardest … 5 = best) and symbols, your own where you set them, else the app's. */
export function readMoodLook(energy: unknown): MoodLook {
  const m = checkinOf(energy).moodLook, words: string[] = [...MOOD_WORDS], symbols: (string | null)[] = [null, null, null, null, null];
  let custom = false;
  if (isObj(m)) for (let level = 1; level <= 5; level++) {
    const e = m[String(level)];
    if (!isObj(e)) continue;
    const w = text(e.word, MAX_MOOD_WORD), s = (MOOD_SYMBOLS as readonly unknown[]).includes(e.symbol) ? e.symbol as string : null;
    if (w) { words[level - 1] = w; custom = true; }
    if (s) { symbols[level - 1] = s; custom = true; }
  }
  return {words, symbols, custom};
}
/** One level's own word and symbol (an empty word or null symbol goes back to the app's). Later fields kept. */
export function setMoodLook<T extends object>(energy: T, level: number, look: {word?: string; symbol?: string | null}): T {
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new Error('Choose one of the five moods.');
  if (look.word !== undefined && look.word.trim() && !text(look.word, MAX_MOOD_WORD)) throw new Error(`Use a word of 1 to ${MAX_MOOD_WORD} characters.`);
  if (look.symbol && !(MOOD_SYMBOLS as readonly string[]).includes(look.symbol)) throw new Error('Choose one of the symbols offered.');
  return withCheckin(energy, c => {
    const all: Record<string, unknown> = isObj(c.moodLook) ? {...c.moodLook} : {};
    const e: Record<string, unknown> = isObj(all[String(level)]) ? {...all[String(level)] as Record<string, unknown>} : {};
    if (look.word !== undefined) { if (look.word.trim()) e.word = look.word.trim(); else delete e.word; }
    if (look.symbol !== undefined) { if (look.symbol) e.symbol = look.symbol; else delete e.symbol; }
    if (Object.keys(e).length) all[String(level)] = e; else delete all[String(level)];
    c.moodLook = all;
  });
}
export const resetMoodLook = <T extends object>(energy: T): T => withCheckin(energy, c => { delete c.moodLook; });
/** "☀ Great" with your symbol, or the word alone. */
export const moodLabel = (look: MoodLook, mood: number) => { const i = Math.max(1, Math.min(5, Math.round(mood))) - 1; return look.symbols[i] ? `${look.symbols[i]} ${look.words[i]}` : look.words[i]!; };

export function readActivities(energy: unknown): Activity[] {
  const list = checkinOf(energy).activities, out: Activity[] = [], seen = new Set<string>();
  if (!Array.isArray(list)) return out;
  for (const a of list.slice(0, MAX_ACTIVITIES)) {
    if (!isObj(a) || typeof a.id !== 'string' || !ID.test(a.id)) continue;
    const name = text(a.name, MAX_ACTIVITY_CHARS), group = text(a.group, MAX_GROUP_CHARS) ?? 'Other';
    const symbol = (ACTIVITY_SYMBOLS as readonly unknown[]).includes(a.symbol) ? a.symbol as string : '★';
    if (!name || seen.has(name.toLocaleLowerCase())) continue;
    seen.add(name.toLocaleLowerCase());
    out.push({id: a.id, name, symbol, group});
  }
  return out;
}
const idFor = (name: string, taken: ReadonlySet<string>) => { const base = name.toLocaleLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'activity'; let id = base, n = 2; while (taken.has(id)) id = `${base}-${n++}`; return id; };
/** An activity added to the list (a name once, case ignored). */
export function addActivity<T extends object>(energy: T, input: {name: string; symbol: string; group: string}): T {
  const name = text(input.name, MAX_ACTIVITY_CHARS), group = input.group.trim() ? text(input.group, MAX_GROUP_CHARS) : 'Other';
  if (!name) throw new Error(`Use a name of 1 to ${MAX_ACTIVITY_CHARS} characters.`);
  if (!group) throw new Error(`Use a group name of 1 to ${MAX_GROUP_CHARS} characters.`);
  if (!(ACTIVITY_SYMBOLS as readonly string[]).includes(input.symbol)) throw new Error('Choose one of the symbols offered.');
  const now = readActivities(energy);
  if (now.some(a => a.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error(`“${name}” is already in your activities.`);
  if (now.length >= MAX_ACTIVITIES) throw new Error(`${MAX_ACTIVITIES} activities is the most; remove one first.`);
  return withCheckin(energy, c => { c.activities = [...(Array.isArray(c.activities) ? c.activities : []), {id: idFor(name, new Set(now.map(a => a.id))), name, symbol: input.symbol, group}]; });
}
export const removeActivity = <T extends object>(energy: T, id: string): T => withCheckin(energy, c => { if (Array.isArray(c.activities)) c.activities = c.activities.filter(a => !(isObj(a) && a.id === id)); });
/** The list in its groups, each group in the order it first appears. */
export function activityGroups(list: readonly Activity[]): {group: string; items: Activity[]}[] {
  const out: {group: string; items: Activity[]}[] = [];
  for (const a of list) { const g = out.find(x => x.group.toLocaleLowerCase() === a.group.toLocaleLowerCase()); if (g) g.items.push(a); else out.push({group: a.group, items: [a]}); }
  return out;
}

/**
 * LEDGER #188 (Daylio's activity and mood statistics): per tag, the days with it this calendar month and last month, and
 * how the mood was on its days over the last year (a count per level, and the most common one in words). Days without
 * a mood still count for the month totals; the spread counts only days with a mood. Sorted by this month, then last.
 */
export type TagStat = {tag: string; thisMonth: number; lastMonth: number; spread: [number, number, number, number, number]; moodDays: number; mostly: number | null};
export function tagStats(moods: Readonly<Record<string, {mood: number}>>, entries: Readonly<Record<string, readonly string[]>>, today: string): TagStat[] {
  const month = today.slice(0, 7), last = addLocalDays(`${month}-01`, -1).slice(0, 7), from = addLocalDays(today, -364);
  const by = new Map<string, TagStat>();
  for (const [day, tags] of Object.entries(entries)) {
    if (day > today || day < from && day.slice(0, 7) !== last) continue;
    for (const raw of tags) {
      const key = raw.toLocaleLowerCase(), s = by.get(key) ?? {tag: raw, thisMonth: 0, lastMonth: 0, spread: [0, 0, 0, 0, 0], moodDays: 0, mostly: null};
      if (day.slice(0, 7) === month) s.thisMonth++;
      else if (day.slice(0, 7) === last) s.lastMonth++;
      const m = moods[day]?.mood;
      if (day >= from && typeof m === 'number' && m >= 1 && m <= 5) { s.spread[Math.round(m) - 1]!++; s.moodDays++; }
      by.set(key, s);
    }
  }
  for (const s of by.values()) { const top = Math.max(...s.spread); s.mostly = top > 0 ? s.spread.lastIndexOf(top) + 1 : null; }
  return [...by.values()].sort((a, b) => b.thisMonth - a.thisMonth || b.lastMonth - a.lastMonth || b.moodDays - a.moodDays || a.tag.localeCompare(b.tag));
}
