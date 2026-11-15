import {MAX_SPLITS, splitsRecordSchema, workoutSplitsSchema, type Split, type SplitsRecord, type WorkoutSplits} from './splits-schema';

/**
 * Session AP (feature 5): a run's pace and per-kilometre splits from its track points, worked out once at import (the
 * points are then dropped, as before). Pure. Only moving time inside a recorded segment counts (a pause between segments
 * is left out), a step faster than 15 m/s is GPS noise and is skipped, and nothing is guessed: a track without times and
 * either positions or distances gives no splits.
 */
export type TrackPoint = {t: number | null; lat: number | null; lon: number | null; dist: number | null};
type Haversine = (a: {lat: number; lon: number}, b: {lat: number; lon: number}) => number;
const MAX_STEP_SPEED = 15, MIN_METERS = 200, MIN_SECONDS = 60, LAST_SPLIT_MIN = 50;

export function computeSplits(segments: readonly (readonly TrackPoint[])[], distance: Haversine, source: WorkoutSplits['source']): WorkoutSplits | null {
  const samples: {d: number; s: number}[] = [{d: 0, s: 0}];
  let D = 0, S = 0;
  for (const seg of segments) {
    let prev: TrackPoint | null = null;
    for (const p of seg) {
      if (p.t === null || (p.dist === null && (p.lat === null || p.lon === null))) continue; // nothing to measure from
      if (prev && prev.t !== null) {
        const dt = (p.t - prev.t) / 1000;
        const dd = p.dist !== null && prev.dist !== null ? p.dist - prev.dist
          : p.lat !== null && p.lon !== null && prev.lat !== null && prev.lon !== null ? distance({lat: prev.lat, lon: prev.lon}, {lat: p.lat, lon: p.lon}) : null;
        if (dd !== null && dt > 0 && dd >= 0 && dd / dt <= MAX_STEP_SPEED) { D += dd; S += dt; samples.push({d: D, s: S}); }
      }
      prev = p;
    }
  }
  if (D < MIN_METERS || S < MIN_SECONDS) return null;
  const pace = Math.round(S / (D / 1000));
  if (pace < 60 || pace > 7200) return null;
  let i = 1; // boundaries only grow, so the search goes on from where the last one stopped
  const at = (b: number) => { while (i < samples.length && samples[i]!.d < b) i++; const hi = samples[Math.min(i, samples.length - 1)]!, lo = samples[i - 1]!; return hi.d === lo.d ? hi.s : lo.s + (hi.s - lo.s) * (b - lo.d) / (hi.d - lo.d); };
  const whole = Math.floor(D / 1000), splits: Split[] = [];
  if (whole + 1 <= MAX_SPLITS) {
    let before = 0;
    for (let km = 1; km <= whole; km++) { const s = at(km * 1000); splits.push({km, meters: 1000, seconds: Math.max(1, Math.round(s - before))}); before = s; }
    const rest = D - whole * 1000;
    if (rest >= LAST_SPLIT_MIN) splits.push({km: whole + 1, meters: Math.min(1000, Math.round(rest)), seconds: Math.max(1, Math.round(S - before))});
  }
  // Security delta (Low): a crafted file whose points span more than its laps say can give an implausible split; then the
  // workout keeps its summary without splits instead of failing the whole import.
  const parsed = workoutSplitsSchema.safeParse({source, paceSecondsPerKm: pace, splits});
  return parsed.success ? parsed.data : null;
}
/** "5:32 /km", or "1:02:10 /km" for a very slow pace. */
export function paceText(secondsPerKm: number): string {
  const s = Math.round(secondsPerKm), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r} /km` : `${m}:${r} /km`;
}
/** A split's own pace (seconds per km, a short last split scaled up). */
export const splitPace = (s: Split) => s.seconds / (s.meters / 1000);
/** Keeps a workout's splits (the import wrote the workout first). */
export function withSplits(record: SplitsRecord, workoutId: string, splits: WorkoutSplits): SplitsRecord {
  return splitsRecordSchema.parse({...record, workouts: {...record.workouts, [workoutId]: splits}});
}
/** Drops a deleted workout's splits. */
export function withoutSplits(record: SplitsRecord, workoutId: string): SplitsRecord {
  if (!Object.hasOwn(record.workouts, workoutId)) return record;
  const {[workoutId]: _gone, ...workouts} = record.workouts; void _gone;
  return splitsRecordSchema.parse({...record, workouts});
}
