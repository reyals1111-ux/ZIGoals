import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AW (X1, LEDGER #440; Due's named timers; TIER 3 (stored format)): several named countdowns at once ("Pasta
 * 9 min", "Laundry 45 min"), each kept to start again — up to 20 on this device, the least recently used leaving first. A
 * new device record `zigoals:timers:v1`, loose and versioned, device only (never synced), in Export everything, its
 * restore and Erase everything. A timer is running (`endsAt`), paused (`left` seconds), ended (its `endsAt` has passed;
 * `rang` once the page rang its bell) or simply kept. `bell: false` mutes the bell in the page. Pure: the instant comes
 * in; lib/timers/start.ts writes.
 */
export const TIMERS_KEY = 'zigoals:timers:v1';
export const MAX_TIMERS = 20, TIMER_NAME_MAX = 40, MAX_TIMER_SECONDS = 24 * 3600;
const ID = /^tm-[A-Za-z0-9_-]{1,60}$/;
export const timerSchema = z.looseObject({
  id: z.string().regex(ID),
  name: z.string().trim().min(1).max(TIMER_NAME_MAX),
  seconds: z.number().int().min(1).max(MAX_TIMER_SECONDS),
  /** When it ends (ms) while it runs or after it ended. */
  endsAt: z.number().int().min(0).optional().catch(undefined),
  /** Seconds left while it is paused. */
  left: z.number().int().min(1).max(MAX_TIMER_SECONDS + 60 * 600).optional().catch(undefined),
  /** The end the page rang its bell for (ms), so it rings once whichever tab is open. */
  rang: z.number().int().min(0).optional().catch(undefined),
  /** Last started or kept (ms): the least recently used leaves first past twenty. */
  used: z.number().int().min(0),
});
export type Timer = z.infer<typeof timerSchema>;
export const timersSchema = z.looseObject({
  version: z.literal(1),
  // A timer this build cannot read is skipped, never the whole list.
  timers: z.preprocess(v => Array.isArray(v) ? v.filter(t => timerSchema.safeParse(t).success).slice(0, MAX_TIMERS) : [], z.array(timerSchema)),
  bell: z.boolean().optional().catch(undefined),
});
export type Timers = z.infer<typeof timersSchema>;
export const emptyTimers = (): Timers => ({version: 1, timers: []});
export const TIMERS: DeviceRecordSpec<Timers> = {key: TIMERS_KEY, schema: timersSchema, empty: emptyTimers};

export type TimerState = 'running' | 'paused' | 'ended' | 'kept';
export function timerState(t: Timer, now: number): TimerState {
  if (t.left !== undefined) return 'paused';
  if (t.endsAt === undefined) return 'kept';
  return t.endsAt > now ? 'running' : 'ended';
}
/** Whole seconds left (0 once ended; the paused amount while paused; the full length while kept). */
export function secondsLeft(t: Timer, now: number): number {
  const s = timerState(t, now);
  return s === 'paused' ? t.left! : s === 'running' ? Math.ceil((t.endsAt! - now) / 1000) : s === 'ended' ? 0 : t.seconds;
}
/** The timers on screen: running and paused (soonest end first), then the ended ones not yet stopped. */
export function activeTimers(r: Timers, now: number): Timer[] {
  const end = (t: Timer) => timerState(t, now) === 'paused' ? now + t.left! * 1000 : t.endsAt ?? Infinity;
  return r.timers.filter(t => timerState(t, now) !== 'kept').sort((a, b) => end(a) - end(b) || a.name.localeCompare(b.name));
}
/** The kept timers to start again, most recently used first. */
export const keptTimers = (r: Timers) => [...r.timers].sort((a, b) => b.used - a.used);
/** Ended and not rung yet: the page rings these once and marks them. */
export const toRing = (r: Timers, now: number) => r.timers.filter(t => t.endsAt !== undefined && t.left === undefined && t.endsAt <= now && t.rang !== t.endsAt);
/** "8:59", "1:02:03". */
export function clockOf(seconds: number): string {
  const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
/** "9 min", "1 h 30 min", "45 s" — a timer's length in words. */
export function lengthWords(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : '', s ? `${s} s` : ''].filter(Boolean).join(' ') || '0 s';
}
/** A spoken length ("8 minutes 59 seconds"), for the screen reader's names. */
export function spokenLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60, p = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return [h ? p(h, 'hour') : '', m ? p(m, 'minute') : '', r || !(h || m) ? p(r, 'second') : ''].filter(Boolean).join(' ');
}
/**
 * A typed length: "9" (minutes), "9 min", "1:30" (minutes:seconds), "1:02:00", "45m", "1h 30m", "90 s", "1,5 uur". Null
 * when it is not a length from 1 second to 24 hours.
 */
export function parseLength(text: string): number | null {
  const t = text.trim().toLowerCase().replace(',', '.');
  if (!t) return null;
  let seconds: number | null = null;
  if (/^\d+(?:\.\d+)?$/.test(t)) seconds = Math.round(Number(t) * 60);
  else if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(t)) { const p = t.split(':').map(Number); seconds = p.length === 3 ? p[0]! * 3600 + p[1]! * 60 + p[2]! : p[0]! * 60 + p[1]!; if (p.slice(1).some(x => x > 59)) seconds = null; }
  else {
    const re = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|uur|u|m|min|mins|minutes?|minuten?|s|sec|secs|seconds?|seconden?)\b/g;
    let total = 0, found = false, m: RegExpExecArray | null;
    while ((m = re.exec(t))) { const n = Number(m[1]), u = m[2]!; total += u.startsWith('h') || u === 'uur' || u === 'u' ? n * 3600 : u.startsWith('m') ? n * 60 : n; found = true; }
    const rest = t.replace(re, ' ').replace(/\b(?:en|and)\b|\+/g, ' ').trim();
    seconds = found && !rest ? Math.round(total) : null;
  }
  return seconds !== null && seconds >= 1 && seconds <= MAX_TIMER_SECONDS ? seconds : null;
}
const touch = (r: Timers, id: string, change: (t: Timer) => Timer): Timers => {
  if (!r.timers.some(t => t.id === id)) throw new Error('That timer is no longer on this device.');
  return {...r, timers: r.timers.map(t => t.id === id ? change(t) : t)};
};
const without = <T extends object>(t: T, ...keys: (keyof T)[]): T => { const c = {...t}; for (const k of keys) delete c[k]; return c; };
/**
 * Starts a named timer: the kept one of the same name and length starts again, else a new one is kept (past twenty, the
 * least recently used that is not running leaves). Throws, with nothing changed, when it cannot be kept.
 */
export function startTimer(r: Timers, {name, seconds}: {name: string; seconds: number}, now: number, id: string): {timers: Timers; timer: Timer} {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, TIMER_NAME_MAX);
  if (!clean) throw new Error('A timer needs a name, for example “Pasta”.');
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_TIMER_SECONDS) throw new Error('A timer runs from 1 second to 24 hours.');
  const same = r.timers.find(t => t.name.toLocaleLowerCase() === clean.toLocaleLowerCase() && t.seconds === seconds);
  if (same) { const timers = startAgain(r, same.id, now); return {timers, timer: timers.timers.find(t => t.id === same.id)!}; }
  const timer: Timer = timerSchema.parse({id, name: clean, seconds, endsAt: now + seconds * 1000, used: now});
  let list = [...r.timers, timer];
  while (list.length > MAX_TIMERS) {
    const leave = [...list].filter(t => t.id !== id && timerState(t, now) === 'kept').sort((a, b) => a.used - b.used)[0];
    if (!leave) throw new Error('Twenty timers is the most this device keeps, and they are all running. Stop one first.');
    list = list.filter(t => t.id !== leave.id);
  }
  return {timers: {...r, timers: list}, timer};
}
/** A kept (or ended) timer from its full length again. */
export const startAgain = (r: Timers, id: string, now: number): Timers => touch(r, id, t => ({...without(t, 'left', 'rang'), endsAt: now + t.seconds * 1000, used: now}));
export function pauseTimer(r: Timers, id: string, now: number): Timers {
  return touch(r, id, t => timerState(t, now) === 'running' ? {...without(t, 'endsAt'), left: Math.max(1, Math.ceil((t.endsAt! - now) / 1000))} : t);
}
export function resumeTimer(r: Timers, id: string, now: number): Timers {
  return touch(r, id, t => t.left !== undefined ? {...without(t, 'left'), endsAt: now + t.left * 1000, used: now} : t);
}
/** One more minute: on a running or paused timer, or an ended one runs a minute again. */
export function addMinute(r: Timers, id: string, now: number): Timers {
  return touch(r, id, t => {
    const s = timerState(t, now);
    if (s === 'paused') return {...t, left: Math.min(t.left! + 60, MAX_TIMER_SECONDS + 60 * 600)};
    if (s === 'running') return {...t, endsAt: t.endsAt! + 60_000};
    return {...without(t, 'rang'), endsAt: now + 60_000, used: now};
  });
}
/** Stopped: it stays kept, to start again. */
export const stopTimer = (r: Timers, id: string): Timers => touch(r, id, t => without(t, 'endsAt', 'left', 'rang'));
export const removeTimer = (r: Timers, id: string): Timers => ({...r, timers: r.timers.filter(t => t.id !== id)});
export const markRang = (r: Timers, ids: readonly string[], now: number): Timers => ({...r, timers: r.timers.map(t => ids.includes(t.id) && t.endsAt !== undefined && t.endsAt <= now ? {...t, rang: t.endsAt} : t)});
export const setBell = (r: Timers, on: boolean): Timers => on ? without(r, 'bell') : {...r, bell: false};
export const bellOn = (r: Timers) => r.bell !== false;
