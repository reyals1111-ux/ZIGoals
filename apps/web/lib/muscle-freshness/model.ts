import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {finished} from '../workouts/engine';
import {CATEGORY_MUSCLES, FATIGUE_PER_SET, MUSCLE_GROUPS, RECOVERY_DAYS, type Freshness, type MuscleGroup} from '../workouts/depth';
import type {CATEGORIES, Workouts} from '../workouts/schema';

/**
 * Session AK (COMPETITORS.md T3, item 8): muscle freshness with the person's own recovery days. The model is lib/workouts/
 * depth.ts's (Fitbod's help figure): each session tires a muscle group by its working sets × 12 points (at most 100),
 * recovering in a straight line; freshness is 100 less what is still to recover. Here the straight line takes each group's
 * own number of days (6 unless the person changed it). With every group at 6 days the result is exactly depth.ts's.
 * An estimate from the log, never a measurement; it is labelled so wherever it shows.
 *
 * The recovery days are a device record, `zigoals:muscle-recovery:v1` = {version: 1, days?: {[group]: 1…14}} (loose,
 * versioned; an absent group uses 6). Nothing else is stored.
 */
export const MUSCLE_RECOVERY_KEY = 'zigoals:muscle-recovery:v1';
export const MIN_RECOVERY_DAYS = 1, MAX_RECOVERY_DAYS = 14;
const days = z.number().int().min(MIN_RECOVERY_DAYS).max(MAX_RECOVERY_DAYS);
export const muscleRecoverySchema = z.looseObject({
  version: z.literal(1),
  days: z.looseObject(Object.fromEntries(MUSCLE_GROUPS.map(m => [m, days.optional()])) as Record<MuscleGroup, z.ZodOptional<typeof days>>).optional(),
});
export type MuscleRecovery = z.infer<typeof muscleRecoverySchema>;
export const MUSCLE_RECOVERY: DeviceRecordSpec<MuscleRecovery> = {key: MUSCLE_RECOVERY_KEY, schema: muscleRecoverySchema, empty: () => ({version: 1})};
export const recoveryDaysOf = (r: MuscleRecovery | null | undefined, m: MuscleGroup): number => r?.days?.[m] ?? RECOVERY_DAYS;
/** Sets one group's days (null goes back to 6, the default, which is then not stored). */
export function setRecoveryDays(r: MuscleRecovery, m: MuscleGroup, value: number | null): MuscleRecovery {
  if (!(MUSCLE_GROUPS as readonly string[]).includes(m)) throw Error('Choose a muscle group.');
  if (value !== null && !(Number.isInteger(value) && value >= MIN_RECOVERY_DAYS && value <= MAX_RECOVERY_DAYS)) throw Error(`Choose ${MIN_RECOVERY_DAYS} to ${MAX_RECOVERY_DAYS} days.`);
  const next: Partial<Record<MuscleGroup, number>> = {...(r.days ?? {})};
  if (value === null || value === RECOVERY_DAYS) delete next[m]; else next[m] = value;
  const rest: Record<string, unknown> = {...r}; delete rest.days;
  return muscleRecoverySchema.parse(Object.keys(next).length ? {...rest, days: next} : rest);
}

type Lookup = (exerciseId: string) => typeof CATEGORIES[number] | null;
const DAY = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
/** Per muscle group: last trained, days since, and freshness 0–100 (null: never in the log, unknown rather than 100). */
export function freshnessWithRecovery(w: Workouts, lookup: Lookup, now: Date, today: string, recovery?: MuscleRecovery | null): Freshness[] {
  const last = new Map<MuscleGroup, string>(), tired = new Map<MuscleGroup, number>(MUSCLE_GROUPS.map(m => [m, 0]));
  for (const x of finished(w)) {
    if (x.date > today) continue;
    const age = Math.max(0, (now.getTime() - Date.parse(x.endedAt!)) / DAY);
    const sets = new Map<MuscleGroup, number>();
    for (const e of x.exercises) {
      const category = lookup(e.exerciseId); if (!category) continue;
      const n = e.sets.filter(s => s.kind !== 'warmup').length; if (!n) continue;
      for (const g of CATEGORY_MUSCLES[category]) sets.set(g, (sets.get(g) ?? 0) + n);
    }
    for (const [g, n] of sets) {
      if (!last.has(g) || x.date > last.get(g)!) last.set(g, x.date);
      const left = Math.max(0, 1 - age / recoveryDaysOf(recovery, g));
      if (left > 0) tired.set(g, tired.get(g)! + Math.min(100, n * FATIGUE_PER_SET) * left);
    }
  }
  return MUSCLE_GROUPS.map(muscle => {
    const date = last.get(muscle) ?? null;
    return {muscle, lastDate: date, daysSince: date === null ? null : Math.max(0, dayNumber(today) - dayNumber(date)), freshness: date === null ? null : Math.round(Math.max(0, 100 - tired.get(muscle)!))};
  });
}

/** A word for each band, so colour is never the only signal. */
export type FreshBand = 'fresh' | 'recovering' | 'tired' | 'unknown';
export const FRESH_AT = 90, TIRED_BELOW = 50;
export const bandOf = (freshness: number | null): FreshBand => freshness === null ? 'unknown' : freshness >= FRESH_AT ? 'fresh' : freshness >= TIRED_BELOW ? 'recovering' : 'tired';
export const BAND_WORDS: Record<FreshBand, string> = {fresh: 'fresh', recovering: 'recovering', tired: 'worked recently', unknown: 'not in your log yet'};
/** "legs, back": the groups at 90 % or more, the most rested first (ties in the usual order). */
export function freshToday(rows: readonly Freshness[]): string[] {
  return rows.filter(r => r.freshness !== null && r.freshness >= FRESH_AT).sort((a, b) => b.freshness! - a.freshness! || MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle)).map(r => r.muscle.toLowerCase());
}
/** "Fresh today: legs, back", or null when no group is fresh or none is in the log yet. */
export function freshTodayLine(rows: readonly Freshness[]): string | null {
  const names = freshToday(rows);
  return names.length ? `Fresh today: ${names.join(', ')}` : null;
}

/**
 * The body diagram's regions: a simple front and back outline (viewBox 0 0 340 230), each region the muscle group it
 * shows. Shapes are plain rounded rectangles and ellipses, authored here. Each group is named once per view in a column
 * beside the figure (front on the left, back on the right) with a thin line to its region, so the words never sit on
 * the colours.
 */
export type BodyShape = {muscle: MuscleGroup; kind: 'rect'; x: number; y: number; w: number; h: number; r: number} | {muscle: MuscleGroup; kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number};
export type BodyLabel = {muscle: MuscleGroup; x: number; y: number; anchor: 'start' | 'end'; to: {x: number; y: number}};
export type BodyView = {view: 'front' | 'back'; cx: number; shapes: BodyShape[]; labels: BodyLabel[]};
const figure = (cx: number, back: boolean): BodyView => {
  const shapes: BodyShape[] = [
    {muscle: 'Shoulders', kind: 'ellipse', cx: cx - 26, cy: 52, rx: 12, ry: 10}, {muscle: 'Shoulders', kind: 'ellipse', cx: cx + 26, cy: 52, rx: 12, ry: 10},
    {muscle: 'Arms', kind: 'rect', x: cx - 44, y: 62, w: 13, h: 58, r: 6}, {muscle: 'Arms', kind: 'rect', x: cx + 31, y: 62, w: 13, h: 58, r: 6},
    back ? {muscle: 'Back', kind: 'rect', x: cx - 20, y: 46, w: 40, h: 66, r: 8} : {muscle: 'Chest', kind: 'rect', x: cx - 20, y: 46, w: 40, h: 28, r: 8},
    ...(back ? [] : [{muscle: 'Core' as const, kind: 'rect' as const, x: cx - 16, y: 78, w: 32, h: 34, r: 6}]),
    {muscle: 'Legs', kind: 'rect', x: cx - 19, y: 120, w: 17, h: 92, r: 7}, {muscle: 'Legs', kind: 'rect', x: cx + 2, y: 120, w: 17, h: 92, r: 7},
  ];
  const x = back ? 336 : 4, anchor = back ? 'end' as const : 'start' as const, s = back ? 1 : -1;
  const label = (muscle: MuscleGroup, y: number, to: {x: number; y: number}): BodyLabel => ({muscle, x, y, anchor, to});
  return {view: back ? 'back' : 'front', cx, shapes, labels: back
    ? [label('Shoulders', 40, {x: cx + 30, y: 48}), label('Back', 80, {x: cx + 12, y: 80}), label('Arms', 112, {x: cx + 38, y: 108}), label('Legs', 172, {x: cx + 12, y: 168})]
    : [label('Shoulders', 40, {x: cx + s * 30, y: 48}), label('Chest', 62, {x: cx - 12, y: 60}), label('Core', 96, {x: cx - 8, y: 96}), label('Arms', 120, {x: cx - 38, y: 112}), label('Legs', 172, {x: cx - 12, y: 168})]};
};
export const BODY_VIEWBOX = '0 0 340 230';
export const BODY_VIEWS: readonly BodyView[] = [figure(110, false), figure(230, true)];
/** Head centres, drawn neutral (no muscle group). */
export const BODY_HEADS = BODY_VIEWS.map(v => ({cx: v.cx, cy: 22, r: 13}));
