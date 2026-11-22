import {addLocalDays} from '../local-date';
import {moodWordDaySchema, wordsOf} from './schema';
import type {QuadrantId} from './words';

/**
 * Session AV lane 2 (r4-mind; LEDGER #326, How We Feel's mind-body scan): an optional "Where do you feel it?" after the
 * day's feeling word — up to three body areas, each with a sensation word — kept on the loose mood-word day of the daily
 * energy record (`words[day].body`, TIER 3 (stored format)), and the most common area and sensation per corner over the
 * last 90 days, as counts. Plain, everyday words: where a feeling sits, never a symptom; nothing is read from them and
 * they have no medical meaning (owner note on #326). Pure.
 */
export const BODY_AREAS = ['head', 'jaw', 'throat', 'chest', 'shoulders', 'stomach', 'hands', 'legs'] as const;
export const SENSATIONS = ['tight', 'warm', 'heavy', 'buzzing', 'calm'] as const;
export type BodyArea = (typeof BODY_AREAS)[number];
export type Sensation = (typeof SENSATIONS)[number];
export type BodySpot = {area: BodyArea; feel: Sensation};
export const MAX_SPOTS = 3, BODY_DAYS = 90;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const readSpots = (v: unknown): BodySpot[] => Array.isArray(v) ? v.flatMap(x => isObj(x) && (BODY_AREAS as readonly unknown[]).includes(x.area) && (SENSATIONS as readonly unknown[]).includes(x.feel) ? [{area: x.area as BodyArea, feel: x.feel as Sensation}] : []).filter((s, i, all) => all.findIndex(o => o.area === s.area) === i).slice(0, MAX_SPOTS) : [];
type Words = {words?: Record<string, unknown>};
/** The day's spots, as this build reads them. */
export function spotsOn(r: Words, day: string): BodySpot[] {
  const d = r.words?.[day];
  return isObj(d) ? readSpots(d.body) : [];
}
/** Sets one area's sensation for the day (another sensation replaces it; `null` takes the area off). Needs the day's word. */
export function setSpot<T extends Words>(r: T, day: string, area: BodyArea, feel: Sensation | null): T {
  const raw = r.words?.[day];
  if (!isObj(raw) || !wordsOf(r)[day]) throw new Error('Choose a feeling word first.');
  if (!(BODY_AREAS as readonly string[]).includes(area)) throw new Error('Choose one of the areas shown.');
  const spots = spotsOn(r, day).filter(s => s.area !== area);
  if (feel) {
    if (!(SENSATIONS as readonly string[]).includes(feel)) throw new Error('Choose one of the words shown.');
    if (spots.length >= MAX_SPOTS) throw new Error(`Up to ${MAX_SPOTS} places. Take one off first.`);
    spots.push({area, feel});
  }
  const next: Record<string, unknown> = {...raw};
  if (spots.length) next.body = spots; else delete next.body;
  moodWordDaySchema.parse(next);
  return {...r, words: {...(r.words ?? {}), [day]: next}};
}
/** After the day's word is replaced, keeps the spots it had (where it is felt belongs to the day). */
export function keepBody<T extends Words>(before: T, after: T, day: string): T {
  const old = before.words?.[day], d = after.words?.[day];
  if (!isObj(old) || !isObj(d) || !readSpots(old.body).length || readSpots(d.body).length) return after;
  return {...after, words: {...(after.words ?? {}), [day]: {...d, body: readSpots(old.body)}}};
}
export type BodyCount = {quadrant: QuadrantId; days: number; area: {name: BodyArea; count: number} | null; feel: {name: Sensation; count: number} | null};
/** Per corner, over the 90 days ending today: how many days had a place, and the most common area and sensation. */
export function bodyCounts(r: Words, today: string, days = BODY_DAYS): BodyCount[] {
  const from = addLocalDays(today, 1 - days), words = wordsOf(r), per = new Map<QuadrantId, {days: number; areas: Map<BodyArea, number>; feels: Map<Sensation, number>}>();
  for (const [day, w] of Object.entries(words)) {
    if (day < from || day > today) continue;
    const spots = spotsOn(r, day); if (!spots.length) continue;
    const q = `${w.energy}-${w.pleasantness}` as QuadrantId, row = per.get(q) ?? {days: 0, areas: new Map(), feels: new Map()};
    row.days++;
    for (const s of spots) { row.areas.set(s.area, (row.areas.get(s.area) ?? 0) + 1); row.feels.set(s.feel, (row.feels.get(s.feel) ?? 0) + 1); }
    per.set(q, row);
  }
  const top = <K extends string>(m: Map<K, number>, order: readonly K[]) => { const best = [...m].sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))[0]; return best ? {name: best[0], count: best[1]} : null; };
  const ORDER: QuadrantId[] = ['high-unpleasant', 'high-pleasant', 'low-unpleasant', 'low-pleasant'];
  return ORDER.flatMap(q => { const row = per.get(q); return row ? [{quadrant: q, days: row.days, area: top(row.areas, BODY_AREAS), feel: top(row.feels, SENSATIONS)}] : []; });
}
