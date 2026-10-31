import {csvTable, liftNumber, liftWallClock, safeLine, type LiftSet, type LiftsPlan, type LiftWorkout} from '../../workouts/import-lifts';
import {validRpe} from '../../workouts/depth';
import {instantAt} from '../../zone-time';

/**
 * Session AK (A15): Hevy's "Export Workouts" CSV (FORMATS.md section a, confidence Low/Medium: from real exports, not a
 * published spec). One row per set: `title, start_time, end_time, description, exercise_title, superset_id,
 * exercise_notes, set_index, set_type, weight_kg (or weight_lbs), reps, distance_km (or distance_miles),
 * duration_seconds, rpe`. `set_type` normal / warmup / dropset / failure maps onto ZIGoals' set kinds; a shared
 * `superset_id` becomes a superset. Times are the phone's local time ("1 Oct 2026, 08:00").
 */
export const HEVY_LABEL = 'Hevy';
export const isHevyHeader = (line: string) => /exercise_title/i.test(line) && /start_time/i.test(line) && /set_type/i.test(line);
const KG_PER_LB = 0.45359237, KM_PER_MILE = 1.609344;
const KINDS: Record<string, LiftSet['kind']> = {normal: 'normal', warmup: 'warmup', 'warm-up': 'warmup', dropset: 'drop', drop: 'drop', failure: 'failure'};

export async function readHevy(text: string, {zone}: {zone: string}): Promise<LiftsPlan> {
  const {header, rows} = await csvTable(text, 'Hevy');
  const at = (name: string) => header.get(name);
  const title = at('title'), start = at('start_time'), end = at('end_time'), exercise = at('exercise_title'), type = at('set_type');
  if (title === undefined || start === undefined || exercise === undefined || type === undefined) throw Error('This is not a Hevy workouts export (its columns are different). In Hevy: Profile → Settings → Export & Import Data → Export Workouts.');
  const lbs = at('weight_lbs') !== undefined && at('weight_kg') === undefined, miles = at('distance_miles') !== undefined && at('distance_km') === undefined;
  const weight = at('weight_kg') ?? at('weight_lbs'), distance = at('distance_km') ?? at('distance_miles');
  const reps = at('reps'), seconds = at('duration_seconds'), rpe = at('rpe'), superset = at('superset_id'), exNotes = at('exercise_notes'), description = at('description');
  const warnings: string[] = [], byWorkout = new Map<string, LiftWorkout>();
  let badRows = 0, badValues = 0, unknownType = 0;
  for (const row of rows) {
    const get = (i: number | undefined) => i === undefined ? '' : (row[i] ?? '').trim();
    const when = liftWallClock(get(start)), exName = safeLine(get(exercise), 80);
    if (!when || !exName) { badRows++; continue; }
    const key = `${get(start)}|${get(title)}`;
    let workout = byWorkout.get(key);
    if (!workout) {
      const startMs = instantAt(when.date, when.clock, zone), endWhen = liftWallClock(get(end));
      const endMs = endWhen ? instantAt(endWhen.date, endWhen.clock, zone) : null;
      workout = {name: safeLine(get(title), 80) || 'Workout', startMs, endMs: endMs !== null && endMs > startMs ? endMs : null, exercises: [], ...(get(description) ? {notes: get(description)} : {})};
      byWorkout.set(key, workout);
    }
    let kind = KINDS[get(type).toLowerCase()];
    if (!kind) { unknownType++; kind = 'normal'; }
    const w = liftNumber(get(weight)), r = liftNumber(get(reps)), d = liftNumber(get(distance)), s = liftNumber(get(seconds)), e = liftNumber(get(rpe));
    if ([w, r, d, s].some(v => v === null || (typeof v === 'number' && v < 0))) { badValues++; continue; }
    const kg = w === undefined ? undefined : lbs ? w! * KG_PER_LB : w!, km = d === undefined || d === 0 ? undefined : miles ? d! * KM_PER_MILE : d!;
    const set: LiftSet = {kind,
      ...(kg !== undefined && kg <= 1000 ? {weightKg: kg} : {}),
      ...(r !== undefined && r! > 0 && Number.isInteger(r) && r! <= 1000 ? {reps: r!} : {}),
      ...(km !== undefined && km <= 1000 ? {distanceKm: km} : {}),
      ...(s !== undefined && s! > 0 && s! <= 86_400 ? {seconds: Math.round(s!)} : {}),
      ...(typeof e === 'number' && validRpe(e) ? {rpe: e} : {})};
    const group = get(superset), last = workout.exercises.at(-1);
    if (last && last.name === exName && (last.supersetKey ?? '') === group) last.sets.push(set);
    else workout.exercises.push({name: exName, sets: [set], ...(group ? {supersetKey: group} : {}), ...(get(exNotes) ? {note: get(exNotes)} : {})});
  }
  const workouts = [...byWorkout.values()].filter(x => x.exercises.length).sort((a, b) => a.startMs - b.startMs);
  if (!workouts.length) throw Error('This Hevy export has no sets ZIGoals can read.');
  if (badRows) warnings.push(`${badRows.toLocaleString('en')} ${badRows === 1 ? 'row has' : 'rows have'} no readable start time or exercise and ${badRows === 1 ? 'was' : 'were'} skipped.`);
  if (badValues) warnings.push(`${badValues.toLocaleString('en')} ${badValues === 1 ? 'set has' : 'sets have'} a number ZIGoals cannot read and ${badValues === 1 ? 'was' : 'were'} skipped.`);
  if (unknownType) warnings.push(`${unknownType.toLocaleString('en')} ${unknownType === 1 ? 'set has' : 'sets have'} a set type ZIGoals does not know; ${unknownType === 1 ? 'it is' : 'they are'} kept as working sets.`);
  return {source: 'hevy', label: HEVY_LABEL, workouts, warnings};
}
