import {MAX_RETIRED, MAX_SCALES, MAX_SCALE_DAYS, SCALE_END_MAX, SCALE_ID, SCALE_NAME_MAX, scalesSchema, type Scale, type Scales} from './store';

/**
 * Session AK (BUILD list 2 #12): the pure steps of "Your own scales". Optional and skippable: a day without a rating is
 * unknown (never a 1, never a 3). At most five scales at once; past 730 days the oldest days make way. Removing a scale
 * keeps its ratings and its words (in `retired`); adding it back by the same name brings its history with it.
 */
export const SCALE_LIMIT = `You have ${MAX_SCALES} scales, the most at once. Remove one first; its ratings stay.`;
export const SUGGESTED: readonly {name: string; low: string; high: string}[] = [
  {name: 'Stress', low: 'calm', high: 'very tense'}, {name: 'Pain', low: 'none', high: 'a lot'}, {name: 'Focus', low: 'scattered', high: 'sharp'},
  {name: 'Calm', low: 'restless', high: 'settled'}, {name: 'Social energy', low: 'drained', high: 'ready for people'},
];
const tidy = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);
const visible = (s: string) => /[\p{L}\p{N}]/u.test(s);
export const scaleIdFor = (name: string, taken: readonly string[]): string => {
  const base = name.toLocaleLowerCase('en').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 18) || 'scale';
  let id = base, n = 2;
  while (taken.includes(id)) id = `${base}-${n++}`.slice(0, 24);
  return id;
};
const all = (rec: Scales): Scale[] => [...rec.scales, ...(rec.retired ?? [])];

/** Adds a scale (or brings back a removed one of the same name, with its history). */
export function addScale(rec: Scales, input: {name: string; low: string; high: string}): Scales {
  const name = tidy(input.name, SCALE_NAME_MAX), low = tidy(input.low, SCALE_END_MAX), high = tidy(input.high, SCALE_END_MAX);
  if (!visible(name)) throw new Error('Give the scale a name, such as “Stress”.');
  if (!visible(low) || !visible(high)) throw new Error('Give both ends a word, such as “calm” and “very tense”.');
  if (rec.scales.length >= MAX_SCALES) throw new Error(SCALE_LIMIT);
  if (rec.scales.some(s => s.name.toLocaleLowerCase('en') === name.toLocaleLowerCase('en'))) throw new Error(`You already have “${name}”.`);
  const back = (rec.retired ?? []).find(s => s.name.toLocaleLowerCase('en') === name.toLocaleLowerCase('en'));
  const id = back?.id ?? scaleIdFor(name, all(rec).map(s => s.id).concat(Object.values(rec.days).flatMap(d => Object.keys(d))));
  return scalesSchema.parse({...rec, scales: [...rec.scales, {id, name, low, high}], retired: (rec.retired ?? []).filter(s => s.id !== id)});
}
export function editScale(rec: Scales, id: string, input: {name: string; low: string; high: string}): Scales {
  const name = tidy(input.name, SCALE_NAME_MAX), low = tidy(input.low, SCALE_END_MAX), high = tidy(input.high, SCALE_END_MAX);
  if (!visible(name) || !visible(low) || !visible(high)) throw new Error('Give the scale a name and a word for each end.');
  if (rec.scales.some(s => s.id !== id && s.name.toLocaleLowerCase('en') === name.toLocaleLowerCase('en'))) throw new Error(`You already have “${name}”.`);
  return scalesSchema.parse({...rec, scales: rec.scales.map(s => s.id === id ? {...s, name, low, high} : s)});
}
/** Removes a scale from the check-in; its ratings and words stay (in `retired`), so its history reads as before. */
export function removeScale(rec: Scales, id: string): Scales {
  const scale = rec.scales.find(s => s.id === id);
  if (!scale) return rec;
  return scalesSchema.parse({...rec, scales: rec.scales.filter(s => s.id !== id), retired: [...(rec.retired ?? []).filter(s => s.id !== id), scale].slice(-MAX_RETIRED)});
}
/** Rates a scale on a day (1–5), or clears that rating (null). The newest 730 days are kept. */
export function rateScale(rec: Scales, day: string, id: string, value: number | null): Scales {
  if (!SCALE_ID.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('That rating cannot be kept.');
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) throw new Error('A rating is 1 to 5.');
  const {[id]: _old, ...rest} = rec.days[day] ?? {}; void _old;
  const today = value === null ? rest : {...rest, [id]: value};
  const days = {...rec.days};
  if (Object.keys(today).length) days[day] = today; else delete days[day];
  const kept = Object.fromEntries(Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, MAX_SCALE_DAYS));
  return scalesSchema.parse({...rec, days: kept});
}
/** A scale by id, active or removed (its history stays readable); null when this device never had it. */
export const scaleById = (rec: Pick<Scales, 'scales' | 'retired'>, id: string): (Scale & {removed: boolean}) | null => {
  const active = rec.scales.find(s => s.id === id);
  if (active) return {...active, removed: false};
  const old = (rec.retired ?? []).find(s => s.id === id);
  return old ? {...old, removed: true} : null;
};
/** One scale's ratings, oldest first (days without a rating are simply absent). */
export const scaleSeries = (rec: Pick<Scales, 'days'>, id: string): {date: string; value: number}[] =>
  Object.entries(rec.days).flatMap(([date, r]) => r[id] !== undefined ? [{date, value: r[id]!}] : []).sort((a, b) => a.date.localeCompare(b.date));
/** "3 · somewhere between calm and very tense" style words for a value. */
export const valueWords = (s: Pick<Scale, 'low' | 'high'>, v: number) => v === 1 ? s.low : v === 5 ? s.high : `${v} of 5`;
