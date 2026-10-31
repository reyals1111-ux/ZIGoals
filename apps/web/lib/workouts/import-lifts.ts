import {csvRows, headerIndex} from '../import/switch/csv-stream';
import {stableHash} from '../import/switch/ids';
import {CSV_FORMULA_START} from '../export/csv-safe';
import {allExercises, type LibraryExercise} from './library';
import {workoutsSchema, type CATEGORIES, type CustomExercise, type ExerciseEntry, type Measure, type Workout, type WorkoutSet, type Workouts} from './schema';
import {importInfo} from './import-file';

/**
 * Session AK (A15): workouts from lifting apps' CSV exports (Strong, Hevy; readers in lib/import/switch/strong.ts and
 * hevy.ts). Both write one row per set; this file turns those rows into finished ZIGoals workouts with their exercises
 * and sets, matches exercise names to the built-in library (or adds them as the person's own exercises), and skips a
 * workout already in the log. Read on the device; nothing is sent anywhere. Every refusal is a plain sentence.
 */
export type LiftSource = 'strong' | 'hevy';
export type LiftSet = {kind: WorkoutSet['kind']; weightKg?: number; reps?: number; distanceKm?: number; seconds?: number; rpe?: number};
export type LiftExercise = {name: string; supersetKey?: string; note?: string; sets: LiftSet[]};
export type LiftWorkout = {name: string; startMs: number; endMs: number | null; notes?: string; exercises: LiftExercise[]};
export type LiftsPlan = {source: LiftSource; label: string; workouts: LiftWorkout[]; warnings: string[]};
export const LIFTS_MAX_BYTES = 20 * 1024 * 1024, LIFTS_MAX_ROWS = 300_000;

/** A single line of text from a CSV cell: control characters out, and no leading = + - @ a spreadsheet would run. */
export function safeLine(text: string, max: number): string {
  let s = text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  while (CSV_FORMULA_START.test(s)) s = s.replace(/^[\s=+\-@＝＋－＠]+/, '').trim();
  return s.slice(0, max).trim();
}
/** A note from a CSV cell: kept as written (line breaks too) without control characters; the export guards its cells. */
export const safeNote = (text: string, max: number) => text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, max).trim();

/** The rows of a CSV export's text, the header lower-cased, with the size and row caps checked. */
export async function csvTable(text: string, what: string): Promise<{header: Map<string, number>; rows: string[][]}> {
  if (typeof text !== 'string' || !text.trim()) throw Error(`This file is empty. Choose the ${what} CSV export.`);
  if (text.length > LIFTS_MAX_BYTES) throw Error('This file is larger than 20 MB, more than ZIGoals reads from one export.');
  const head = text.slice(0, 4096);
  if (head.includes('\u0000') || head.startsWith('PK\u0003\u0004')) throw Error('This file is not CSV text (a spreadsheet or another binary file). Save it as CSV first, then choose it again.');
  const source = new ReadableStream<string>({start(c) { c.enqueue(text.replace(/^﻿/, '')); c.close(); }});
  let header: Map<string, number> | null = null; const rows: string[][] = [];
  for await (const row of csvRows(source)) {
    if (!header) { header = headerIndex(row); continue; }
    if (rows.length >= LIFTS_MAX_ROWS) throw Error('This file has more than 300,000 rows, more than ZIGoals reads from one export.');
    rows.push(row);
  }
  return {header: header ?? new Map(), rows};
}
/** "60", "60.5" or "60,5" (a decimal comma); empty is unknown (undefined), never zero; anything else is null. */
export function liftNumber(text: string | undefined): number | undefined | null {
  const t = (text ?? '').trim();
  if (!t) return undefined;
  const n = Number(/^-?\d+,\d+$/.test(t) ? t.replace(',', '.') : t);
  return Number.isFinite(n) ? n : null;
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** A local date and time from an export: "2026-10-01 08:00:00", "2026-10-01T08:00", or Hevy's "1 Oct 2026, 08:00". */
export function liftWallClock(text: string): {date: string; clock: string} | null {
  const t = text.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(t);
  let y: number, mo: number, d: number, h: number, mi: number;
  if (m) { y = +m[1]!; mo = +m[2]!; d = +m[3]!; h = +m[4]!; mi = +m[5]!; }
  else {
    m = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
    if (!m) return null;
    const month = MONTHS.indexOf(m[2]!.toLowerCase());
    if (month < 0) return null;
    y = +m[3]!; mo = month + 1; d = +m[1]!; h = +m[4]!; mi = +m[5]!;
  }
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59) return null;
  const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return null;
  return {date, clock: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`};
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
/** The library exercise (or the person's own) with this name; "(Barbell)" and "(Bodyweight)" are the library's own default. */
export function matchExercise(name: string, library: readonly LibraryExercise[]): LibraryExercise | null {
  const full = fold(name), bare = fold(name.replace(/\((?:barbell|bodyweight)\)\s*$/i, ''));
  return library.find(e => fold(e.name) === full) ?? library.find(e => fold(e.name) === bare) ?? null;
}
const GUESS: [RegExp, typeof CATEGORIES[number]][] = [
  [/plank|crunch|sit ?up|leg raise|knee raise|\bab\b|\babs\b|ab wheel|core|russian twist|hollow|dead bug|v up/, 'Core'],
  [/running|run\b|jog|walk|cycl|bike|elliptical|swim|treadmill|stair|rowing machine|row(?:ing)? ?erg|jump rope|cardio/, 'Cardio'],
  [/stretch|yoga|mobility|foam|pilates/, 'Mobility'],
  [/squat|leg press|leg curl|leg extension|lunge|calf|hip thrust|glute|hamstring|deadlift \(romanian|romanian|step up|split squat|adductor|abductor/, 'Legs'],
  [/curl|tricep|bicep|skull|pushdown|kickback|forearm|wrist/, 'Arms'],
  [/shoulder|overhead|military|lateral raise|front raise|face pull|delt|arnold|upright row|shrug/, 'Shoulders'],
  [/row|pull ?up|pulldown|chin ?up|deadlift|back|lat\b|pullover|good morning|hyperextension/, 'Back'],
  [/bench|chest|fly|flye|push ?up|dip|pec/, 'Chest'],
];
/** A muscle-group category for an exercise the library does not know, from its name; "Full body" when nothing fits. */
export const guessCategory = (name: string): typeof CATEGORIES[number] => GUESS.find(([re]) => re.test(fold(name)))?.[1] ?? 'Full body';
/** What each set records, from what the export's sets hold. */
export function measureOf(sets: readonly LiftSet[]): Measure {
  if (sets.some(s => (s.weightKg ?? 0) > 0)) return 'weight-reps';
  if (sets.some(s => (s.distanceKm ?? 0) > 0)) return 'distance-time';
  if (sets.some(s => (s.reps ?? 0) > 0)) return 'reps';
  if (sets.some(s => (s.seconds ?? 0) > 0)) return 'time';
  return 'reps';
}
const stamp = (ms: number) => new Date(Math.floor(ms / 60_000) * 60_000).toISOString().slice(0, 16).replace(/[-:]/g, '');
export const liftImportId = (source: LiftSource, startMs: number, name: string) => `${source}-${stamp(startMs)}Z-${stableHash(fold(name)).slice(0, 10)}`;

export type LiftsAdded = {workouts: Workouts; added: Workout[]; duplicates: number; newExercises: string[]; trimmed: number; future: number};
const TWO_MINUTES = 2 * 60_000;
/**
 * Adds the plan's workouts to the log as finished strength workouts, skipping one already imported or one that starts
 * within two minutes of a strength workout already in the log. `dayOf` gives a start's day in the person's Health time
 * zone. Exercises not in the library become the person's own (up to the log's 200). Refuses a whole import that would
 * pass the log's limits, so nothing is half done.
 */
export function addLiftWorkouts(w: Workouts, plan: LiftsPlan, {now, dayOf}: {now: Date; dayOf: (iso: string) => string}): LiftsAdded {
  const custom: CustomExercise[] = [...w.exercises], added: Workout[] = [], newExercises: string[] = [];
  const known = new Set(w.workouts.map(x => importInfo(x)?.importId).filter(Boolean));
  const starts = w.workouts.filter(x => x.type === 'strength').map(x => Date.parse(x.startedAt));
  let duplicates = 0, trimmed = 0, future = 0;
  for (const lw of plan.workouts) {
    const importId = liftImportId(plan.source, lw.startMs, lw.name);
    if (known.has(importId) || starts.some(s => Math.abs(s - lw.startMs) <= TWO_MINUTES)) { duplicates++; continue; }
    if (lw.startMs > now.getTime() + 10 * 60_000) { future++; continue; }
    const entries: ExerciseEntry[] = [];
    for (const le of lw.exercises.slice(0, 40)) {
      const name = safeLine(le.name, 80); if (!name) continue;
      const measure = measureOf(le.sets);
      let match = matchExercise(name, allExercises(custom));
      if (!match) {
        if (custom.length >= 200) throw Error('ZIGoals keeps up to 200 of your own exercises, and this export needs more. Nothing was imported.');
        const mine: CustomExercise = {id: `custom-${stableHash(`${plan.source}|${fold(name)}`)}`, name, category: guessCategory(name), measure};
        custom.push(mine); newExercises.push(name); match = mine;
      }
      const sets: WorkoutSet[] = le.sets.slice(0, 50).map((s, i) => ({id: `set-${stableHash(`${importId}|${entries.length}|${i}`)}`, kind: s.kind, done: true,
        ...(s.weightKg !== undefined ? {weightKg: Math.round(s.weightKg * 1000) / 1000} : {}), ...(s.reps !== undefined ? {reps: s.reps} : {}),
        ...(s.distanceKm !== undefined ? {distanceKm: Math.round(s.distanceKm * 1000) / 1000} : {}), ...(s.seconds !== undefined ? {seconds: s.seconds} : {}), ...(s.rpe !== undefined ? {rpe: s.rpe} : {})}));
      if (le.sets.length > 50 || lw.exercises.length > 40) trimmed++;
      if (!sets.length) continue;
      entries.push({id: `ex-${stableHash(`${importId}|${entries.length}`)}`, exerciseId: match.id, name: match.name, measure: match.measure, sets,
        ...(le.note ? {note: safeNote(le.note, 500)} : {}), ...(le.supersetKey ? {supersetId: `ss-${stableHash(`${importId}|${le.supersetKey}`).slice(0, 12)}`} : {})});
    }
    if (!entries.length) continue;
    // Superset ids name a group only when two or more exercises share one.
    for (const e of entries) if (e.supersetId && entries.filter(x => x.supersetId === e.supersetId).length < 2) delete e.supersetId;
    const startedAt = new Date(lw.startMs).toISOString(), end = lw.endMs !== null && lw.endMs > lw.startMs ? Math.min(lw.endMs, lw.startMs + 24 * 3_600_000) : lw.startMs + 60_000;
    const workout: Workout = {id: `workout-${stableHash(importId)}`, name: safeLine(lw.name, 80) || 'Workout', date: dayOf(startedAt), type: 'strength', startedAt, endedAt: new Date(end).toISOString(),
      exercises: entries, ...(lw.notes ? {notes: safeNote(lw.notes, 1000)} : {}), fileImport: {source: plan.source, importId, durationSeconds: Math.round((end - lw.startMs) / 1000)}};
    added.push(workout); known.add(importId); starts.push(lw.startMs);
  }
  if (w.workouts.length + added.length > 3000) throw Error(`ZIGoals keeps up to 3,000 workouts; you have ${w.workouts.length} and this export adds ${added.length}. Nothing was imported.`);
  return {workouts: workoutsSchema.parse({...w, exercises: custom, workouts: [...w.workouts, ...added]}), added, duplicates, newExercises, trimmed, future};
}
