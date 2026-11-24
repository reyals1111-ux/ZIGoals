/**
 * Session AV lane 2 (habits pillar; LEDGER #60–#63, #68, Bearable's daily check-in): what the evening check-in keeps
 * beyond the records it writes into (Health's mood and note, the daily energy and its feeling word, the symptom levels,
 * the supplement marks). Kept as the optional `checkin` field of the loose daily energy record (`zigoals:energy:v1`;
 * device-only, never synced, in Export everything and the backup, restored and erased with Health; TIER 3 stored format,
 * additive): the days marked "Day logged", the person's own feeling words per quadrant, the parts of the day a symptom
 * or factor was noticed, a group and a "why I track this" note per item, and a mood per part of the day. Read here with
 * plain checks, so one odd value never makes the record unreadable; every writer keeps fields it does not know. Pure.
 */
export const PARTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type Part = (typeof PARTS)[number];
export const PART_WORDS: Record<Part, {en: string; nl: string}> = {morning: {en: 'Morning', nl: 'Ochtend'}, afternoon: {en: 'Afternoon', nl: 'Middag'}, evening: {en: 'Evening', nl: 'Avond'}, night: {en: 'Night', nl: 'Nacht'}};
export const QUADRANT_IDS = ['high-unpleasant', 'high-pleasant', 'low-unpleasant', 'low-pleasant'] as const;
export type QuadrantKey = (typeof QUADRANT_IDS)[number];
export const MAX_OWN_WORDS = 12, MAX_NOTE = 140, MAX_GROUP = 30, KEEP_DAYS = 1100;
export type CheckinExtras = {
  logged: Record<string, string>; ownWords: Record<QuadrantKey, string[]>; times: Record<string, Record<string, Part[]>>;
  notes: Record<string, string>; groups: Record<string, string>; moments: Record<string, Partial<Record<Part, number>>>;
  /** LEDGER #67: the measures the person chose for the graph (at most four), in their order. */
  graph: string[];
};
export const GRAPH_MAX = 4;
const MEASURE = /^(?:mood|energy|sleep|steps|symptom:[a-z0-9-]{1,40}|habit:[0-9a-f-]{36})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/, ITEM = /^[a-z0-9-]{1,40}$/, PLAIN = /^[^\u0000-\u001f\u007f]*$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max && PLAIN.test(v) ? v.trim() : null;
const parts = (v: unknown): Part[] => Array.isArray(v) ? PARTS.filter(p => v.includes(p)) : [];
export function readCheckin(energy: unknown): CheckinExtras {
  const c = isObj(energy) && isObj(energy.checkin) ? energy.checkin : {};
  const out: CheckinExtras = {logged: {}, ownWords: {'high-unpleasant': [], 'high-pleasant': [], 'low-unpleasant': [], 'low-pleasant': []}, times: {}, notes: {}, groups: {}, moments: {}, graph: []};
  if (Array.isArray(c.graph)) out.graph = [...new Set(c.graph.filter((g): g is string => typeof g === 'string' && MEASURE.test(g)))].slice(0, GRAPH_MAX);
  if (isObj(c.logged)) for (const [d, at] of Object.entries(c.logged)) if (DAY.test(d) && typeof at === 'string' && at.length <= 40) out.logged[d] = at;
  if (isObj(c.ownWords)) for (const q of QUADRANT_IDS) { const list = c.ownWords[q]; if (Array.isArray(list)) out.ownWords[q] = [...new Set(list.map(w => text(w, 32)).filter((w): w is string => !!w))].slice(0, MAX_OWN_WORDS); }
  if (isObj(c.times)) for (const [d, items] of Object.entries(c.times)) if (DAY.test(d) && isObj(items)) { const row: Record<string, Part[]> = {}; for (const [id, p] of Object.entries(items)) if (ITEM.test(id) && parts(p).length) row[id] = parts(p); if (Object.keys(row).length) out.times[d] = row; }
  for (const [field, max] of [['notes', MAX_NOTE], ['groups', MAX_GROUP]] as const) { const m = c[field]; if (isObj(m)) for (const [id, v] of Object.entries(m)) { const t = text(v, max); if (ITEM.test(id) && t) out[field][id] = t; } }
  if (isObj(c.moments)) for (const [d, m] of Object.entries(c.moments)) if (DAY.test(d) && isObj(m)) { const row: Partial<Record<Part, number>> = {}; for (const p of PARTS) { const v = m[p]; if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5) row[p] = v; } if (Object.keys(row).length) out.moments[d] = row; }
  return out;
}
/** The energy record with its `checkin` field changed by `change` (a copy of the stored object: unknown fields kept). */
function withCheckin<T extends object>(energy: T, change: (c: Record<string, unknown>) => void): T {
  const c: Record<string, unknown> = isObj((energy as {checkin?: unknown}).checkin) ? {...(energy as {checkin: Record<string, unknown>}).checkin} : {};
  change(c);
  for (const k of Object.keys(c)) if (isObj(c[k]) && !Object.keys(c[k] as object).length) delete c[k];
  const {checkin: _drop, ...rest} = energy as T & {checkin?: unknown}; void _drop;
  return (Object.keys(c).length ? {...rest, checkin: c} : rest) as T;
}
const map = (c: Record<string, unknown>, k: string): Record<string, unknown> => { const m = isObj(c[k]) ? {...c[k] as Record<string, unknown>} : {}; c[k] = m; return m; };
const trimDays = (m: Record<string, unknown>) => { const days = Object.keys(m).sort(); for (const d of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete m[d]; };
const checkDay = (day: string) => { if (!DAY.test(day)) throw new Error('Choose a real day.'); };
const checkItem = (id: string) => { if (!ITEM.test(id)) throw new Error('This item could not be found.'); };
/** "Day logged" on (stamped) or off for a day. */
export function setLogged<T extends object>(energy: T, day: string, on: boolean, at: string): T {
  checkDay(day);
  return withCheckin(energy, c => { const m = map(c, 'logged'); if (on) m[day] = at; else delete m[day]; trimDays(m); });
}
/** An own feeling word added to (or removed from) a quadrant; at most 12 a quadrant, each 1–32 characters. */
export function setOwnWord<T extends object>(energy: T, quadrant: QuadrantKey, word: string, on: boolean): T {
  const w = text(word, 32);
  if (!w) throw new Error('Use a word of 1 to 32 characters.');
  if (!(QUADRANT_IDS as readonly string[]).includes(quadrant)) throw new Error('Choose one of the four groups.');
  return withCheckin(energy, c => {
    const m = map(c, 'ownWords'), list = (Array.isArray(m[quadrant]) ? m[quadrant] as unknown[] : []).filter(x => typeof x === 'string' && x.toLocaleLowerCase() !== w.toLocaleLowerCase());
    if (on) { if (list.length >= MAX_OWN_WORDS) throw new Error(`At most ${MAX_OWN_WORDS} own words in a group.`); list.push(w); }
    if (list.length) m[quadrant] = list; else delete m[quadrant];
  });
}
/** The parts of the day an item was noticed on a day (an empty list clears it). */
export function setTimes<T extends object>(energy: T, day: string, itemId: string, chosen: readonly Part[]): T {
  checkDay(day); checkItem(itemId);
  return withCheckin(energy, c => { const m = map(c, 'times'), row = isObj(m[day]) ? {...m[day] as Record<string, unknown>} : {}; const p = PARTS.filter(x => chosen.includes(x)); if (p.length) row[itemId] = p; else delete row[itemId]; if (Object.keys(row).length) m[day] = row; else delete m[day]; trimDays(m); });
}
/** An item's "why I track this" note or its group (empty clears it). */
export function setItemText<T extends object>(energy: T, field: 'notes' | 'groups', itemId: string, value: string): T {
  checkItem(itemId);
  const max = field === 'notes' ? MAX_NOTE : MAX_GROUP, v = value.trim();
  if (v && !text(v, max)) throw new Error(`Use up to ${max} characters.`);
  return withCheckin(energy, c => { const m = map(c, field); if (v) m[itemId] = v; else delete m[itemId]; });
}
/** A mood (1–5) for one part of a day, or none. */
export function setMoment<T extends object>(energy: T, day: string, part: Part, mood: number | null): T {
  checkDay(day);
  if (mood !== null && !(Number.isInteger(mood) && mood >= 1 && mood <= 5)) throw new Error('Choose a mood from 1 to 5.');
  return withCheckin(energy, c => { const m = map(c, 'moments'), row = isObj(m[day]) ? {...m[day] as Record<string, unknown>} : {}; if (mood === null) delete row[part]; else row[part] = mood; if (Object.keys(row).length) m[day] = row; else delete m[day]; trimDays(m); });
}
/** The `days` days ending `today`, oldest first, each logged or a gap. */
export function loggedStrip(c: CheckinExtras, today: string, days: number, addDays: (d: string, n: number) => string): {day: string; logged: boolean}[] {
  return Array.from({length: days}, (_, i) => { const day = addDays(today, i + 1 - days); return {day, logged: !!c.logged[day]}; });
}
/** Symptom levels of a day in one line's numbers: how many noted, how many strong, and the day's total (0–3 each). */
export function dayTotal(levels: Readonly<Record<string, number>> | undefined): {noted: number; strong: number; total: number} {
  const v = Object.values(levels ?? {});
  return {noted: v.filter(x => x > 0).length, strong: v.filter(x => x >= 3).length, total: v.reduce((a, b) => a + b, 0)};
}
/** Bearable's ready list of common factors (LEDGER #63), to pick or search; English and Dutch names. */
export const READY_FACTORS: readonly {en: string; nl: string; kind: 'symptom' | 'factor'}[] = [
  {en: 'Caffeine', nl: 'Cafeïne', kind: 'factor'}, {en: 'Alcohol', nl: 'Alcohol', kind: 'factor'}, {en: 'Late screen time', nl: 'Laat schermgebruik', kind: 'factor'},
  {en: 'Stress at work', nl: 'Stress op werk', kind: 'factor'}, {en: 'Travel', nl: 'Reizen', kind: 'factor'}, {en: 'Pollen', nl: 'Pollen', kind: 'factor'},
  {en: 'Late meal', nl: 'Laat gegeten', kind: 'factor'}, {en: 'Time outdoors', nl: 'Tijd buiten', kind: 'factor'}, {en: 'Time with friends', nl: 'Tijd met vrienden', kind: 'factor'},
  {en: 'Poor sleep', nl: 'Slecht geslapen', kind: 'factor'}, {en: 'Sugar', nl: 'Suiker', kind: 'factor'}, {en: 'Period', nl: 'Menstruatie', kind: 'factor'},
  {en: 'Headache', nl: 'Hoofdpijn', kind: 'symptom'}, {en: 'Tiredness', nl: 'Vermoeidheid', kind: 'symptom'}, {en: 'Stiff back', nl: 'Stijve rug', kind: 'symptom'},
  {en: 'Bloating', nl: 'Opgeblazen gevoel', kind: 'symptom'}, {en: 'Restlessness', nl: 'Onrust', kind: 'symptom'}, {en: 'Sore muscles', nl: 'Spierpijn', kind: 'symptom'},
];
/** LEDGER #61: the day's feeling word set to one of the person's own words, in its quadrant (energy, pleasantness). */
export function setOwnFeeling<T extends {words?: Record<string, unknown>}>(energy: T, day: string, word: string, quadrant: QuadrantKey, at: string): T {
  checkDay(day);
  const w = text(word, 32);
  if (!w || !readCheckin(energy).ownWords[quadrant]?.includes(w)) throw new Error('Choose one of your own words shown.');
  const [level, feel] = quadrant.split('-') as ['high' | 'low', 'pleasant' | 'unpleasant'];
  const words: Record<string, unknown> = {...(energy.words ?? {}), [day]: {energy: level, pleasantness: feel, word: w, at, own: true}};
  const keys = Object.keys(words).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete words[k];
  return {...energy, words};
}
/** The ready list filtered by a search (either language), leaving out names already followed. */
export function readyMatches(query: string, followed: readonly string[], lang: 'en' | 'nl' = 'en'): {name: string; kind: 'symptom' | 'factor'}[] {
  const q = query.trim().toLocaleLowerCase(), have = new Set(followed.map(n => n.toLocaleLowerCase()));
  return READY_FACTORS.filter(f => !have.has(f.en.toLocaleLowerCase()) && !have.has(f.nl.toLocaleLowerCase()) && (!q || f.en.toLocaleLowerCase().includes(q) || f.nl.toLocaleLowerCase().includes(q))).map(f => ({name: f[lang], kind: f.kind}));
}
/** LEDGER #67: the graph's chosen measures (order kept; at most four; an empty list falls back to the default). */
export function setGraph<T extends object>(energy: T, measures: readonly string[]): T {
  const list = [...new Set(measures)];
  if (list.length > GRAPH_MAX || list.some(m => !MEASURE.test(m))) throw new Error(`Choose up to ${GRAPH_MAX} measures.`);
  return withCheckin(energy, c => { if (list.length) c.graph = list; else delete c.graph; });
}
