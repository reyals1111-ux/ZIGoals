import {csvTable, liftNumber, liftWallClock, safeLine, type LiftSet, type LiftsPlan, type LiftWorkout} from '../../workouts/import-lifts';
import {validRpe} from '../../workouts/depth';
import {instantAt} from '../../zone-time';

/**
 * Session AK (A15): Strong's "Export Strong Data" CSV (FORMATS.md section a, confidence Low: Strong publishes no column
 * spec). One row per set: `Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds,
 * Notes, Workout Notes, RPE`; some versions name units in the header ("Weight (kg)", "Distance (meters)", "Duration
 * (sec)") or carry `Weight Unit` / `Distance Unit` columns, and some use `;`. Columns are found by name, the delimiter
 * from the header, decimal commas accepted; units come from the header when it says, else the person's own setting.
 * Rows that are not sets (Strong's rest-timer rows) are skipped and counted. Times are the phone's local time.
 */
export const STRONG_LABEL = 'Strong';
export const isStrongHeader = (line: string) => /exercise name/i.test(line) && /set order/i.test(line) && /workout name/i.test(line);
const KG_PER_LB = 0.45359237, KM_PER_MILE = 1.609344;
type Opts = {zone: string; weightUnit: 'kg' | 'lb'; distanceUnit?: 'km' | 'mi'};

/** "1h 5m", "45m", "50s", "1:05:00" or plain seconds; null when it cannot be read. */
export function strongDuration(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t));
  const clock = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(t);
  if (clock) return Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  const parts = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s)?$/.exec(t);
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) return null;
  return Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
}
const kindOf = (order: string): LiftSet['kind'] | null => /^\d+$/.test(order) ? 'normal' : /^w(arm[- ]?up)?$/i.test(order) ? 'warmup' : /^d(rop)?$/i.test(order) ? 'drop' : /^f(ailure)?$/i.test(order) ? 'failure' : null;

export async function readStrong(text: string, {zone, weightUnit, distanceUnit = 'km'}: Opts): Promise<LiftsPlan> {
  const {header, rows} = await csvTable(text, 'Strong');
  const col = (...names: string[]) => { for (const n of names) for (const [k, i] of header) if (k === n || k.startsWith(`${n} (`)) return {i, key: k}; return null; };
  const date = col('date'), exercise = col('exercise name'), order = col('set order'), workoutName = col('workout name');
  if (!date || !exercise || !order || !workoutName) throw Error('This is not a Strong export (its columns are different). In Strong: Settings → Export Strong Data, then choose that CSV.');
  const duration = col('duration'), weight = col('weight'), reps = col('reps'), distance = col('distance'), seconds = col('seconds'), notes = col('notes'), workoutNotes = col('workout notes'), rpe = col('rpe');
  const weightUnitCol = col('weight unit'), distanceUnitCol = col('distance unit');
  const headerUnit = (key: string | undefined) => key?.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
  const warnings: string[] = [], byWorkout = new Map<string, LiftWorkout>();
  let notSets = 0, badRows = 0, badValues = 0;
  for (const row of rows) {
    const get = (c: {i: number} | null) => c ? (row[c.i] ?? '').trim() : '';
    const kind = kindOf(get(order));
    if (!kind) { notSets++; continue; }
    const when = liftWallClock(get(date)), exName = safeLine(get(exercise), 80);
    if (!when || !exName) { badRows++; continue; }
    const key = `${get(date)}|${get(workoutName)}`;
    let workout = byWorkout.get(key);
    if (!workout) {
      const startMs = instantAt(when.date, when.clock, zone), secs = strongDuration(get(duration));
      workout = {name: safeLine(get(workoutName), 80) || 'Workout', startMs, endMs: secs !== null && secs > 0 && secs <= 86_400 ? startMs + secs * 1000 : null, exercises: [], ...(get(workoutNotes) ? {notes: get(workoutNotes)} : {})};
      byWorkout.set(key, workout);
    }
    // Units: the header's own word, else the row's unit column, else the person's setting.
    const wUnit = headerUnit(weight?.key) ?? (get(weightUnitCol).toLowerCase() || weightUnit), dUnit = headerUnit(distance?.key) ?? (get(distanceUnitCol).toLowerCase() || distanceUnit);
    const w = liftNumber(get(weight)), r = liftNumber(get(reps)), d = liftNumber(get(distance)), s = liftNumber(get(seconds)), e = liftNumber(get(rpe));
    if ([w, r, d, s].some(v => v === null || (typeof v === 'number' && v < 0))) { badValues++; continue; }
    const kg = w === undefined ? undefined : /^lbs?$/.test(wUnit) ? w! * KG_PER_LB : w!;
    const km = d === undefined || d === 0 ? undefined : /^(m|meters?|metres?)$/.test(dUnit) ? d! / 1000 : /^(mi|miles?)$/.test(dUnit) ? d! * KM_PER_MILE : d!;
    const set: LiftSet = {kind,
      ...(kg !== undefined && kg <= 1000 && (kg > 0 || (r ?? 0) > 0) ? {weightKg: kg} : {}),
      ...(r !== undefined && r! > 0 && Number.isInteger(r) && r! <= 1000 ? {reps: r!} : {}),
      ...(km !== undefined && km <= 1000 ? {distanceKm: km} : {}),
      ...(s !== undefined && s! > 0 && s! <= 86_400 ? {seconds: Math.round(s!)} : {}),
      ...(typeof e === 'number' && validRpe(e) ? {rpe: e} : {})};
    const last = workout.exercises.at(-1);
    if (last && last.name === exName) last.sets.push(set);
    else workout.exercises.push({name: exName, sets: [set], ...(get(notes) ? {note: get(notes)} : {})});
  }
  const workouts = [...byWorkout.values()].filter(x => x.exercises.length).sort((a, b) => a.startMs - b.startMs);
  if (!workouts.length) throw Error('This Strong export has no sets ZIGoals can read.');
  if (notSets) warnings.push(`${notSets.toLocaleString('en')} ${notSets === 1 ? 'row is' : 'rows are'} not a set (such as Strong's rest timers) and ${notSets === 1 ? 'was' : 'were'} skipped.`);
  if (badRows) warnings.push(`${badRows.toLocaleString('en')} ${badRows === 1 ? 'row has' : 'rows have'} no readable date or exercise and ${badRows === 1 ? 'was' : 'were'} skipped.`);
  if (badValues) warnings.push(`${badValues.toLocaleString('en')} ${badValues === 1 ? 'set has' : 'sets have'} a number ZIGoals cannot read and ${badValues === 1 ? 'was' : 'were'} skipped.`);
  if (!weight?.key.includes('(') && !weightUnitCol) warnings.push(`Weights are read as ${weightUnit}, your Health weight unit, because the export does not say.`);
  return {source: 'strong', label: STRONG_LABEL, workouts, warnings};
}
