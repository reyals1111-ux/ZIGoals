import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AV lane 2, round 4 (health; LEDGER #336, Runna's heart-rate zones; TIER 3 (stored format), a new device record):
 * five zones from a maximum heart rate the person types — never worked out from age (that would be a guess about the
 * body) — and the minutes in each zone, from the seconds at each heart rate counted at import from a GPX or TCX file's own
 * points and kept with the run. The zones are 50–60, 60–70, 70–80, 80–90 and 90–100 % of that maximum, the five-zone split
 * of Sally Edwards' Heart Zones Training (The Heart Rate Monitor Book, 1993); an estimate from the typed maximum, not
 * medical advice and never a target.
 *
 * Its own key, `zigoals:workout-hr:v1`, loose and versioned: the splits record (lib/workouts/splits-schema.ts) is strict, so
 * a field added there would make an older build refuse every run's splits. By workout id: the seconds at each whole beat
 * per minute from `from` up (so a later change of the maximum re-counts the zones, nothing is lost); an unreadable run is
 * dropped and the others kept. Workouts imported earlier keep their average only (the points were never kept). Never the
 * route. Device-only; exported, restored and erased with the account. Pure.
 */
export const WORKOUT_HR_KEY = 'zigoals:workout-hr:v1';
export const MAX_HR_RUNS = 2000, HR_LOW = 20, HR_HIGH = 250, MAX_HR_MIN = 100, MAX_HR_MAX = 230;
/** The longest gap between two points that still counts as time at the earlier point's heart rate (a pause counts no longer). */
export const HR_GAP_SECONDS = 30;
export const ZONE_EDGES = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
export const ZONE_SOURCE = 'Sally Edwards, Heart Zones Training (The Heart Rate Monitor Book, 1993)';
const workoutId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).refine(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype', 'Not a workout id.');
export const hrHistogramSchema = z.looseObject({from: z.number().int().min(HR_LOW).max(HR_HIGH), seconds: z.array(z.number().int().min(0).max(172_800)).min(1).max(HR_HIGH - HR_LOW + 1)});
export type HrHistogram = z.infer<typeof hrHistogramSchema>;
const runsSchema = z.preprocess(v => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k, x]) => workoutId.safeParse(k).success && hrHistogramSchema.safeParse(x).success).slice(-MAX_HR_RUNS)) : v, z.record(workoutId, hrHistogramSchema));
export const workoutHrSchema = z.looseObject({version: z.literal(1), maxHr: z.number().int().min(MAX_HR_MIN).max(MAX_HR_MAX).optional().catch(undefined), runs: runsSchema.default({})});
export type WorkoutHr = z.infer<typeof workoutHrSchema>;
export const emptyWorkoutHr = (): WorkoutHr => ({version: 1, runs: {}});
export const WORKOUT_HR: DeviceRecordSpec<WorkoutHr> = {key: WORKOUT_HR_KEY, schema: workoutHrSchema, empty: emptyWorkoutHr};

/** Seconds at each heart rate from a file's points, segment by segment (each to the next, at most 30 s), or null with none. */
export function hrHistogram(segments: readonly (readonly {t: number | null; hr: number | null}[])[]): HrHistogram | null {
  const at = new Map<number, number>();
  for (const seg of segments) {
    const timed = seg.filter(p => p.t !== null);
    for (let i = 0; i + 1 < timed.length; i++) {
      const p = timed[i]!, dt = Math.min(HR_GAP_SECONDS, (timed[i + 1]!.t! - p.t!) / 1000);
      if (p.hr === null || !(dt > 0) || p.hr < HR_LOW || p.hr > HR_HIGH) continue;
      const bpm = Math.round(p.hr); at.set(bpm, (at.get(bpm) ?? 0) + dt);
    }
  }
  if (!at.size) return null;
  const from = Math.min(...at.keys()), to = Math.max(...at.keys()), seconds = Array.from({length: to - from + 1}, (_, i) => Math.round(at.get(from + i) ?? 0));
  return seconds.some(s => s > 0) ? {from, seconds} : null;
}
export const withHr = (r: WorkoutHr, id: string, h: HrHistogram): WorkoutHr => workoutHrSchema.parse({...r, runs: {...r.runs, [id]: h}});
export const withoutHr = (r: WorkoutHr, id: string): WorkoutHr => { const runs = {...r.runs}; delete runs[id]; return workoutHrSchema.parse({...r, runs}); };
/**
 * Keeps the maximum the person typed, or says what to fix. Review B4E-5: a blank field is refused (it removed the maximum,
 * and with it every run's zones, on an empty "Change it"); removing is its own choice, `clearMaxHr`, with Undo on the page.
 */
export function setMaxHr(r: WorkoutHr, text: string): {ok: true; value: WorkoutHr} | {ok: false; message: string} {
  const t = text.trim(), n = Number(t);
  if (!/^\d+$/.test(t) || n < MAX_HR_MIN || n > MAX_HR_MAX) return {ok: false, message: `Enter your maximum heart rate as a whole number from ${MAX_HR_MIN} to ${MAX_HR_MAX} beats a minute.`};
  return {ok: true, value: workoutHrSchema.parse({...r, maxHr: n})};
}
export const clearMaxHr = (r: WorkoutHr): WorkoutHr => { const rest: Record<string, unknown> = {...r}; delete rest.maxHr; return workoutHrSchema.parse(rest); };
export type Zone = {zone: 1 | 2 | 3 | 4 | 5; from: number; to: number; seconds: number};
/** Each zone's beats-a-minute range from the maximum (rounded to whole beats; zone 5 runs to the maximum and above it). */
export const zoneRanges = (maxHr: number) => ZONE_EDGES.map((e, i) => ({zone: (i + 1) as Zone['zone'], from: Math.round(e * maxHr), to: i < 4 ? Math.round(ZONE_EDGES[i + 1]! * maxHr) - 1 : maxHr}));
/** The seconds in each zone, and below zone 1, from a run's histogram and the maximum. */
export function zoneSeconds(h: HrHistogram, maxHr: number): {zones: Zone[]; below: number; total: number} {
  const ranges = zoneRanges(maxHr), zones: Zone[] = ranges.map(r => ({...r, seconds: 0}));
  let below = 0;
  h.seconds.forEach((s, i) => {
    const bpm = h.from + i;
    if (bpm < ranges[0]!.from) { below += s; return; }
    const z = [...ranges].reverse().find(r => bpm >= r.from)!;
    zones[z.zone - 1]!.seconds += s;
  });
  return {zones, below, total: below + zones.reduce((t, z) => t + z.seconds, 0)};
}
/** "Zone 2: 24 min" lines; minutes rounded, under a minute shown as "under 1 min". */
export const zoneMinutes = (s: number) => s < 30 ? (s ? 'under 1 min' : '0 min') : `${Math.round(s / 60)} min`;
