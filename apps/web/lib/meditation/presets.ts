import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {HEALTH_EXTRAS_KEY_LITERAL} from '../al-device-keys';
import {getAppStorage} from '../showcase-storage';
import {BELL_SOUNDS, meditationRunSchema, type BellPrefs, type MeditationRun} from './schema';
import {MAX_MINUTES, MIN_MINUTES, OPEN_ENDED_SEC, type Run} from './timer';

/**
 * Session AV lane 2 (habits pillar; LEDGER #184, Insight Timer's meditation timer): saved timer presets — a name, a length
 * or no set length, a settling-in time before the first bell, a start bell and an end bell of their own, one volume, and
 * up to five bells along the way, each repeating every so often (a number of times, or until the end), counted from the
 * start or back from the end.
 *
 * Where they are kept (TIER 3 stored format, additive):
 * - the presets: the optional `meditationTimer` field ({presets}) of the loose habit extras record
 *   (`zigoals:habit-extras:v1`), as the calm visual (`calm`) is, so they are exported, erased, restored and synced with the
 *   extras; each preset is checked here where it is read, so one odd entry never makes the record unreadable;
 * - the running session's bells: the optional `meditationRun` field ({startedAt, plan}) of the loose, device-only Health
 *   extras (`zigoals:health-extras:v1`), keyed by the run's start, because the run record (`zigoals:meditation-run:v1`) is
 *   strict. A settling-in time is a start in the future (the run's own time is 0 until then); a session with no set length
 *   is planned at OPEN_ENDED_SEC (lib/meditation/timer.ts), a length the minute-based timer never plans, so every reader
 *   of the run (the Checklist's corner timer too) can tell it apart without this file.
 *
 * Plain checks, no schema module; pure apart from `timerPresetsNow()`.
 */
export type BellSound = (typeof BELL_SOUNDS)[number];
export const RING_SOUNDS = BELL_SOUNDS.filter(s => s !== 'silent') as Exclude<BellSound, 'silent'>[];
export type IntervalBell = {sound: Exclude<BellSound, 'silent'>; every: number; times: number | null; from: 'start' | 'end'};
/** What a session rings: `minutes` null is no set length. */
export type TimerPlan = {minutes: number | null; warmup: number; start: BellSound; end: BellSound; volume: number; intervals: IntervalBell[]};
export type TimerPreset = TimerPlan & {id: string; name: string};
export const MAX_PRESETS = 20, MAX_INTERVALS = 5, NAME_MAX = 40, MAX_WARMUP = 600, MIN_EVERY = 5, MAX_EVERY = 3600, MAX_TIMES = 999;
/** The settling-in choices (seconds) and the "every" choices (seconds) the form offers; stored values are any in range. */
export const WARMUP_CHOICES = [0, 10, 15, 30, 60, 120, 300] as const;
export const EVERY_CHOICES = [5, 15, 30, 60, 120, 180, 300, 600, 900, 1200, 1800] as const;
const ID = /^tp-[a-z0-9-]{4,40}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const sound = (v: unknown): v is BellSound => (BELL_SOUNDS as readonly unknown[]).includes(v);
const ringing = (v: unknown): v is Exclude<BellSound, 'silent'> => (RING_SOUNDS as readonly unknown[]).includes(v);
const cleanName = (v: unknown) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX) : '';

function readInterval(raw: unknown): IntervalBell | null {
  if (!isObj(raw) || !ringing(raw.sound) || !int(raw.every, MIN_EVERY, MAX_EVERY)) return null;
  return {sound: raw.sound, every: raw.every, times: int(raw.times, 1, MAX_TIMES) ? raw.times : null, from: raw.from === 'end' ? 'end' : 'start'};
}
/** A plan read safely (a stored preset, or a running session's bells); null when it cannot be read. */
export function readPlan(raw: unknown): TimerPlan | null {
  if (!isObj(raw) || !sound(raw.start) || !sound(raw.end) || !int(raw.volume, 0, 100)) return null;
  const minutes = raw.open === true ? null : int(raw.minutes, MIN_MINUTES, MAX_MINUTES) ? raw.minutes : undefined;
  if (minutes === undefined) return null;
  const intervals = (Array.isArray(raw.intervals) ? raw.intervals : []).slice(0, MAX_INTERVALS).map(readInterval).filter((i): i is IntervalBell => i !== null);
  return {minutes, warmup: int(raw.warmup, 0, MAX_WARMUP) ? raw.warmup : 0, start: raw.start, end: raw.end, volume: raw.volume, intervals};
}
/** The plan as stored: no set length is `open: true`, defaults are left out. */
export function storedPlan(plan: TimerPlan): Record<string, unknown> {
  return {...(plan.minutes === null ? {open: true} : {minutes: plan.minutes}), ...(plan.warmup ? {warmup: plan.warmup} : {}), start: plan.start, end: plan.end, volume: plan.volume,
    ...(plan.intervals.length ? {intervals: plan.intervals.map(i => ({sound: i.sound, every: i.every, ...(i.times !== null ? {times: i.times} : {}), ...(i.from === 'end' ? {from: 'end'} : {})}))} : {})};
}
/** Every saved preset, in the order kept; odd entries are left out of the reading (and kept in storage). */
export function readPresets(extras: unknown): TimerPreset[] {
  const t = isObj(extras) ? extras.meditationTimer : undefined, list = isObj(t) && Array.isArray(t.presets) ? t.presets : [];
  const seen = new Set<string>(), out: TimerPreset[] = [];
  for (const raw of list.slice(0, MAX_PRESETS)) {
    if (!isObj(raw) || typeof raw.id !== 'string' || !ID.test(raw.id) || seen.has(raw.id)) continue;
    const plan = readPlan(raw), name = cleanName(raw.name);
    if (!plan || !name) continue;
    seen.add(raw.id); out.push({id: raw.id, name, ...plan});
  }
  return out;
}
export type PresetIssue = {field: 'name' | 'minutes' | 'interval'; message: string};
/** Why a preset cannot be saved, said at its field, or null. */
export function presetIssue(input: {name: string; plan: TimerPlan}, others: readonly TimerPreset[], id?: string): PresetIssue | null {
  const name = cleanName(input.name);
  if (!name || !/[\p{L}\p{N}]/u.test(name)) return {field: 'name', message: `Give the preset a name with letters or numbers, up to ${NAME_MAX} characters.`};
  if (others.some(p => p.id !== id && p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return {field: 'name', message: 'Another preset has this name. Choose a different one.'};
  const m = input.plan.minutes;
  if (m !== null && !int(m, MIN_MINUTES, MAX_MINUTES)) return {field: 'minutes', message: `Enter whole minutes from ${MIN_MINUTES} to ${MAX_MINUTES}, or choose No set length.`};
  if (input.plan.intervals.length > MAX_INTERVALS) return {field: 'interval', message: `A preset holds up to ${MAX_INTERVALS} bells along the way.`};
  for (const i of input.plan.intervals) {
    if (!readInterval(i)) return {field: 'interval', message: `A bell along the way repeats every ${MIN_EVERY} seconds to ${MAX_EVERY / 60} minutes, up to ${MAX_TIMES} times.`};
    if (m !== null && i.every >= m * 60) return {field: 'interval', message: `A bell along the way comes more often than the session lasts: choose under ${m} minutes, or a longer session.`};
  }
  return null;
}
const presetsList = (extras: object): unknown[] => { const t = (extras as {meditationTimer?: unknown}).meditationTimer; return isObj(t) && Array.isArray(t.presets) ? t.presets : []; };
function withList<T extends object>(extras: T, list: unknown[]): T {
  const old = (extras as {meditationTimer?: unknown}).meditationTimer, t: Record<string, unknown> = {...(isObj(old) ? old : {})};
  if (list.length) t.presets = list; else delete t.presets;
  const {meditationTimer: _drop, ...rest} = extras as T & {meditationTimer?: unknown}; void _drop;
  return (Object.keys(t).length ? {...rest, meditationTimer: t} : rest) as T;
}
export const newPresetId = () => `tp-${crypto.randomUUID()}`;
/**
 * The extras with a preset added (no `id`) or changed (its `id`). Throws the issue's words when it cannot be saved. Every
 * other field of the record, and any field a later build added to this preset, is kept.
 */
export function withPreset<T extends object>(extras: T, input: {name: string; plan: TimerPlan}, id?: string, newId = newPresetId): T {
  const presets = readPresets(extras), issue = presetIssue(input, presets, id);
  if (issue) throw new Error(issue.message);
  const list = presetsList(extras), body = {name: cleanName(input.name), ...storedPlan(input.plan)};
  if (id) {
    const at = list.findIndex(p => isObj(p) && p.id === id);
    if (at < 0) throw new Error('This preset is no longer here.');
    const held = list[at] as Record<string, unknown>, {minutes: _m, open: _o, warmup: _w, intervals: _i, ...later} = held; void _m; void _o; void _w; void _i;
    return withList(extras, list.map((p, n) => n === at ? {...later, id, ...body} : p));
  }
  if (presets.length >= MAX_PRESETS) throw new Error(`You can keep up to ${MAX_PRESETS} presets. Delete one to add another.`);
  return withList(extras, [...list, {id: newId(), ...body}]);
}
export function withoutPreset<T extends object>(extras: T, id: string): T {
  const list = presetsList(extras);
  if (!list.some(p => isObj(p) && p.id === id)) throw new Error('This preset is no longer here.');
  return withList(extras, list.filter(p => !(isObj(p) && p.id === id)));
}
/** A preset put back where it was (Undo of a delete). */
export function withPresetBack<T extends object>(extras: T, raw: unknown, index: number): T {
  if (!isObj(raw) || typeof raw.id !== 'string') return extras;
  const list = presetsList(extras);
  if (list.some(p => isObj(p) && p.id === raw.id)) return extras;
  const next = [...list]; next.splice(Math.max(0, Math.min(index, next.length)), 0, raw);
  return withList(extras, next.slice(0, MAX_PRESETS));
}
/** The stored entry of a preset (for Undo), and where it was. */
export function storedPreset(extras: unknown, id: string): {raw: unknown; index: number} | null {
  const list = isObj(extras) ? presetsList(extras) : [], index = list.findIndex(p => isObj(p) && p.id === id);
  return index < 0 ? null : {raw: list[index], index};
}
/** This device's presets now (the Showcase's own copy in a Showcase tab); none on the server or when unreadable. */
export function timerPresetsNow(): TimerPreset[] {
  if (typeof window === 'undefined') return [];
  try { const raw = getAppStorage().getItem(HABIT_EXTRAS_KEY); return raw ? readPresets(JSON.parse(raw)) : []; } catch { return []; }
}

/** The one bell of the person's "Your bell" as a plan (what a session without a preset has always rung). */
export function planFromBells(bells: Pick<BellPrefs, 'sound' | 'volume' | 'intervalMin'>, minutes: number | null): TimerPlan {
  return {minutes, warmup: 0, start: bells.sound, end: bells.sound, volume: bells.volume, intervals: bells.intervalMin && bells.sound !== 'silent' ? [{sound: bells.sound, every: bells.intervalMin * 60, times: null, from: 'start'}] : []};
}
/** A session begun from a plan: a settling-in time puts its start that far ahead; no set length plans OPEN_ENDED_SEC. */
export function startPlannedRun({now, plan, moodBefore}: {now: Date; plan: TimerPlan; moodBefore?: number}): MeditationRun {
  if (plan.minutes !== null && !int(plan.minutes, MIN_MINUTES, MAX_MINUTES)) throw new Error(`Choose whole minutes from ${MIN_MINUTES} to ${MAX_MINUTES}.`);
  const startedAt = new Date(now.getTime() + (int(plan.warmup, 0, MAX_WARMUP) ? plan.warmup : 0) * 1000).toISOString();
  return meditationRunSchema.parse({version: 1, run: {startedAt, plannedSec: plan.minutes === null ? OPEN_ENDED_SEC : plan.minutes * 60, pausedMs: 0, kind: 'timer', ...(moodBefore !== undefined ? {moodBefore} : {})}});
}
/** The run's own time, negative while it is still settling in (elapsedMs in timer.ts stops at 0). */
export function signedElapsedMs(run: Pick<Run, 'startedAt' | 'pausedAt' | 'pausedMs'>, now: number): number {
  return (run.pausedAt ? Date.parse(run.pausedAt) : now) - Date.parse(run.startedAt) - run.pausedMs;
}
export const settlingMs = (run: Pick<Run, 'startedAt' | 'pausedAt' | 'pausedMs'>, now: number) => Math.max(0, -signedElapsedMs(run, now));

export type BellAt = {at: number; sound: Exclude<BellSound, 'silent'>; kind: 'start' | 'interval' | 'end'};
/**
 * When the bells still to come fall, in milliseconds of the run's own time, after `fromMs` (negative while settling in)
 * and up to `untilMs`: the start bell at 0 if the session is still settling in (otherwise the tap that began it rang it),
 * each bell along the way (never at the start, never on the end; one counted back from the end only when there is an end),
 * and the end bell. Bells at the same moment ring once, the end bell first, then the start bell. Pure.
 */
export function planBellTimes(plan: TimerPlan, plannedSec: number, fromMs: number, untilMs = Number.POSITIVE_INFINITY): BellAt[] {
  const end = plannedSec * 1000, open = plan.minutes === null, out: BellAt[] = [];
  const add = (at: number, s: BellSound, kind: BellAt['kind']) => { if (s !== 'silent' && at > fromMs && at <= untilMs && at <= end) out.push({at, sound: s, kind}); };
  if (fromMs < 0) add(0, plan.start, 'start');
  for (const i of plan.intervals) {
    const step = i.every * 1000, limit = i.times ?? Number.POSITIVE_INFINITY;
    if (i.from === 'end') { if (open) continue; for (let k = 1, at = end - step; k <= limit && at > 0; k++, at -= step) if (at > fromMs && at <= untilMs) add(at, i.sound, 'interval'); }
    else for (let k = Math.max(1, Math.floor(Math.max(0, fromMs) / step) + 1); k <= limit && k * step < end && k * step <= untilMs; k++) add(k * step, i.sound, 'interval');
  }
  if (!open) add(end, plan.end, 'end');
  const rank = {end: 0, start: 1, interval: 2} as const, seen = new Set<number>();
  return out.sort((a, b) => a.at - b.at || rank[a.kind] - rank[b.kind]).filter(b => { if (seen.has(b.at)) return false; seen.add(b.at); return true; });
}

const SOUND_EN: Record<BellSound, string> = {bowl: 'Singing bowl', chime: 'Chime', soft: 'Soft tone', silent: 'No sound'};
const SOUND_NL: Record<BellSound, string> = {bowl: 'Klankschaal', chime: 'Klokje', soft: 'Zachte toon', silent: 'Geen geluid'};
export const soundWord = (s: BellSound, lang: 'en' | 'nl' = 'en') => (lang === 'nl' ? SOUND_NL : SOUND_EN)[s];
/** "30 s", "1 min", "1 min 30 s", "2 min". */
export function secondsText(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m && s ? `${m} min ${s} s` : m ? `${m} min` : `${s} s`;
}
/** One bell along the way in words: "Chime every 5 min, 3 times, from the start". */
export function intervalText(i: IntervalBell, lang: 'en' | 'nl' = 'en'): string {
  const every = secondsText(i.every);
  if (lang === 'nl') return `${soundWord(i.sound, 'nl')} elke ${every}${i.times !== null ? `, ${i.times} keer` : ', tot het einde'}${i.from === 'end' ? ', terugtellend vanaf het einde' : ''}`;
  return `${soundWord(i.sound)} every ${every}${i.times !== null ? `, ${i.times === 1 ? 'once' : `${i.times} times`}` : ', until the end'}${i.from === 'end' ? ', counted back from the end' : ''}`;
}
/** A preset in one line: "20 min · settle 30 s · Singing bowl to begin, Chime to end · 2 bells along the way". */
export function planSummary(plan: TimerPlan, lang: 'en' | 'nl' = 'en'): string {
  const nl = lang === 'nl', parts = [plan.minutes === null ? (nl ? 'geen vaste lengte' : 'no set length') : `${plan.minutes} min`];
  if (plan.warmup) parts.push(nl ? `${secondsText(plan.warmup)} om te landen` : `settle ${secondsText(plan.warmup)}`);
  parts.push(nl ? `${soundWord(plan.start, 'nl')} bij het begin, ${soundWord(plan.end, 'nl')} aan het einde` : `${soundWord(plan.start)} to begin, ${soundWord(plan.end)} to end`);
  if (plan.intervals.length) parts.push(nl ? `${plan.intervals.length} ${plan.intervals.length === 1 ? 'bel' : 'bellen'} onderweg` : `${plan.intervals.length} ${plan.intervals.length === 1 ? 'bell' : 'bells'} along the way`);
  return parts.join(' · ');
}

/** The running session's plan from the Health extras, only when it belongs to this run (keyed by its start). */
export function readRunPlan(healthExtras: unknown, startedAt: string): TimerPlan | null {
  const r = isObj(healthExtras) ? healthExtras.meditationRun : undefined;
  return isObj(r) && r.startedAt === startedAt ? readPlan(r.plan) : null;
}
/** The Health extras with the running session's plan set (null clears it); other fields kept. */
export function withRunPlan<T extends object>(healthExtras: T, startedAt: string | null, plan: TimerPlan | null): T {
  const {meditationRun: _drop, ...rest} = healthExtras as T & {meditationRun?: unknown}; void _drop;
  return (startedAt && plan ? {...rest, meditationRun: {startedAt, plan: storedPlan(plan)}} : rest) as T;
}
/** This device's plan for the run that began at `startedAt` (the Showcase's own copy in a Showcase tab), or null. */
export function runPlanNow(startedAt: string): TimerPlan | null {
  if (typeof window === 'undefined') return null;
  try { const raw = getAppStorage().getItem(HEALTH_EXTRAS_KEY_LITERAL); return raw ? readRunPlan(JSON.parse(raw), startedAt) : null; } catch { return null; }
}
