import type {FoodPlus} from './schema';
import {addLocalDays} from '../local-date';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #418, Lifesum's fruit, vegetable and fish trackers): one-tap portion
 * counters in Health → Food. Fruit, vegetables and fish are offered, plus up to three of the person's own (water is
 * counted elsewhere); none is on until the person turns it on. Each may have its own aim, a number a day or a week. The
 * count is a plain number of portions the person tapped: no food is read into it, nothing is estimated, and there is no
 * "off track" line (Lifesum's fish tracker told a vegetarian they were off track). Kept as the optional `portions` of the
 * loose food record (`zigoals:food-plus:v1`); a counter or a day this build cannot read is left out on its own. Pure.
 */
export const BUILT_IN_PORTIONS = ['fruit', 'veg', 'fish'] as const;
export type BuiltInPortion = typeof BUILT_IN_PORTIONS[number];
export const PORTION_WORDS: Record<BuiltInPortion, {en: string; nl: string; one: string; oneNl: string}> = {
  fruit: {en: 'Fruit', nl: 'Fruit', one: 'portion of fruit', oneNl: 'portie fruit'},
  veg: {en: 'Vegetables', nl: 'Groente', one: 'portion of vegetables', oneNl: 'portie groente'},
  fish: {en: 'Fish', nl: 'Vis', one: 'portion of fish', oneNl: 'portie vis'},
};
export const MAX_OWN_PORTIONS = 3, MAX_PORTION_COUNT = 50, MAX_PORTION_DAYS = 400, OWN_NAME_MAX = 24;
export type PortionAim = {n: number; per: 'day' | 'week'};
export type PortionCounter = {id: string; name?: string; aim?: PortionAim};
export type Portions = {counters: PortionCounter[]; days: Record<string, Record<string, number>>};
const ID = /^(?:fruit|veg|fish|own-[a-z0-9]{4,20})$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const int = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
function readAim(v: unknown): PortionAim | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const a = v as Record<string, unknown>;
  return int(a.n, 1, MAX_PORTION_COUNT) && (a.per === 'day' || a.per === 'week') ? {n: a.n as number, per: a.per} : undefined;
}
/** The counters and days this build can read (a bad counter, day or count is left out alone). */
export function readPortions(food: Pick<FoodPlus, 'portions'> | null | undefined): Portions {
  const raw = food?.portions, counters: PortionCounter[] = [], days: Portions['days'] = {};
  for (const c of raw?.counters ?? []) {
    if (!c || typeof c !== 'object') continue;
    const x = c as Record<string, unknown>, id = typeof x.id === 'string' && ID.test(x.id) ? x.id : null;
    if (!id || counters.some(k => k.id === id)) continue;
    const own = id.startsWith('own-'), name = typeof x.name === 'string' ? x.name.replace(/\s+/g, ' ').trim() : '';
    if (own && (!name || name.length > OWN_NAME_MAX)) continue;
    if (own && counters.filter(k => k.id.startsWith('own-')).length >= MAX_OWN_PORTIONS) continue;
    const aim = readAim(x.aim);
    counters.push({id, ...(own ? {name} : {}), ...(aim ? {aim} : {})});
  }
  for (const [day, v] of Object.entries(raw?.days ?? {})) {
    if (!DAY.test(day) || !v || typeof v !== 'object' || Array.isArray(v)) continue;
    const counts: Record<string, number> = {};
    for (const [id, n] of Object.entries(v as Record<string, unknown>)) if (ID.test(id) && int(n, 1, MAX_PORTION_COUNT)) counts[id] = n as number;
    if (Object.keys(counts).length) days[day] = counts;
  }
  return {counters, days};
}
const write = (food: FoodPlus, p: Portions): FoodPlus => {
  const next = {...food} as FoodPlus & {portions?: unknown};
  const keys = Object.keys(p.days).sort(), drop = keys.slice(0, Math.max(0, keys.length - MAX_PORTION_DAYS)), days = {...p.days};
  for (const k of drop) delete days[k];
  if (!p.counters.length && !Object.keys(days).length) delete next.portions; else next.portions = {counters: p.counters, days};
  return next as FoodPlus;
};
export const nameOf = (c: PortionCounter, lang: 'en' | 'nl' = 'en') => c.name ?? PORTION_WORDS[c.id as BuiltInPortion]?.[lang] ?? c.id;
/** Turns a built-in counter on (at the end) or off; its counted days are kept, so turning it on again finds them. */
export function setBuiltIn(food: FoodPlus, id: BuiltInPortion, on: boolean): FoodPlus {
  const p = readPortions(food), has = p.counters.some(c => c.id === id);
  if (on === has) return food;
  return write(food, {...p, counters: on ? [...p.counters, {id}] : p.counters.filter(c => c.id !== id)});
}
/** Adds one of the person's own counters; throws a sentence on an empty name, a repeat or a fourth one. */
export function addOwn(food: FoodPlus, name: string, id: string): FoodPlus {
  const p = readPortions(food), clean = name.replace(/\s+/g, ' ').trim();
  if (!clean) throw Error('Name the counter first.');
  if (clean.length > OWN_NAME_MAX) throw Error(`Keep the name to ${OWN_NAME_MAX} characters.`);
  if (p.counters.filter(c => c.id.startsWith('own-')).length >= MAX_OWN_PORTIONS) throw Error(`Up to ${MAX_OWN_PORTIONS} counters of your own fit. Remove one first.`);
  if (p.counters.some(c => nameOf(c).toLowerCase() === clean.toLowerCase())) throw Error(`“${clean}” is counted already.`);
  if (!ID.test(id) || !id.startsWith('own-')) throw Error('Not a counter id.');
  return write(food, {...p, counters: [...p.counters, {id, name: clean}]});
}
/** Removes a counter (an own one with its days; a built-in one keeps its days, as turning it off does). */
export function removeCounter(food: FoodPlus, id: string): FoodPlus {
  const p = readPortions(food), days: Portions['days'] = {};
  for (const [d, counts] of Object.entries(p.days)) { const {[id]: _gone, ...rest} = counts; void _gone; if (!id.startsWith('own-') || !(id in counts)) days[d] = counts; else if (Object.keys(rest).length) days[d] = rest; }
  return write(food, {counters: p.counters.filter(c => c.id !== id), days});
}
/** Sets (or, with null, clears) a counter's aim. */
export function setAim(food: FoodPlus, id: string, aim: PortionAim | null): FoodPlus {
  const p = readPortions(food);
  if (!p.counters.some(c => c.id === id)) throw Error('This counter is no longer here.');
  if (aim && !(int(aim.n, 1, MAX_PORTION_COUNT) && (aim.per === 'day' || aim.per === 'week'))) throw Error(`Choose an aim from 1 to ${MAX_PORTION_COUNT}.`);
  return write(food, {...p, counters: p.counters.map(c => { if (c.id !== id) return c; const {aim: _a, ...rest} = c; void _a; return aim ? {...rest, aim} : rest; })});
}
/** One more (by 1) or one fewer (by -1) for a day; never below 0 or above 50. */
export function countPortion(food: FoodPlus, id: string, day: string, by: 1 | -1): FoodPlus {
  const p = readPortions(food);
  if (!p.counters.some(c => c.id === id)) throw Error('This counter is no longer here.');
  if (!DAY.test(day)) throw Error('Not a day.');
  const now = p.days[day]?.[id] ?? 0, next = Math.max(0, Math.min(MAX_PORTION_COUNT, now + by)), counts = {...(p.days[day] ?? {})};
  if (next) counts[id] = next; else delete counts[id];
  const days = {...p.days};
  if (Object.keys(counts).length) days[day] = counts; else delete days[day];
  return write(food, {...p, days});
}
export const countOn = (p: Portions, id: string, day: string) => p.days[day]?.[id] ?? 0;
/** Monday of the week a day falls in. */
export const mondayOf = (day: string) => addLocalDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
/** The portions counted Monday to `day`. */
export function weekCount(p: Portions, id: string, day: string): number {
  const from = mondayOf(day); let t = 0;
  for (let d = from; d <= day; d = addLocalDays(d, 1)) t += countOn(p, id, d);
  return t;
}
/** The plain line under a counter: today's count, and the aim when there is one ("2 today · your aim 5 a day"). Never "off track". */
export function portionLine(p: Portions, c: PortionCounter, day: string, lang: 'en' | 'nl' = 'en'): string {
  const today = countOn(p, c.id, day);
  if (!c.aim) return lang === 'nl' ? `${today} vandaag` : `${today} today`;
  if (c.aim.per === 'day') return lang === 'nl' ? `${today} vandaag · je doel ${c.aim.n} per dag${today >= c.aim.n ? ' · gehaald' : ''}` : `${today} today · your aim ${c.aim.n} a day${today >= c.aim.n ? ' · reached' : ''}`;
  const week = weekCount(p, c.id, day);
  return lang === 'nl' ? `${today} vandaag · ${week} deze week · je doel ${c.aim.n} per week${week >= c.aim.n ? ' · gehaald' : ''}` : `${today} today · ${week} this week · your aim ${c.aim.n} a week${week >= c.aim.n ? ' · reached' : ''}`;
}
