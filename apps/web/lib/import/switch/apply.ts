import type {HealthData} from '../../health';
import {healthSchema} from '../../health';
import {healthGroupIn, withHealthGroup} from '../../vault/w-homes';
import {emptySleep, MAX_NIGHTS, type SleepNight} from '../../sleep/schema';
import {emptyMeditation, MAX_SESSIONS, type MeditationSession} from '../../meditation/schema';
import {emptyVitals, MAX_VITAL_DAYS, type VitalDay} from '../../vitals/schema';
import {PRIVATE_MAX_BYTES} from '../../private-storage';
import type {ImportBatch, ImportFormat} from '../batches-schema';

/**
 * Bringing an export into the Health journal (Session W Part 7), the same for every format. The rules, chosen so an
 * import never doubles what is already there and never overwrites the person's own entries:
 * - a record whose id is already there is a duplicate (the same file imported again, or on another device);
 * - a night that overlaps a night already logged, a meditation session that overlaps one already logged, a day's steps
 *   or a weight on a day that already has steps or a weight: kept out ("one source per day") and counted;
 * - a list never goes past what the journal holds (5,000 nights, for example): the newest records are kept, the older
 *   ones counted, never silently dropped;
 * - everything else is added, and the batch remembers exactly which ids it added, so "Undo this import" removes those
 *   and nothing else.
 * Before anything is written the module's size after the import is checked against its storage limit (owner decision D).
 */
export type ActivityLine = {id: string; date: string; name: string; steps: number; minutes: number};
export type WeightLine = {id: string; date: string; grams: number};
export type ImportItems = {sleep: SleepNight[]; meditation: MeditationSession[]; vitals: VitalDay[]; activity: ActivityLine[]; weights: WeightLine[]};
export type ImportPlan = {format: ImportFormat; label: string; items: ImportItems; summarised: string[]; warnings: string[]};
export const emptyItems = (): ImportItems => ({sleep: [], meditation: [], vitals: [], activity: [], weights: []});
export type Outcome = {added: number; duplicates: number; kept: number; full: number};
export type Preview = Record<keyof ImportItems, Outcome> & {range: {from: string; to: string} | null};
/** The most each list holds (the Health v4 schemas); an import never takes a list past it. */
export const GROUP_LIMITS: Record<keyof ImportItems, number> = {sleep: MAX_NIGHTS, meditation: MAX_SESSIONS, vitals: MAX_VITAL_DAYS, activity: 10_000, weights: 5000};
export const GROUP_LIMIT_WORDS: Record<keyof ImportItems, string> = {sleep: 'nights and naps', meditation: 'meditation sessions', vitals: 'days of vitals', activity: 'activity lines', weights: 'weights'};

const span = (n: SleepNight) => ({start: Date.parse(n.start), end: Date.parse(n.end ?? n.start)});
const sessionSpan = (s: MeditationSession) => ({start: Date.parse(s.startedAt), end: Date.parse(s.startedAt) + s.seconds * 1000});
/**
 * One list: duplicates by id, then the group's own "stays out" rule, then the list's limit. The items arrive oldest
 * first; when the list would overflow, the newest are kept and the older ones counted as `full`.
 */
function merge<T extends {id: string}>(existing: readonly T[], incoming: readonly T[], limit: number, keepOut: (item: T) => boolean): {list: T[]; added: string[]; outcome: Outcome} {
  const ids = new Set(existing.map(r => r.id)), accepted: T[] = [], outcome: Outcome = {added: 0, duplicates: 0, kept: 0, full: 0};
  for (const item of incoming) {
    if (ids.has(item.id)) { outcome.duplicates++; continue; }
    if (keepOut(item)) { outcome.kept++; continue; }
    accepted.push(item); ids.add(item.id);
  }
  const room = Math.max(0, limit - existing.length), taken = accepted.length > room ? accepted.slice(accepted.length - room) : accepted;
  outcome.full = accepted.length - taken.length; outcome.added = taken.length;
  return {list: [...existing, ...taken], added: taken.map(r => r.id), outcome};
}
/**
 * "Does this span overlap any of these?" in logarithmic time: spans sorted by start with the running maximum of their
 * ends; a span overlaps one of them exactly when the latest end among those starting before it ends is after its start.
 */
function overlapIndex(spans: readonly {start: number; end: number}[]): (x: {start: number; end: number}) => boolean {
  const sorted = [...spans].sort((a, b) => a.start - b.start), starts = sorted.map(x => x.start), maxEnd: number[] = [];
  let m = -Infinity;
  for (const x of sorted) { m = Math.max(m, x.end); maxEnd.push(m); }
  return x => { let lo = 0, hi = starts.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (starts[mid]! < x.end) lo = mid + 1; else hi = mid; } return lo > 0 && maxEnd[lo - 1]! > x.start; };
}
/** Stays out when it overlaps a logged span or one accepted earlier in this import (items come in order of start). */
function overlapRule<T>(logged: readonly {start: number; end: number}[], spanOf: (item: T) => {start: number; end: number}, applies: (item: T) => boolean = () => true): (item: T) => boolean {
  const hits = overlapIndex(logged);
  let acceptedEnd = -Infinity;
  return item => {
    if (!applies(item)) return false;
    const x = spanOf(item);
    if (hits(x) || x.start < acceptedEnd) return true;
    acceptedEnd = Math.max(acceptedEnd, x.end);
    return false;
  };
}
/** Stays out when its day already has one (from the journal or from earlier in this import). */
function oncePerDay<T extends {date: string}>(taken: Iterable<string>, applies: (item: T) => boolean = () => true): (item: T) => boolean {
  const days = new Set(taken);
  return item => { if (!applies(item)) return false; if (days.has(item.date)) return true; days.add(item.date); return false; };
}
/** What an import would do to this journal, group by group, without writing. */
export function previewImport(health: HealthData, items: ImportItems, at = new Date().toISOString()): {next: HealthData; preview: Preview; addedIds: Record<keyof ImportItems, string[]>} {
  const preview = {} as Preview, addedIds = {} as Record<keyof ImportItems, string[]>;
  let next = health;
  {
    const group = healthGroupIn(next, 'sleep') ?? emptySleep(), isNight = (n: SleepNight) => n.kind === 'night';
    const incoming = [...items.sleep].sort((a, b) => a.start.localeCompare(b.start));
    const r = merge(group.nights, incoming, GROUP_LIMITS.sleep, overlapRule(group.nights.filter(m => isNight(m) && m.end !== null).map(span), span, isNight));
    if (r.added.length) next = withHealthGroup(next, 'sleep', {...group, nights: r.list}, false);
    preview.sleep = r.outcome; addedIds.sleep = r.added;
  }
  {
    const group = healthGroupIn(next, 'meditation') ?? emptyMeditation();
    const incoming = [...items.meditation].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const r = merge(group.sessions, incoming, GROUP_LIMITS.meditation, overlapRule(group.sessions.map(sessionSpan), sessionSpan));
    if (r.added.length) next = withHealthGroup(next, 'meditation', {...group, sessions: r.list}, false);
    preview.meditation = r.outcome; addedIds.meditation = r.added;
  }
  {
    const group = healthGroupIn(next, 'vitals') ?? emptyVitals();
    const r = merge(group.days, items.vitals, GROUP_LIMITS.vitals, () => false);
    if (r.added.length) next = withHealthGroup(next, 'vitals', {...group, days: r.list}, false);
    preview.vitals = r.outcome; addedIds.vitals = r.added;
  }
  {
    const hasSteps = (a: {steps: number}) => a.steps > 0;
    const r = merge(next.activity, items.activity.map(a => ({...a, createdAt: at, updatedAt: at})), GROUP_LIMITS.activity, oncePerDay<{date: string; steps: number}>(next.activity.filter(hasSteps).map(a => a.date), hasSteps));
    if (r.added.length) next = {...next, activity: r.list};
    preview.activity = r.outcome; addedIds.activity = r.added;
  }
  {
    const r = merge(next.weights, items.weights.map(w => ({...w, createdAt: at, updatedAt: at})), GROUP_LIMITS.weights, oncePerDay(next.weights.map(w => w.date)));
    if (r.added.length) next = {...next, weights: r.list};
    preview.weights = r.outcome; addedIds.weights = r.added;
  }
  const dates = [...items.sleep.map(n => (n.end ?? n.start).slice(0, 10)), ...items.meditation.map(s => s.startedAt.slice(0, 10)), ...items.vitals.map(d => d.date), ...items.activity.map(a => a.date), ...items.weights.map(w => w.date)].sort();
  preview.range = dates.length ? {from: dates[0]!, to: dates[dates.length - 1]!} : null;
  return {next: healthSchema.parse(next), preview, addedIds};
}
/**
 * Storage limits (owner decision D): browser storage holds a module up to 2,000,000 bytes; the durable store an open
 * account uses, up to 32,000,000 (the store tells which applies: usePrivateStore's `importLimit`). An import aims to
 * leave the module at three quarters of its limit or less.
 */
export const DURABLE_MAX_BYTES = 32_000_000, BROWSER_MAX_BYTES = PRIVATE_MAX_BYTES, COMFORTABLE = 0.75;
export function sizeCheck(next: HealthData, limit: number): {bytes: number; limit: number; fits: boolean; comfortable: boolean} {
  const bytes = new TextEncoder().encode(JSON.stringify(next)).byteLength;
  return {bytes, limit, fits: bytes <= limit, comfortable: bytes <= limit * COMFORTABLE};
}
/**
 * The earliest day from which the import still leaves the module comfortable, for the "import from … on" offer; null
 * when even the last day alone would not fit. A binary search over the days the import covers.
 */
export function windowThatFits(health: HealthData, items: ImportItems, limit: number): string | null {
  const days = [...new Set([...items.sleep.map(n => (n.end ?? n.start).slice(0, 10)), ...items.meditation.map(m => m.startedAt.slice(0, 10)), ...items.vitals.map(v => v.date), ...items.activity.map(a => a.date), ...items.weights.map(w => w.date)])].sort();
  const fits = (from: string) => sizeCheck(previewImport(health, sinceDay(items, from)).next, limit).comfortable;
  if (!days.length || !fits(days[days.length - 1]!)) return null;
  let lo = 0, hi = days.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (fits(days[mid]!)) hi = mid; else lo = mid + 1; }
  return days[lo]!;
}
/** The items from a day on, for a shorter window when the whole export would not fit. */
export function sinceDay(items: ImportItems, from: string): ImportItems {
  return {sleep: items.sleep.filter(n => (n.end ?? n.start).slice(0, 10) >= from), meditation: items.meditation.filter(s => s.startedAt.slice(0, 10) >= from), vitals: items.vitals.filter(d => d.date >= from), activity: items.activity.filter(a => a.date >= from), weights: items.weights.filter(w => w.date >= from)};
}
export function batchFor(plan: ImportPlan, addedIds: Record<keyof ImportItems, string[]>, {id, at}: {id: string; at: Date}): ImportBatch {
  const counts: Record<string, number> = {};
  for (const [group, ids] of Object.entries(addedIds)) if (ids.length) counts[group] = ids.length;
  return {id, format: plan.format, label: plan.label, at: at.toISOString(), counts, ...(plan.summarised.length ? {summarised: plan.summarised} : {}), refs: {health: {
    ...(addedIds.sleep.length ? {sleep: addedIds.sleep} : {}), ...(addedIds.meditation.length ? {meditation: addedIds.meditation} : {}), ...(addedIds.vitals.length ? {vitals: addedIds.vitals} : {}),
    ...(addedIds.activity.length ? {activity: addedIds.activity} : {}), ...(addedIds.weights.length ? {weights: addedIds.weights} : {}),
  }}};
}
/** What undoing a batch would remove now: its records still there, and which of them were edited after the import. */
export function undoPlan(health: HealthData, batch: ImportBatch): {remove: number; edited: string[]} {
  const refs = batch.refs.health ?? {}, since = Date.parse(batch.at), edited: string[] = [];
  let remove = 0;
  const check = (ids: readonly string[] | undefined, records: readonly {id: string; updatedAt: string}[], label: (r: {id: string}) => string) => {
    const wanted = new Set(ids ?? []);
    for (const r of records) if (wanted.has(r.id)) { remove++; if (Date.parse(r.updatedAt) > since + 1000) edited.push(label(r)); }
  };
  check(refs.sleep, healthGroupIn(health, 'sleep')?.nights ?? [], r => `a night (${(r as SleepNight).end?.slice(0, 10) ?? ''})`);
  check(refs.meditation, healthGroupIn(health, 'meditation')?.sessions ?? [], r => `a meditation session (${(r as MeditationSession).startedAt.slice(0, 10)})`);
  check(refs.vitals, healthGroupIn(health, 'vitals')?.days ?? [], r => `vitals for ${(r as VitalDay).date}`);
  check(refs.activity, health.activity, r => `activity on ${(r as ActivityLine).date}`);
  check(refs.weights, health.weights, r => `a weight on ${(r as WeightLine).date}`);
  return {remove, edited};
}
/** The journal without the batch's records (those still there; edited ones too, once the person agreed). */
export function undoImport(health: HealthData, batch: ImportBatch): HealthData {
  const refs = batch.refs.health ?? {}, drop = (ids?: readonly string[]) => { const set = new Set(ids ?? []); return <T extends {id: string}>(r: T) => !set.has(r.id); };
  let next: HealthData = {...health, activity: health.activity.filter(drop(refs.activity)), weights: health.weights.filter(drop(refs.weights))};
  const sleep = healthGroupIn(next, 'sleep'), meditation = healthGroupIn(next, 'meditation'), vitals = healthGroupIn(next, 'vitals');
  if (sleep && refs.sleep?.length) next = withHealthGroup(next, 'sleep', {...sleep, nights: sleep.nights.filter(drop(refs.sleep))}, false);
  if (meditation && refs.meditation?.length) next = withHealthGroup(next, 'meditation', {...meditation, sessions: meditation.sessions.filter(drop(refs.meditation))}, false);
  if (vitals && refs.vitals?.length) next = withHealthGroup(next, 'vitals', {...vitals, days: vitals.days.filter(drop(refs.vitals))}, false);
  return healthSchema.parse(next);
}
