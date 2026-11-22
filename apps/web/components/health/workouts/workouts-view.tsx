'use client';
import {setBest, SET_BEST_WORDS, withEarlier, type SetBest} from '../../../lib/workouts/set-best';
import Link from 'next/link';
import {LoggingFor, useLinkedDay} from '../health-day';
import {lazy, Suspense, useEffect, useMemo, useState, type ReactNode} from 'react';
import {NebulaFlow} from '../../nebula-flow';
import {ConfirmInline} from '../../ui/confirm-inline';
import {showStatus, showUndo} from '../../ui/undo-toast';
import {removeWithUndo} from '../../ui/remove-with-undo';
import {reinsertItems, removedItems, type Removed} from '../../../lib/undo-removal';
import {useHealth} from '../use-health';
import {dailyData, healthDay, healthZone} from '../../../lib/health-daily';
import {newHealthId, removeHealthItem, saveActivity} from '../../../lib/health';
import {plainErrorMessage} from '../../../lib/plain-error';
import {formatDate, formatNumber, formatTime} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {replaceInWorkout} from '../../../lib/workouts/replace-entry';
import {addCustomExercise, addExercise, addSet, discardWorkout, doneSets, durationMinutes, exerciseHistory, finished, oneRepMax, finishWorkout, inProgress, lastEntryFor, moveExercise, removeExercise, removeSet, removeTemplate, removeWorkout, renameWorkout, saveTemplate, setExerciseNote, setReady, setRest, startWorkout, updateSet, volumeKg, weekSummary, withActivity, type PersonalBest} from '../../../lib/workouts/engine';
import {allExercises, searchExercises, type LibraryExercise} from '../../../lib/workouts/library';
import {leaveSuperset, restAfter, restFor, RPE_VALUES, RPE_WORDS, setExerciseRest, setRpe, supersetLabels, supersetWithNext} from '../../../lib/workouts/depth';
import {importInfo} from '../../../lib/workouts/import-file';
import type {LiftsPlan} from '../../../lib/workouts/import-lifts';
import {CATEGORIES, MEASURES, SET_KINDS, type ExerciseEntry, type Measure, type Workout, type WorkoutSet, type Workouts} from '../../../lib/workouts/schema';
import {clock, estimateShown, weightPrefillText, fromUnit, readClock, setText, weightShown} from './units';
import {useWorkouts} from './use-workouts';
import {WorkoutsImport, importedLine, type ImportChoice} from './workouts-import';
import {useDeviceRecord} from '../../ai/use-device-record';
import {WORKOUT_SPLITS, type WorkoutSplits} from '../../../lib/workouts/splits-schema';
import {withSplits, withoutSplits} from '../../../lib/workouts/splits';
import {WorkoutSplitsTable} from './workout-splits';
import './workouts.css';
import {ArtNote} from '../../illustrations/art-note';
import {Skeleton} from '../../ui/skeleton';
import {SlowReload} from '../slow-reload';
import {pinnedNoteOf, setPinnedNote} from '../../../lib/workouts/notes';
import {routineGroups, saveGuide} from '../../../lib/workouts/routines';
import {addSharedRoutine} from '../../../lib/workouts/share';
import {LOAD_WORDS, setExerciseUnit, setLoad, unitFor} from '../../../lib/workouts/bodyweight';
import {exerciseSeries, type SeriesMetric} from '../../../lib/workouts/analytics';
import {goalProgress, runSummary, runWords} from '../../../lib/workouts/runs';
import {seedSeen, setRunShoe, withUsualShoe} from '../../../lib/workouts/shoes';
import {progressed, targetFor, type Target} from '../../../lib/workouts/progression';
import {guideLine, guideOf, routineLang, type Guide, type Lang} from '../../../lib/workouts/routine-library';
// Session AV lane 2 (bodymind-r2; LEDGER #239–#241, Fitbod): the place for now filters what is offered (constants only here).
import {WORKOUT_PLACES, type Place, type WorkoutPlaces} from '../../../lib/workouts/places-schema';
import {availableWith} from '../../../lib/workouts/equipment';
import {WORKOUT_HR, withHr, withoutHr} from '../../../lib/workouts/hr-zones';
// Session AV lane 2, round 5 (gym; LEDGER #374): a workout status (kept in the plan's record) and the days it covered.
import {PLANNED_WORKOUTS} from '../../../lib/workouts/planned';
import {currentStatus, pausesOf, STATUS_WORDS} from '../../../lib/workouts/status';
// Session AV lane 2, round 5 (gym; LEDGER #373): a routine that keeps its last weights.
import {keepLastWeights, restoreRoutine} from '../../../lib/workouts/keep-weights';
// Session AV lane 2, round 5 (gym; LEDGER #377): a workout's star (Favourites); its photos load in their own chunk.
import {setStar} from '../../../lib/workouts/journal';
/** Session AL (P-MO-82, MO-137): "under 1 min" rather than "0 min" for a workout of seconds. */
const minText = (m: number) => m < 1 ? 'under 1 min' : `${m} min`;

// Session AK (4.9): the warm-up and plate calculators and the muscle-group view load only when used.
const WorkoutTools = lazy(() => import('./workouts-tools'));
// Session AV (follow-up 1, F-WORKOUT-WEEKS): the last 12 weeks, its own chunk.
const WeeklyChart = lazy(() => import('./weekly-chart'));
// Session AV (follow-up 1, F-RUN-BESTS): the fastest 1, 5 and 10 km and the longest run, its own chunk.
const RunBests = lazy(() => import('./run-bests'));
// Session AV (owner follow-up 1, F-WORKOUT-CALENDAR): a month of workouts, opened on demand.
const WorkoutCalendar = lazy(() => import('./workout-calendar'));
const WorkoutsMuscles = lazy(() => import('./workouts-muscles'));
// Session AK (item 8): "Fresh today: legs, back" on the start sheet, its own small chunk.
const MuscleFreshToday = lazy(() => import('./muscle-freshness-today'));
// Session AV lane 2 (body; LEDGER #116, #119): the exercise library with written how-tos and pinned notes, its own chunk.
const ExerciseLibrary = lazy(() => import('./exercise-library'));
// Session AV lane 2 (body; LEDGER #112, #115): the ready-made routines and an own routine's folder and note, one chunk.
const RoutineLibrary = lazy(() => import('./routine-library-view'));
// Session AV lane 2 (health r3; LEDGER #289): timed circuits, their own chunk, loaded when the fold opens.
const Circuits = lazy(() => import('./circuits'));
const RoutineEdit = lazy(() => import('./routine-library-view').then(m => ({default: m.RoutineEdit})));
// Session AV lane 2 (body; LEDGER #117): the month report and sets per muscle over 8 weeks, its own chunk.
const WorkoutsProgress = lazy(() => import('./workouts-progress'));
// Session AV lane 2 (body; LEDGER #111): distance goals and the training load, its own chunk.
const DistanceGoals = lazy(() => import('./distance-goals'));
// Session AV lane 2, round 5 (gym; LEDGER #375, Gentler Streak's Activity Path): the movement band, its own chunk.
const MovementBand = lazy(() => import('./movement-band'));
// Session AV lane 2 (body; LEDGER #203, #208): shoes and the running tip, each its own chunk.
const Shoes = lazy(() => import('./shoes'));
const RunTip = lazy(() => import('./run-tip'));
const ExerciseHowTo = lazy(() => import('./exercise-library').then(m => ({default: m.ExerciseDetail})));
// Session AV lane 2 (bodymind-r2; LEDGER #239, #240, #241): places and equipment, a suggested workout, Replace — each its own chunk.
const Places = lazy(() => import('./places'));
const SuggestWorkout = lazy(() => import('./suggest-workout'));
const ReplaceExercise = lazy(() => import('./replace-exercise'));
// Session AV lane 2, round 4 (health; Runna, LEDGER #330): your plan — planned workouts on a calendar, moved and realigned.
const PlannedWorkouts = lazy(() => import('../r4/planned-workouts'));
// Session AV lane 2, round 4 (health; Runna, LEDGER #336, #337): a run's heart-rate zones, and races ahead.
const HrZones = lazy(() => import('../r4/runna-parts').then(m => ({default: m.HrZones})));
const RacesAhead = lazy(() => import('../r4/runna-parts').then(m => ({default: m.RacesAhead})));
// Session AV lane 2, round 5 (gym; Gentler Streak, Bevel; LEDGER #374): your status, its own chunk.
const WorkoutStatus = lazy(() => import('../r5/workout-status'));
const WorkoutPhotos = lazy(() => import('../r5/workout-photos'));
const PhotoSweep = lazy(() => import('../r5/workout-photos').then(m => ({default: m.PhotoSweep})));
const placeNow = (r: WorkoutPlaces | null): Place | null => r?.places.find(p => p.id === r.current) ?? null;

/**
 * Workouts, the full view (Session AH Part 6, DE8; /app/health?view=workouts, a view of Health like Sleep and Meditation).
 * Start empty, from a routine or by repeating the last workout; log sets (weight × reps, reps, time or distance) with the
 * same set last time beside each; a rest timer after each ticked set; finish to keep the minutes in Health (so Today, the
 * weekly review and a linked exercise habit count them) and to see new personal bests; every exercise keeps its history.
 */
const KIND_WORDS: Record<WorkoutSet['kind'], string> = {warmup: 'Warm-up', normal: 'Working', drop: 'Drop set', failure: 'To failure'};
const MEASURE_WORDS: Record<Measure, string> = {'weight-reps': 'Weight and reps', reps: 'Reps', time: 'Time', 'distance-time': 'Distance and time'};
/** Session AK (4.9): one calm line for the new bests, shown once when the workout is saved. */
const celebration = (bests: PersonalBest[], unit: 'kg' | 'lb') => bests.length === 1 ? `A new personal best: ${bestWords(bests[0]!, unit)}. Well earned.` : `${bests.length} new personal bests today. Well earned.`;
const bestWords = (b: PersonalBest, unit: 'kg' | 'lb') => `${b.name}: ${b.what === 'weight' ? `heaviest ${weightShown(b.value, unit)}` : b.what === 'one-rep max' ? `estimated one-rep max ${estimateShown(b.value, unit)}` : b.what === 'reps' ? `most reps, ${b.value}` : b.what === 'time' ? `longest, ${clock(b.value)}` : b.what === 'added weight' ? `most weight added, ${weightShown(b.value, unit)}` : b.what === 'least help' ? `least help, ${weightShown(b.value, unit)}` : `farthest, ${formatNumber(b.value)} km`}`;

export default function WorkoutsView() {
  const record = useWorkouts(), health = useHealth();
  // Session AP (feature 5): a run's pace and per-km splits, kept at import by workout id (never back-filled).
  const splitsRecord = useDeviceRecord(WORKOUT_SPLITS);
  // Session AV lane 2, round 4 (LEDGER #336): the seconds at each heart rate of an imported run, for its zones.
  const hrRecord = useDeviceRecord(WORKOUT_HR);
  // Session AV lane 2 (bodymind-r2; LEDGER #239): the places and the one chosen now.
  // Session AV lane 2, round 5 (LEDGER #374): the plan's record, for the status and the days it covered.
  const plannedRecord = useDeviceRecord(PLANNED_WORKOUTS), plan = plannedRecord.loaded && !plannedRecord.unreadable ? plannedRecord.data : null;
  const placesRecord = useDeviceRecord(WORKOUT_PLACES), places = placesRecord.loaded && !placesRecord.unreadable ? placesRecord.data : null, place = placeNow(places);
  const [note, setNote] = useState(''), [now, setNow] = useState(() => Date.now()), [restUntil, setRestUntil] = useState<number | null>(null);
  const [tookMinutes, setTookMinutes] = useState('');
  const [asking, setAsking] = useState<null | 'finish' | 'discard' | {remove: string}>(null), [summary, setSummary] = useState<{workout: Workout; bests: PersonalBest[]} | null>(null);
  const [historyOf, setHistoryOf] = useState(''), [editing, setEditing] = useState<string | null>(null);
  // Session AV lane 2, round 5 (LEDGER #377): the history shows every workout, or only the favourites.
  const [onlyFavs, setOnlyFavs] = useState(false);
  const ready = record.loaded && health.loaded && !health.error;
  const unit = ready ? dailyData(health.data).preferences.weightUnit : 'kg';
  const today = ready ? healthDay(dailyData(health.data).preferences.timezone) : '';
  // Session AH Part 17: a workout started from a past Journal date's link is logged on that day.
  const linked = useLinkedDay(today || '9999-12-31'), logDay = today && linked < today ? linked : today;
  const current = record.loaded ? inProgress(record.data) : undefined;
  // One clock for the elapsed time and the rest timer, every second while either shows.
  useEffect(() => { if (!current && restUntil === null) return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [current, restUntil]);
  useEffect(() => { if (restUntil !== null && now >= restUntil) { setRestUntil(null); setNote('Rest is over. Next set when you are ready.'); } }, [now, restUntil]);
  // Session AO (C-LS-20): a removal names `undone` and gets the app's one Undo toast (components/ui/remove-with-undo.ts),
  // which puts exactly the removed routine, exercise or set back into the latest log.
  const change = (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => {
    if (undone && said) {
      try { const out = removeWithUndo(record.update, fn, said, undone); void Promise.resolve(out).catch(e => setNote(plainErrorMessage(e, 'That could not be saved on this device.'))); setNote(said); return true; }
      catch (e) { setNote(plainErrorMessage(e, 'That could not be saved on this device.')); return false; }
    }
    try { record.update(fn); if (said) setNote(said); return true; } catch (e) { setNote(plainErrorMessage(e, 'That could not be saved on this device.')); return false; }
  };

  // Session AL (P-MO-22, MO-026): a skeleton under the line while the log opens, and Reload after 10 s.
  if (!record.loaded || !health.loaded) return <section className="panel"><h1>Workouts</h1><p>Opening your workout log…</p><Skeleton label="Opening your workout log" lines={4}/><SlowReload/></section>;
  if (health.error) return <section className="panel"><h1>Workouts</h1><p role="alert">Workouts keep their minutes in your Health journal, which could not be read. Nothing was changed.</p><Link className="text-link" href="/app/health">Back to Health</Link></section>;
  const w = record.data, past = finished(w), last = past[0], week = weekSummary(w, today), library = allExercises(w.exercises);
  const status = currentStatus(plan, today), pauses = pausesOf(plan, today);

  // Session AV lane 2 (body; LEDGER #112, #115): a ready-made routine is copied into the person's routines, then (Start it now) started.
  function saveFromLibrary(g: Guide, lang: Lang, start: boolean) {
    let made: ReturnType<typeof saveGuide> | undefined;
    if (!change(x => { made = saveGuide(x, g, lang, new Date()); return made.workouts; }, start ? undefined : `${g.name[lang]} is in your routines, in ${g.folder[lang]}.`) || !made) return;
    if (start) begin({date: logDay, now: new Date(), template: made.routine});
  }
  // Session AV lane 2 (body; LEDGER #109): a routine with a progression rule starts at today's targets (from your last sets).
  const begin = (input: Parameters<typeof startWorkout>[1]) => { setSummary(null); if (change(x => startWorkout(x, input.template?.progression ? {...input, template: progressed(x, input.template)} : input), 'Workout started. Add an exercise, then log your sets.')) document.getElementById('workout-now')?.scrollIntoView({block: 'start'}); };
  async function finish() {
    setAsking(null);
    try {
      let result: ReturnType<typeof finishWorkout> | undefined;
      // Session AL (P-MO-82, MO-148): a workout logged afterwards takes the minutes typed; else it runs until now.
      const typed = tookMinutes.trim(), took = typed ? Number(typed) : undefined;
      if (took !== undefined && (!/^\d{1,4}$/.test(typed) || took < 1 || took > 1440)) { setNote('Enter whole minutes from 1 to 1,440, or leave “Took” empty to end it now.'); return; }
      // Session AV lane 2 (body; LEDGER #204): the first run added keeps the bests before it as seen (only a new one is marked).
      let kept: ReturnType<typeof keepLastWeights> = null;
      record.update(x => { result = finishWorkout(x, new Date(), took); const next = seedSeen(x, withUsualShoe(result.workouts, result.workout.id), splitsRecord.loaded && !splitsRecord.unreadable ? splitsRecord.data : null); kept = keepLastWeights(next, result.workout); return kept ? kept.workouts : next; });
      setTookMinutes(''); setNote(''); // the "Workout started…" line no longer stays above the finished workout (MO-137)
      const {workout, bests} = result!, minutes = Math.min(1440, Math.max(1, durationMinutes(workout)));
      // The minutes go to Health's activity log, so Today, the weekly review and a linked exercise habit count them.
      const activityId = newHealthId();
      try { await health.update(h => saveActivity(h, {id: activityId, date: workout.date, name: workout.name, steps: 0, minutes}, new Date().toISOString())); record.update(x => withActivity(x, workout.id, activityId)); }
      catch { setNote('The workout is saved; its minutes could not be added to Health.'); }
      setRestUntil(null); setSummary({workout, bests});
      // Session AL (P-MO-82, MO-137): a workout under a minute reads "under 1 min" (it read "0 min" in places).
      const savedWords = `${workout.name} saved · ${durationMinutes(workout) < 1 ? 'under 1 min' : `${minutes} min`}${bests.length ? ` · ${bests.length} new ${plural(bests.length, 'personal best')}` : ''}.`;
      // Session AV lane 2, round 5 (LEDGER #373): the routine took this workout's weights; Undo puts its own back.
      const k = kept as ReturnType<typeof keepLastWeights>;
      if (k) showUndo({message: `${savedWords} ${k.before.name} keeps these weights for next time.`, undone: `${k.before.name} has its weights from before.`, restore: () => record.update(x => restoreRoutine(x, k.before))});
      else showStatus(savedWords);
    } catch (e) { setNote(plainErrorMessage(e, 'The workout could not be finished.')); }
  }
  // Session AJ (item 27, D12): an imported workout is saved like a finished one, minutes in Health included. Session AK
  // (4.7, A15): a whole export can hold hundreds, so the log and Health are each written once for the lot.
  async function keepMinutes(made: Workout[]): Promise<number> {
    if (!made.length) return 0;
    const at = new Date().toISOString(), ids = made.map(() => newHealthId());
    try {
      await health.update(h => made.reduce((acc, x, i) => saveActivity(acc, {id: ids[i]!, date: x.date, name: x.name, steps: 0, minutes: Math.min(1440, Math.max(1, durationMinutes(x)))}, at), h));
      record.update(x => made.reduce((acc, y, i) => withActivity(acc, y.id, ids[i]!), x));
      return 0;
    } catch { return made.length; }
  }
  const addedWords = (names: string[], missed: number) => `${names.length === 1 ? `${names[0]} is added` : `${names.length} workouts are added`} to your workouts.${missed ? ` ${missed < names.length ? 'Some' : names.length === 1 ? 'Its' : 'Their'} minutes could not be added to Health.` : ''}`;
  async function addImported(list: ImportChoice[]): Promise<string> {
    const {addImportedWorkout} = await import('../../../lib/workouts/import-file');
    const made: Workout[] = [];
    // Session AV lane 2 (body; LEDGER #203): an imported run takes the usual pair of shoes (it can be changed on the run).
    record.update(x => { made.length = 0; return seedSeen(x, list.reduce((acc, {summary, day}) => {
      const next = addImportedWorkout(acc, summary, new Date(), day), workout = next.workouts.find(y => importInfo(y)?.importId === summary.importId);
      if (workout) made.push(workout);
      return workout ? withUsualShoe(next, workout.id) : next;
    }, x), splitsRecord.loaded && !splitsRecord.unreadable ? splitsRecord.data : null); });
    const paced = made.flatMap(x => { const s = list.find(c => c.summary.importId === importInfo(x)?.importId)?.summary.splits; return s ? [[x.id, s] as const] : []; });
    // Session AV lane 2, round 4 (LEDGER #336): the seconds at each heart rate, for the zones (its own record; the splits record is strict).
    const hearts = made.flatMap(x => { const h = list.find(c => c.summary.importId === importInfo(x)?.importId)?.summary.hrSeconds; return h ? [[x.id, h] as const] : []; });
    if (hearts.length) { try { hrRecord.update(r => hearts.reduce((acc, [id, h]) => withHr(acc, id, h), r)); } catch { /* the runs are added; their zones are not kept on this device */ } }
    let splitsMissed = false;
    if (paced.length) { try { splitsRecord.update(r => paced.reduce((acc, [id, s]) => withSplits(acc, id, s), r)); } catch { splitsMissed = true; } }
    return `${addedWords(made.map(x => x.name), await keepMinutes(made))}${splitsMissed ? ' Their pace and splits could not be saved on this device.' : ''}`;
  }
  async function addLifts(plan: LiftsPlan): Promise<string> {
    const {addLiftWorkouts} = await import('../../../lib/workouts/import-lifts');
    let result: ReturnType<typeof addLiftWorkouts> | undefined;
    record.update(x => { result = addLiftWorkouts(x, plan, {now: new Date(), dayOf: iso => healthDay(dailyData(health.data).preferences.timezone, new Date(iso))}); return result.workouts; });
    const r = result!;
    if (!r.added.length) return r.duplicates ? `Every workout in this ${plan.label} export is already in your workouts.` : `Nothing in this ${plan.label} export could be added.`;
    const missed = await keepMinutes(r.added);
    return [addedWords(r.added.map(x => x.name), missed), r.duplicates ? `${r.duplicates} already in your log ${r.duplicates === 1 ? 'was' : 'were'} skipped.` : '',
      r.newExercises.length ? `${r.newExercises.length} new ${plural(r.newExercises.length, 'exercise')} added to your list.` : '', r.future ? `${r.future} dated in the future ${r.future === 1 ? 'was' : 'were'} left out.` : '',
      r.trimmed ? 'Some very long workouts were shortened to 40 exercises and 50 sets each.' : ''].filter(Boolean).join(' ');
  }
  // Session AK (4.9): the rest after a ticked set is the exercise's own, and in a superset only after the round's last exercise.
  function startRest(entryId: string) {
    const workout = inProgress(w), seconds = workout ? restAfter(w, workout, entryId) : 0;
    setRestUntil(seconds > 0 ? new Date().getTime() + seconds * 1000 : null); // an event handler: the tap that ticked the set
  }
  async function remove(id: string) {
    const target = w.workouts.find(x => x.id === id); setAsking(null);
    if (!target) return;
    // Session AO (C-LS-20): Undo puts back the workout and the minutes it had added to Health, each into its latest record.
    let wBefore: Workouts | undefined, wAfter: Workouts | undefined;
    if (!change(x => { const next = removeWorkout(x, id); wBefore = x; wAfter = next; return next; })) return;
    const splitsBack: WorkoutSplits | undefined = splitsRecord.data.workouts[id];
    if (splitsBack) { try { splitsRecord.update(r => withoutSplits(r, id)); } catch { /* the workout is gone; its splits stay until the next delete */ } }
    const hrBack = hrRecord.data.runs[id];
    if (hrBack) { try { hrRecord.update(r => withoutHr(r, id)); } catch { /* its zones stay until the next delete */ } }
    let healthBack: Removed[] | null = null;
    if (target.activityId) { try { await health.update(h => { if (!h.activity.some(a => a.id === target.activityId)) return h; const next = removeHealthItem(h, 'activity', target.activityId!); healthBack = removedItems(h, next); return next; }); } catch { /* the workout is gone; its minutes stay in Health */ } }
    const said = `${target.name} on ${formatDate(target.date)} is deleted, with its minutes in Health.`, workoutBack = wBefore && wAfter ? removedItems(wBefore, wAfter) : null, healthItems = healthBack as Removed[] | null;
    setNote(said);
    if (workoutBack) showUndo({message: said, undone: `${target.name} is back${healthItems ? ', with its minutes in Health' : ''}.`, restore: async () => { record.update(latest => reinsertItems(latest, workoutBack)); if (splitsBack) { try { splitsRecord.update(r => withSplits(r, id, splitsBack)); } catch { /* the workout is back without its splits */ } } if (hrBack) { try { hrRecord.update(r => withHr(r, id, hrBack)); } catch { /* the workout is back without its zones */ } } if (healthItems) await health.update(latest => reinsertItems(latest, healthItems)); }});
  }

  return <div className="workouts-view">{today && <LoggingFor date={logDay} today={today}/>}
    <div className="page-heading"><div>
      <p><Link className="text-link sleep-back" href="/app/health">← Health</Link></p>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="workouts-eyebrow">HEALTH · WORKOUTS</NebulaFlow></p>
      <h1><NebulaFlow identity="workouts-title">Train with a plan.</NebulaFlow></h1>
      <p className="page-lede">Sets, reps, weights, time and distance, with what you did last time beside each set. Kept on this device; a finished workout adds its minutes to your Health activity.</p>
    </div></div>
    {note && <p className="workouts-note" role="status">{note}</p>}
    {record.unreadable && <p className="notice" role="alert">The workout log on this device could not be read. Its bytes are kept; nothing was changed. Starting a workout writes a new log.</p>}

    {current ? <><CurrentWorkout workout={current} w={w} unit={unit} now={now} library={library} restUntil={restUntil} change={change} places={places}
        onRest={startRest} onSkipRest={() => setRestUntil(null)}
        onFinish={() => { const open = current.exercises.reduce((n, e) => n + e.sets.filter(s => !s.done && setReady(e.measure, s)).length, 0); if (open) setAsking('finish'); else void finish(); }}
        onDiscard={() => setAsking('discard')}/>
      <label className="field workouts-took">Took (minutes, optional: for a workout you log afterwards)<input type="text" inputMode="numeric" autoComplete="off" value={tookMinutes} onChange={e => setTookMinutes(e.target.value)}/></label></>
      : <section className="panel workouts-start" aria-labelledby="workouts-start-title">
        <h2 id="workouts-start-title">Start a workout</h2>
        {past.some(x => x.exercises.length) && <Suspense fallback={null}><MuscleFreshToday w={w} library={library} today={today}/></Suspense>}
        <p className="fine">This week: {week.workouts} {plural(week.workouts, 'workout')}{week.workouts ? ` · ${week.minutes} min · ${week.sets} ${plural(week.sets, 'set')}${week.volumeKg ? ` · ${weightShown(week.volumeKg, unit)} lifted` : ''}` : ''}.</p>
        {past.length > 0 ? <Suspense fallback={null}><WeeklyChart w={w} today={today} unit={unit}/></Suspense>
          : /* Session AV (q3 #11): the weekly chart's teaching line before the first workout, so a fresh device knows it is coming */ <p className="fine workouts-weeks-teach">Finish a workout and the last 12 weeks show here: time, distance and weight lifted per week.</p>}
        {past.length > 0 && <Suspense fallback={null}><RunBests w={w} splits={splitsRecord.loaded && !splitsRecord.unreadable ? splitsRecord.data : null} onNoted={fn => change(fn)}/></Suspense>}
        <Suspense fallback={null}><RunTip today={today}/></Suspense>
        <PlanFold w={w} today={today}/>
        {/* Session AV lane 2, round 5 (gym; LEDGER #374, Gentler Streak): ill, injured, a break or travelling, until cleared. */}
        <Fold className="av2-fold workouts-status-fold" summary={status ? `Your status: ${STATUS_WORDS[status.kind].since} since ${formatDate(status.from, {weekday: true, year: false})}` : 'Your status: ill, injured, a break or travelling'} loading="Opening your status…"><WorkoutStatus today={today}/></Fold>
        {past.length > 0 && <CalendarFold w={w} today={today} pauses={pauses}/>}
        {/* Session AV lane 2 (bodymind-r2; LEDGER #240, Fitbod): a workout for today from your own history, freshness and place. */}
        <Fold className="av2-fold workouts-suggest-fold" summary="Suggest a workout for today, from your own sets" loading="Working out a suggestion…"><SuggestWorkout w={w} library={library} today={today} unit={unit} places={places} onStart={x => begin({date: logDay, now: new Date(), repeat: x})}/></Fold>
        <Fold className="av2-fold workouts-places-fold" summary={place ? `Places and equipment · now: ${place.name}` : 'Places and equipment · where you train and what is there'} loading="Opening your places…"><Places/></Fold>
        <div className="workouts-start-actions">
          <button className="primary" type="button" onClick={() => begin({date: logDay, now: new Date()})}>Start an empty workout</button>
          {last && <button className="secondary" type="button" onClick={() => begin({date: logDay, now: new Date(), repeat: last})}>Repeat {last.name}</button>}
        </div>
        {/* Session AV lane 2 (body; LEDGER #115, #119): routines by folder, each with its note and an Edit for both. */}
        {w.templates.length > 0 && <><h3>Your routines</h3>{routineGroups(w).map(g => <div key={g.folder ?? ''} className="av2-routine-group">
          {(g.folder || routineGroups(w).length > 1) && <h4 className="av2-folder">{g.folder ?? 'No folder'} <span className="fine">({g.routines.length})</span></h4>}
          <ul className="workouts-routines">{g.routines.map(t => <li key={t.id}>
          <div><strong>{t.name}</strong><span>{t.exercises.map(e => e.name).join(' · ')}</span>{t.note && <span className="av2-routine-note">Note: {t.note}</span>}{t.progression && <span className="av2-routine-note">{progressionWords(t.progression)}</span>}{t.keepWeights && <span className="av2-routine-note">Keeps your last weights</span>}</div>
          <div className="workouts-row-actions"><button className="secondary" type="button" onClick={() => begin({date: logDay, now: new Date(), template: t})} aria-label={`Start ${t.name}`}>Start</button>
            <button className="quiet" type="button" aria-expanded={editing === t.id} aria-label={`Edit routine ${t.name}`} onClick={() => setEditing(editing === t.id ? null : t.id)}>Edit</button>
            <button className="quiet" type="button" aria-label={`Remove routine ${t.name}`} onClick={() => change(x => removeTemplate(x, t.id), `Routine ${t.name} removed.`, `Routine ${t.name} is back.`)}>Remove</button></div>
          {editing === t.id && <Suspense fallback={<p className="fine" role="status">Opening…</p>}><RoutineEdit w={w} routine={t} change={change} unit={unit} onDone={() => setEditing(null)}/></Suspense>}
        </li>)}</ul></div>)}</>}
        <Fold className="av2-fold workouts-guides-fold" summary="Ready-made routines, and routines shared with you" loading="Opening the routines…"><RoutineLibrary w={w} onSave={(g, lang) => saveFromLibrary(g, lang, false)} onStart={(g, lang) => saveFromLibrary(g, lang, true)} onImport={share => change(x => addSharedRoutine(x, share, new Date()).workouts, `${share.name} is added to your routines.`)}/></Fold><Fold className="av2-fold workouts-circuits-fold" summary="Timed circuits: work, rest and rounds" loading="Opening the circuits…"><Circuits logDay={logDay || today}/></Fold>
      </section>}
    {asking === 'finish' && current && <ConfirmInline title="Finish with unticked sets?" confirmLabel="Finish workout" cancelLabel="Keep logging" tone="neutral" onConfirm={() => void finish()} onCancel={() => setAsking(null)}><p>Sets you have not ticked are left out. Tick a set when you finish it.</p></ConfirmInline>}
    {asking === 'discard' && <ConfirmInline title="Discard this workout?" confirmLabel="Discard workout" cancelLabel="Keep it" onConfirm={() => { setAsking(null); setRestUntil(null); change(discardWorkout, 'The workout in progress is discarded. Nothing was added to Health.'); }} onCancel={() => setAsking(null)}><p>Its sets are not kept.</p></ConfirmInline>}

    {summary && <section className="panel workouts-summary" aria-labelledby="workouts-summary-title">
      <h2 id="workouts-summary-title">{summary.workout.name}, done</h2>
      <p>{minText(durationMinutes(summary.workout))} · {doneSets(summary.workout).length} {plural(doneSets(summary.workout).length, 'set')}{(() => { const v = summary.workout.exercises.reduce((t, e) => t + volumeKg(e), 0); return v ? ` · ${weightShown(v, unit)} lifted` : ''; })()}.</p>
      {summary.bests.length > 0 && <p className="workouts-celebrate" role="status"><span aria-hidden="true">★ </span>{celebration(summary.bests, unit)}</p>}
      {summary.bests.length > 0 ? <><h3>New personal bests</h3><ul>{summary.bests.map(b => <li key={`${b.exerciseId}-${b.what}`}>{bestWords(b, unit)}</li>)}</ul></> : <p className="fine">{/* Session AL fourth pass (MO-026): the first workout has nothing to beat yet; it is the starting point */}{past.filter(x => x.id !== summary.workout.id).length === 0 ? 'Your first workout here: these sets are your starting point. The next one is compared with it.' : 'No new personal best this time; consistency is what counts.'}</p>}
      <SaveRoutine workout={summary.workout} onSave={name => change(x => saveTemplate(x, summary.workout, name, new Date()), `Routine ${name || summary.workout.name} saved. Start it from here next time.`)}/>
    </section>}

    <section className="panel workouts-history" aria-labelledby="workouts-history-title">
      <h2 id="workouts-history-title">Your workouts</h2>
      <WorkoutsImport w={w} dayOf={iso => healthDay(dailyData(health.data).preferences.timezone, new Date(iso))} zone={healthZone(dailyData(health.data).preferences.timezone)} unit={unit} onAdd={addImported} onAddLifts={addLifts}/>
      {/* Session AV lane 2, round 5 (gym; LEDGER #377, Gentler Streak): All or Favourites; the arrival sweep of unnamed photos. */}
      {!record.unreadable && <Suspense fallback={null}><PhotoSweep w={w}/></Suspense>}
      {past.length > 0 && <div className="r5-filter" role="group" aria-label="Show workouts">
        <button type="button" className="quiet" aria-pressed={!onlyFavs} onClick={() => setOnlyFavs(false)}>All</button>
        <button type="button" className="quiet" aria-pressed={onlyFavs} onClick={() => setOnlyFavs(true)}>Favourites ({past.filter(x => x.star).length})</button>
      </div>}
      {past.length > 0 && onlyFavs && !past.some(x => x.star) && <p className="health-empty-inline">No favourites yet. Under All, open a workout and choose Favourite to keep it here.</p>}
      {past.length ? <ul className="workouts-past">{(onlyFavs ? past.filter(x => x.star) : past).slice(0, 30).map(x => <li key={x.id}>
        <details><summary><strong>{x.name}</strong>{x.star && <><span className="r5-star-mark" aria-hidden="true"> ★</span><span className="sr-only">, a favourite</span></>}{(x.photos ?? []).length > 0 && <span className="sr-only">, {(x.photos ?? []).length} {plural((x.photos ?? []).length, 'photo')}</span>} <span>{formatDate(x.date)} · {minText(durationMinutes(x))} · {!x.exercises.length && importInfo(x) ? (importInfo(x)!.distanceKm !== undefined ? `${formatNumber(importInfo(x)!.distanceKm!, {maximumFractionDigits: 2})} km` : 'imported') : `${x.exercises.length} ${plural(x.exercises.length, 'exercise')}`}</span></summary>
          {importInfo(x) && <p className="fine workouts-imported-line">{importedLine(x)}</p>}
          {/* Session AV lane 2 (body; LEDGER #110, Strava's per-activity summary, no model): the run beside the runs before it. */}
          {(() => { const r = runSummary(w, splitsRecord.loaded && !splitsRecord.unreadable ? splitsRecord.data : null, x.id); return r ? <p className="fine workouts-run-summary">{runWords(r)}</p> : null; })()}
          {/* Session AV lane 2 (body; LEDGER #203): a run picks the shoes it was run in. */}
          {(w.shoes ?? []).length > 0 && runSummary(w, null, x.id) && <label className="field workouts-run-shoe"><span>Shoes for {x.name}</span><select value={x.shoeId ?? ''} onChange={e => change(y => setRunShoe(y, x.id, e.target.value || null), e.target.value ? `${(w.shoes ?? []).find(s => s.id === e.target.value)?.name ?? 'Shoes'} picked for ${x.name}.` : `No shoes for ${x.name}.`)}>
            <option value="">No shoes picked</option>{(w.shoes ?? []).filter(s => !s.retiredAt || s.id === x.shoeId).map(s => <option key={s.id} value={s.id}>{s.name}{s.retiredAt ? ' (retired)' : ''}</option>)}</select></label>}
          {splitsRecord.data.workouts[x.id] && <WorkoutSplitsTable s={splitsRecord.data.workouts[x.id]!} name={x.name}/>}
          {hrRecord.loaded && hrRecord.data.runs[x.id] && <Suspense fallback={null}><HrZones workoutId={x.id} name={x.name}/></Suspense>}
          <Suspense fallback={null}><WorkoutPhotos workout={x} change={change}/></Suspense>
          <ul className="workouts-past-exercises">{x.exercises.map(e => <li key={e.id}><strong>{e.name}</strong> <span>{e.sets.map(s => `${s.kind === 'warmup' ? 'W ' : ''}${setText(e.measure, s, unitFor(w, e.exerciseId, unit))}`).join(' · ')}</span></li>)}</ul>
          <div className="workouts-row-actions">
            {!current && x.exercises.length > 0 && <button className="secondary" type="button" onClick={() => begin({date: logDay, now: new Date(), repeat: x})}>Repeat</button>}
            {x.exercises.length > 0 && <SaveRoutine compact workout={x} onSave={name => change(y => saveTemplate(y, x, name, new Date()), `Routine ${name || x.name} saved.`)}/>}
            <button className="quiet r5-star" type="button" aria-pressed={x.star === true} aria-label={`Favourite: ${x.name} on ${formatDate(x.date)}`} onClick={() => change(y => setStar(y, x.id, !x.star), x.star ? `${x.name} is no longer a favourite.` : `${x.name} is in your favourites.`)}><span className="r5-star-mark" aria-hidden="true">{x.star ? '★' : '☆'}</span> Favourite</button>
            <button className="quiet" type="button" onClick={() => setAsking({remove: x.id})} aria-label={`Delete ${x.name} on ${formatDate(x.date)}`}>Delete</button>
          </div>
          {typeof asking === 'object' && asking?.remove === x.id && <ConfirmInline title={`Delete ${x.name}?`} confirmLabel="Delete workout" cancelLabel="Keep it" onConfirm={() => void remove(x.id)} onCancel={() => setAsking(null)}><p>Its sets and the minutes it added to Health are removed.</p></ConfirmInline>}
        </details>
      </li>)}</ul> : <ArtNote pillar="health"><p className="health-empty-inline">No workout yet. Start one above: an empty one, or add exercises as you go.</p></ArtNote>}
    </section>

    <ExerciseProgress w={w} unit={unit} library={library} value={historyOf} onChange={setHistoryOf}/>
    {past.some(x => x.exercises.length) && <Suspense fallback={<section className="panel"><p className="fine">Opening muscle groups…</p></section>}><WorkoutsMuscles w={w} unit={unit} library={library} today={today}/></Suspense>}
    {/* Session AV lane 2 (body; LEDGER #203): shoes and their distance, a note near the limit. */}
    <section className="panel workouts-shoes" aria-labelledby="workouts-shoes-title">
      <h2 id="workouts-shoes-title">Shoes</h2>
      {(w.shoes ?? []).filter(s => !s.retiredAt).length > 0 && <p className="fine workouts-shoes-line">{(w.shoes ?? []).filter(s => !s.retiredAt).length} {(w.shoes ?? []).filter(s => !s.retiredAt).length === 1 ? 'pair' : 'pairs'} in use.</p>}
      <Fold className="av2-fold workouts-shoes-fold" summary={(w.shoes ?? []).length ? 'Your shoes and their distance' : 'Add your running shoes and count their distance'} loading="Opening your shoes…"><Shoes w={w} change={change}/></Fold>
    </section>
    {/* Session AV lane 2, round 4 (health; Runna, LEDGER #337): races ahead, the weeks between, the result beside the goal. */}
    <section className="panel workouts-races" aria-labelledby="workouts-races-title">
      <h2 id="workouts-races-title">Races ahead</h2>
      <Fold className="av2-fold workouts-races-fold" summary="Your races this year, the weeks between them, and results" loading="Opening your races…"><RacesAhead w={w} today={today}/></Fold>
    </section>
    {/* Session AV lane 2 (body; LEDGER #111): distance goals (their line on the fold's face) and the training load. */}
    <section className="panel workouts-goals" aria-labelledby="workouts-goals-title">
      <h2 id="workouts-goals-title">Distance goals and training load</h2>
      {(w.distanceGoals ?? []).slice(0, 2).map(g => { const p = goalProgress(w, g, today); return <p key={g.id} className="fine workouts-goal-line">{`${({run: 'Running', ride: 'Cycling', swim: 'Swimming', walk: 'Walking', any: 'All sports'} as const)[g.sport]} ${g.period === 'week' ? 'this week' : g.period === 'month' ? 'this month' : 'this year'}: ${formatNumber(p.km, {maximumFractionDigits: 1})} of ${formatNumber(g.km, {maximumFractionDigits: 1})} km${p.done ? ', reached' : p.onPace ? ', on pace' : ''}.`}</p>; })}
      <Fold className="av2-fold workouts-goals-fold" summary={(w.distanceGoals ?? []).length ? 'Your goals and the last 7 days beside your usual week' : 'Set a distance goal; see the last 7 days beside your usual week'} loading="Opening goals and load…"><DistanceGoals w={w} today={today} change={change} pauses={pauses}/></Fold>
      <Fold className="av2-fold workouts-band-fold" summary="Your movement band: this week beside your usual range" loading="Opening your movement band…"><MovementBand w={w} activity={health.data.activity} today={today} pauses={pauses}/></Fold>
    </section>
    {past.some(x => x.exercises.length) && <section className="panel workouts-progress-report" aria-labelledby="workouts-report-title">
      <h2 id="workouts-report-title">Progress</h2>
      <Fold className="av2-fold workouts-report-fold" summary="This month beside the last, and sets per muscle group" loading="Opening your progress…"><WorkoutsProgress w={w} unit={unit} library={library} today={today}/></Fold>
    </section>}
    {/* Session AV lane 2 (body; LEDGER #116, #119; Hevy's exercise library): every exercise's written how-to, its muscles, your best and a pinned note. */}
    <section className="panel workouts-library" aria-labelledby="workouts-library-title">
      <h2 id="workouts-library-title">Exercises and how-tos</h2>
      <Fold className="av2-fold workouts-library-fold" summary="Open the exercise library" loading="Opening the exercise library…"><ExerciseLibrary w={w} unit={unit} library={library} change={change} place={place}/></Fold>
    </section>

    <section className="panel workouts-settings" aria-labelledby="workouts-settings-title">
      <h2 id="workouts-settings-title">Rest timer</h2>
      <label className="field"><span>Rest after each finished set</span>
        <select value={String(w.restSeconds)} onChange={e => change(x => setRest(x, Number(e.target.value)), Number(e.target.value) ? `Rest timer: ${clock(Number(e.target.value))}.` : 'Rest timer off.')}>
          {[0, 30, 60, 90, 120, 180, 240, 300].map(s => <option key={s} value={s}>{s ? clock(s) : 'Off'}</option>)}
        </select></label>
      <p className="fine">Each exercise can keep its own rest time (under the exercise while you train). In a superset the rest comes after the last exercise of the round.</p>
      <p className="fine">Weights use your Health weight unit ({unit}); change it in Health → Journal settings.</p>
    </section>
  </div>;
}

function CurrentWorkout({workout, w, unit, now, library, restUntil, change, onRest, onSkipRest, onFinish, onDiscard, places}: {workout: Workout; w: Workouts; unit: 'kg' | 'lb'; now: number; library: LibraryExercise[]; restUntil: number | null; places: WorkoutPlaces | null;
  change: (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean; onRest: (entryId: string) => void; onSkipRest: () => void; onFinish: () => void; onDiscard: () => void}) {
  const [picking, setPicking] = useState(workout.exercises.length === 0);
  const letters = supersetLabels(workout.exercises);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(workout.startedAt)) / 1000));
  // Session AV lane 2 (body; LEDGER #112, #119): the routine's note, and a library routine's plan and cue per exercise.
  const routine = workout.templateId ? w.templates.find(t => t.id === workout.templateId) : undefined, guide = guideOf(routine?.guideId), cueLang: Lang = guide && routine ? routineLang(guide, routine.name) : 'en';
  return <section className="panel workouts-now" id="workout-now" aria-labelledby="workout-now-title">
    <div className="workouts-now-head">
      <label className="field workouts-name"><span id="workout-now-title">Workout in progress</span><input defaultValue={workout.name} maxLength={80} onBlur={e => { if (e.target.value.trim() !== workout.name) change(x => renameWorkout(x, e.target.value)); }}/></label>
      <p className="workouts-elapsed"><span>Started {formatTime(workout.startedAt)}</span> <strong>{clock(elapsed)}</strong></p>
    </div>
    {routine?.note && <p className="av2-pinned workouts-routine-note"><span>Routine note: <q dir="auto">{routine.note}</q></span></p>}
    {restUntil !== null && <p className="workouts-rest" role="timer" aria-live="off">Rest <strong>{clock(Math.max(0, Math.ceil((restUntil - now) / 1000)))}</strong> <button className="text-link" type="button" onClick={onSkipRest}>Skip rest</button></p>}
    {workout.exercises.map((e, i) => <ExerciseBlock key={e.id} entry={e} index={i} count={workout.exercises.length} previous={lastEntryFor(w, e.exerciseId, workout.startedAt)} unit={unit} change={change} onRest={() => onRest(e.id)}
      w={w} letter={letters.get(e.id)} nextLetter={letters.get(workout.exercises[i + 1]?.id ?? '')} cue={(() => { const x = guide?.exercises.find(g => g.exerciseId === e.exerciseId); return x ? {line: guideLine(x, cueLang), cue: x.cue[cueLang], lang: cueLang} : undefined; })()}
      target={routine?.progression ? targetFor(w, routine, e.exerciseId, workout.startedAt) : null} library={library} place={placeNow(places)} inWorkout={workout.exercises.map(x => x.exerciseId)}/>)}
    {picking ? <ExercisePicker library={library} places={places} onPick={x => { if (change(y => addExercise(y, x))) setPicking(false); }} onCreate={input => { let made: LibraryExercise | undefined; if (change(y => { const r = addCustomExercise(y, input); made = r.exercise; return addExercise(r.workouts, r.exercise); })) { setPicking(false); void made; } }} onClose={workout.exercises.length ? () => setPicking(false) : undefined}/>
      : <button className="secondary workouts-add" type="button" onClick={() => setPicking(true)}>+ Add an exercise</button>}
    <div className="workouts-now-actions"><button className="primary" type="button" onClick={onFinish}>Finish workout</button><button className="quiet" type="button" onClick={onDiscard}>Discard</button></div>
  </section>;
}

/** Session AV lane 2 (body; LEDGER #109): today's target from the routine's progression rule, and why, in a line. */
function targetWords(t: Target, unit: 'kg' | 'lb'): string {
  const first = t.sets[0], what = first?.weightKg !== undefined ? `${weightShown(first.weightKg, unit)} × ${first.reps}` : first?.reps !== undefined ? `${first.reps} reps` : first?.seconds !== undefined ? clock(first.seconds) : '';
  const when = formatDate(t.lastDate, {year: false});
  return t.why === 'up' ? `Progression: ${what} today. Every set reached its target on ${when}, so the weight goes up.` : t.why === 'more-reps' ? `Progression: ${what} today, one more rep than on ${when}.` : `Progression: ${what} today, as on ${when}: not every set reached its target then.`;
}
/** Session AV lane 2 (body; LEDGER #109): a routine's progression rule in a line. */
const progressionWords = (p: NonNullable<Workouts['templates'][number]['progression']>) => p.kind === 'double' ? `Progression: ${p.minReps}–${p.maxReps} reps, then +${p.stepKg} kg` : `Progression: +${p.stepKg} kg each session`;
/** Session AV lane 2 (body): a fold whose lazy content loads when it is first opened. */
function Fold({className, summary, loading, children}: {className: string; summary: string; loading: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);
  return <details className={className} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>{summary}</summary>{open && <Suspense fallback={<p className="fine" role="status">{loading}</p>}>{children}</Suspense>}</details>;
}
/** Session AV lane 2, round 4 (LEDGER #330): the plan's fold, opened by itself when the address asks for it (the Agenda's link). */
function PlanFold({w, today}: {w: Workouts; today: string}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (typeof location !== 'undefined' && location.hash === '#workouts-plan') queueMicrotask(() => setOpen(true)); }, []);
  return <details className="av2-fold workouts-plan-fold" open={open || undefined} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Your plan: planned workouts on a calendar</summary>{open && <Suspense fallback={<p className="fine" role="status">Opening your plan…</p>}><PlannedWorkouts w={w} today={today}/></Suspense>}</details>;
}
/** Session AV (F-WORKOUT-CALENDAR): the fold whose content loads when opened. */
function CalendarFold({w, today, pauses}: {w: Workouts; today: string; pauses: readonly {from: string; to: string}[]}) {
  const [open, setOpen] = useState(false);
  return <details className="workouts-calendar-fold" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Calendar</summary>{open && <Suspense fallback={<p className="fine" role="status">Opening the calendar…</p>}><WorkoutCalendar w={w} today={today} pauses={pauses}/></Suspense>}</details>;
}
function ExerciseBlock({entry, index, count, previous, unit: pageUnit, change, onRest, w, letter, nextLetter, cue, target, library, place, inWorkout}: {entry: ExerciseEntry; index: number; count: number; previous?: ExerciseEntry; unit: 'kg' | 'lb'; change: (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean; onRest: () => void;
  w: Workouts; letter?: string; nextLetter?: string; cue?: {line: string; cue: string; lang: Lang}; target?: Target | null; library: LibraryExercise[]; place: Place | null; inWorkout: string[]}) {
  const headId = `ex-${entry.id}`, [tools, setTools] = useState(false), rpe = entry.measure === 'weight-reps' || entry.measure === 'reps';
  // Session AV lane 2 (bodymind-r2; LEDGER #241, Fitbod): Replace with a similar exercise (same main muscle, this place's equipment).
  const [replacing, setReplacing] = useState(false);
  // Session AV lane 2 (body; LEDGER #201): this exercise's own unit (the sets stay in kg), else the Health weight unit.
  const unit = unitFor(w, entry.exerciseId, pageUnit);
  // Session AV (owner follow-up 1, F-SET-BEST): the bests of every finished workout, for the badge on a ticked set.
  const bests = useMemo(() => exerciseHistory(w, entry.exerciseId), [w, entry.exerciseId]);
  return <article className="workouts-exercise" aria-labelledby={headId} data-superset={letter ? '' : undefined}>
    <header><h3 id={headId}>{letter && <span className="workouts-superset-tag">Superset {letter}<span className="sr-only">:</span></span>} {entry.name}</h3><div className="workouts-row-actions">
      <button className="quiet" type="button" disabled={index === 0} aria-label={`Move ${entry.name} up`} onClick={() => change(x => moveExercise(x, entry.id, -1))}>↑</button>
      <button className="quiet" type="button" disabled={index === count - 1} aria-label={`Move ${entry.name} down`} onClick={() => change(x => moveExercise(x, entry.id, 1))}>↓</button>
      <button className="quiet" type="button" data-replace-for={entry.id} aria-expanded={replacing} aria-label={`Replace ${entry.name}`} onClick={() => setReplacing(v => !v)}>Replace</button>
      <button className="quiet" type="button" aria-label={`Remove ${entry.name}`} onClick={() => change(x => removeExercise(x, entry.id), `${entry.name} removed from this workout.`, `${entry.name} is back in this workout.`)}>Remove</button></div></header>
    {replacing && <Suspense fallback={<p className="fine" role="status">Finding similar exercises…</p>}><ReplaceExercise exercise={{id: entry.exerciseId, name: entry.name, measure: entry.measure}} w={w} library={library} place={place} exclude={inWorkout} headId={headId}
      onPick={x => { const was = {id: entry.exerciseId, name: entry.name, measure: entry.measure}, said = `${entry.name} is replaced by ${x.name}; the sets you typed are kept.`;
        if (change(y => replaceInWorkout(y, entry.id, x), said)) { showUndo({message: said, undone: `${was.name} is back.`, restore: () => { change(y => replaceInWorkout(y, entry.id, was)); }}); setReplacing(false); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-replace-for="${entry.id}"]`)?.focus()); } }} onClose={() => { setReplacing(false); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-replace-for="${entry.id}"]`)?.focus()); }}/></Suspense>}
    <table className="workouts-sets"><caption className="sr-only">{entry.name}: sets</caption>
      <thead><tr><th scope="col">Set</th><th scope="col">Last time</th>{entry.measure === 'weight-reps' && <th scope="col">{unit}</th>}{entry.measure === 'reps' && entry.load && <th scope="col">{entry.load === 'weighted' ? `Added ${unit}` : `Help ${unit}`}</th>}{entry.measure === 'distance-time' && <th scope="col">km</th>}{(entry.measure === 'weight-reps' || entry.measure === 'reps') && <th scope="col">Reps</th>}{(entry.measure === 'time' || entry.measure === 'distance-time') && <th scope="col">Time</th>}{rpe && <th scope="col"><abbr title="Rate of perceived exertion: 10 is nothing left, 8 is about two reps left">RPE</abbr></th>}<th scope="col"><span className="sr-only">Done</span></th><th scope="col"><span className="sr-only">Remove</span></th></tr></thead>
      <tbody>{entry.sets.map((s, i) => <SetRow key={s.id} entry={entry} set={s} n={i + 1} previous={previous?.sets[i]} unit={unit} change={change} onDone={onRest} rpe={rpe} best={setBest(entry.measure, s, withEarlier(bests, entry.sets.slice(0, i)))}/* Session AV (q3 #40): one star per best */ />)}</tbody>
    </table>
    <div className="workouts-exercise-foot"><button className="secondary" type="button" onClick={() => change(x => addSet(x, entry.id))}>+ Add set</button>
      <label className="field workouts-ex-note"><span className="sr-only">Note for {entry.name}</span><input key={entry.note ?? ''} placeholder="Note (seat height, grip…)" maxLength={500} defaultValue={entry.note ?? ''} onBlur={e => { if ((entry.note ?? '') !== e.target.value) change(x => setExerciseNote(x, entry.id, e.target.value)); }}/></label></div>
    {/* Session AV (owner follow-up 1, F-SET-BEST; Hevy's pinned note): last time's note, carried over on a tap. */}
    {target && <p className="av2-pinned workouts-progression-note"><span>{targetWords(target, unit)}</span></p>}
    {cue && <p className="av2-pinned workouts-guide-cue" lang={cue.lang}><span>Plan: {cue.line} · {cue.cue}</span></p>}
    {/* Session AV lane 2 (body; LEDGER #119, Hevy's pinned note): the exercise's pinned note, every time; the session note can be pinned. */}
    {pinnedNoteOf(w, entry.exerciseId) && <p className="av2-pinned workouts-pinned-note"><span>Pinned note: <q dir="auto">{pinnedNoteOf(w, entry.exerciseId)}</q></span></p>}
    {entry.note?.trim() && entry.note.trim() !== pinnedNoteOf(w, entry.exerciseId) && <p className="av2-pinned"><button type="button" className="text-link" aria-label={`Pin this note to ${entry.name}`} onClick={() => change(x => setPinnedNote(x, entry.exerciseId, entry.note!), `Note pinned to ${entry.name}: it shows every time you do it.`)}>Pin this note to {entry.name}</button></p>}
    <Fold className="av2-howto" summary={`How to do ${entry.name}`} loading="Opening the how-to…"><ExerciseHowTo exercise={{id: entry.exerciseId, name: entry.name, category: 'Full body', measure: entry.measure}} w={w} unit={unit} change={change} compact/></Fold>
    {previous?.note && !entry.note && <p className="fine workouts-last-note"><span>Last time&rsquo;s note: <q dir="auto">{previous.note}</q></span> <button type="button" className="text-link" aria-label={`Keep last time’s note for ${entry.name}`} onClick={() => change(x => setExerciseNote(x, entry.id, previous.note!), `Last time’s note kept for ${entry.name}.`)}>Keep it</button></p>}
    {/* Session AK (4.9): supersets and this exercise's own rest time. */}
    <div className="workouts-exercise-foot">
      {letter ? <button className="quiet" type="button" onClick={() => change(x => leaveSuperset(x, entry.id), `${entry.name} is out of superset ${letter}.`)}>Leave superset {letter}</button>
        : index < count - 1 && <button className="quiet" type="button" onClick={() => change(x => supersetWithNext(x, entry.id), `${entry.name} is in a superset with the next exercise: do them back to back, then rest.`)}>{nextLetter ? `Join superset ${nextLetter}` : 'Superset with next'}</button>}
      {/* Session AV lane 2 (body; LEDGER #201, #202): the exercise's unit, and added weight or help on a bodyweight move. */}
      {(entry.measure === 'weight-reps' || (entry.measure === 'reps' && entry.load)) && <label className="field workouts-ex-unit"><span>Unit</span>
        <select value={w.exerciseUnits?.[entry.exerciseId] ?? ''} onChange={e => change(x => setExerciseUnit(x, entry.exerciseId, (e.target.value || null) as 'kg' | 'lb' | null), e.target.value ? `${entry.name} is in ${e.target.value} from now on (kept in kg).` : `${entry.name} follows your Health unit (${pageUnit}).`)}>
          <option value="">As Health ({pageUnit})</option><option value="kg">kg</option><option value="lb">lb</option></select></label>}
      {entry.measure === 'reps' && <label className="field workouts-ex-load"><span>Body weight</span>
        <select value={entry.load ?? ''} onChange={e => change(x => setLoad(x, entry.id, (e.target.value || null) as 'weighted' | 'assisted' | null))}>
          <option value="">{LOAD_WORDS.none}</option><option value="weighted">{LOAD_WORDS.weighted}</option><option value="assisted">{LOAD_WORDS.assisted}</option></select></label>}
      <label className="field workouts-ex-rest"><span>Rest after a set</span>
        <select value={entry.restSeconds === undefined ? '' : String(entry.restSeconds)} onChange={e => change(x => setExerciseRest(x, entry.id, e.target.value === '' ? null : Number(e.target.value)))}>
          <option value="">{w.restSeconds ? `As set below (${clock(w.restSeconds)})` : 'As set below (off)'}</option>
          {[0, 30, 45, 60, 90, 120, 150, 180, 240, 300].map(sec => <option key={sec} value={sec}>{sec ? clock(sec) : 'Off'}</option>)}
        </select></label>
      {entry.restSeconds !== undefined && <span className="fine">{restFor(w, entry) ? `${clock(restFor(w, entry))} for this exercise` : 'No rest timer for this exercise'}</span>}
    </div>
    {entry.measure === 'weight-reps' && <details className="workouts-tools-sheet" onToggle={e => setTools((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Warm-up and plates</summary>
      {tools && <Suspense fallback={<p className="fine">Opening…</p>}><WorkoutTools entry={entry} w={w} unit={unit} change={change}/></Suspense>}
    </details>}
  </article>;
}

function SetRow({entry, set, n, previous, unit, change, onDone, rpe, best}: {entry: ExerciseEntry; set: WorkoutSet; n: number; previous?: WorkoutSet; unit: 'kg' | 'lb'; change: (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean; onDone: () => void; rpe: boolean; best: SetBest | null}) {
  const m = entry.measure, label = `${entry.name}, set ${n}`;
  const [weight, setWeight] = useState(set.weightKg === undefined ? '' : weightPrefillText(set.weightKg, unit));
  const [reps, setReps] = useState(set.reps === undefined ? '' : String(set.reps)), [time, setTime] = useState(set.seconds ? clock(set.seconds) : ''), [dist, setDist] = useState(set.distanceKm === undefined ? '' : String(set.distanceKm));
  // Session AV lane 2 (body; LEDGER #202): added weight or help on a bodyweight set, in this exercise's unit.
  const load = m === 'reps' ? entry.load : undefined, loadKg = load === 'weighted' ? set.addedKg : load === 'assisted' ? set.assistKg : undefined;
  const [extra, setExtra] = useState(loadKg === undefined ? '' : weightPrefillText(loadKg, unit));
  const [problem, setProblem] = useState('');
  const read = (): Partial<WorkoutSet> | null => {
    const num = (v: string) => v.trim() === '' ? undefined : Number(v.replace(',', '.'));
    const kg = num(weight), r = num(reps), km = num(dist), sec = time.trim() ? readClock(time) : undefined;
    if (kg !== undefined && (!Number.isFinite(kg) || kg < 0 || fromUnit(kg, unit) > 1000)) { setProblem(`Enter a weight from 0 to ${unit === 'lb' ? '2,204' : '1,000'} ${unit}.`); return null; }
    if (r !== undefined && (!Number.isInteger(r) || r < 0 || r > 1000)) { setProblem('Enter whole reps from 0 to 1,000.'); return null; }
    if (km !== undefined && (!Number.isFinite(km) || km < 0 || km > 1000)) { setProblem('Enter a distance from 0 to 1,000 km.'); return null; }
    if (sec === null) { setProblem('Enter the time as minutes:seconds, such as 1:30.'); return null; }
    const ex = num(extra);
    if (load && ex !== undefined && (!Number.isFinite(ex) || ex < 0 || fromUnit(ex, unit) > 500)) { setProblem(`Enter the ${load === 'weighted' ? 'added weight' : 'help'} from 0 to ${unit === 'lb' ? '1,102' : '500'} ${unit}.`); return null; }
    setProblem('');
    return {...(load === 'weighted' ? {addedKg: ex === undefined ? undefined : fromUnit(ex, unit)} : load === 'assisted' ? {assistKg: ex === undefined ? undefined : fromUnit(ex, unit)} : {}),...(m === 'weight-reps' ? {weightKg: kg === undefined ? undefined : fromUnit(kg, unit)} : {}), ...(m === 'weight-reps' || m === 'reps' ? {reps: r} : {}), ...(m === 'time' || m === 'distance-time' ? {seconds: sec} : {}), ...(m === 'distance-time' ? {distanceKm: km} : {})};
  };
  const commit = () => { const patch = read(); if (patch) change(x => updateSet(x, entry.id, set.id, patch)); };
  const tick = () => {
    if (set.done) { change(x => updateSet(x, entry.id, set.id, {done: false})); return; }
    const patch = read(); if (!patch) return;
    if (!setReady(m, {...set, ...patch})) { setProblem(m === 'weight-reps' ? 'Enter the weight and the reps first.' : m === 'reps' ? 'Enter the reps first.' : m === 'time' ? 'Enter the time first.' : 'Enter the distance or the time first.'); return; }
    if (change(x => updateSet(x, entry.id, set.id, {...patch, done: true}))) onDone();
  };
  const fill = () => { if (!previous) return; if (load === 'weighted' && previous.addedKg !== undefined) setExtra(weightPrefillText(previous.addedKg, unit)); if (load === 'assisted' && previous.assistKg !== undefined) setExtra(weightPrefillText(previous.assistKg, unit)); if (previous.weightKg !== undefined) setWeight(weightPrefillText(previous.weightKg, unit)); if (previous.reps !== undefined) setReps(String(previous.reps)); if (previous.seconds) setTime(clock(previous.seconds)); if (previous.distanceKm !== undefined) setDist(String(previous.distanceKm)); };
  return <><tr data-done={set.done || undefined} data-kind={set.kind}>
    <th scope="row"><select className="workouts-kind" value={set.kind} aria-label={`${label}: type`} onChange={e => change(x => updateSet(x, entry.id, set.id, {kind: e.target.value as WorkoutSet['kind']}))}>{SET_KINDS.map(k => <option key={k} value={k}>{k === 'normal' ? String(n) : k === 'warmup' ? 'W' : k === 'drop' ? 'D' : 'F'}</option>)}</select><span className="sr-only">{KIND_WORDS[set.kind]}</span></th>
    <td>{previous ? <button className="text-link workouts-prev" type="button" onClick={fill} aria-label={`${label}: use last time, ${setText(m, previous, unit)}`}>{setText(m, previous, unit)}</button> : <span className="fine">—</span>}</td>
    {m === 'weight-reps' && <td><input className="workouts-num" inputMode="decimal" aria-label={`${label}: weight in ${unit}`} value={weight} onChange={e => setWeight(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {load && <td><input className="workouts-num" inputMode="decimal" aria-label={`${label}: ${load === 'weighted' ? 'added weight' : 'help'} in ${unit}`} value={extra} onChange={e => setExtra(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {m === 'distance-time' && <td><input className="workouts-num" inputMode="decimal" aria-label={`${label}: distance in km`} value={dist} onChange={e => setDist(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {(m === 'weight-reps' || m === 'reps') && <td><input className="workouts-num" inputMode="numeric" aria-label={`${label}: reps`} value={reps} onChange={e => setReps(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {(m === 'time' || m === 'distance-time') && <td><input className="workouts-num" inputMode="numeric" aria-label={`${label}: time, minutes:seconds`} placeholder="1:30" value={time} onChange={e => setTime(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {rpe && <td><select className="workouts-rpe" value={set.rpe === undefined ? '' : String(set.rpe)} aria-label={`${label}: RPE, how hard it felt`} title={set.rpe !== undefined ? RPE_WORDS[set.rpe] : undefined}
      onChange={e => change(x => setRpe(x, entry.id, set.id, e.target.value === '' ? null : Number(e.target.value)))}><option value="">—</option>{RPE_VALUES.map(v => <option key={v} value={v}>{v}</option>)}</select></td>}
    <td><button className="workouts-tick" type="button" aria-pressed={set.done} aria-label={set.done ? `${label} done; undo` : `Mark ${label} done`} onClick={tick}>✓</button>{best && <span className="workouts-set-best" title={`A new best: ${SET_BEST_WORDS[best]}`}><span aria-hidden="true">★</span><span className="sr-only">{label}: a new best, {SET_BEST_WORDS[best]}</span></span>}</td>
    <td><button className="quiet workouts-remove" type="button" aria-label={`Remove ${label}`} onClick={() => change(x => removeSet(x, entry.id, set.id), `Set ${n} of ${entry.name} removed.`, `Set ${n} of ${entry.name} is back.`)}>×</button></td>
  </tr>{problem && <tr className="workouts-problem"><td colSpan={8}><p role="alert">{problem}</p></td></tr>}</>;
}

function ExercisePicker({library, places, onPick, onCreate, onClose}: {library: LibraryExercise[]; places: WorkoutPlaces | null; onPick: (x: LibraryExercise) => void; onCreate: (input: {name: string; category: typeof CATEGORIES[number]; measure: Measure}) => void; onClose?: () => void}) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState<'' | typeof CATEGORIES[number]>(''), [measure, setMeasure] = useState<Measure>('weight-reps'), [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>('Full body');
  // Session AV lane 2 (bodymind-r2; LEDGER #239): only what the chosen place has (the place for now unless changed here).
  const [placeId, setPlaceId] = useState(places?.current ?? ''), at = places?.places.find(p => p.id === placeId) ?? null;
  const found = useMemo(() => searchExercises(library, query).filter(e => (!category || e.category === category) && availableWith(e.id, at ? at.equipment : null)).slice(0, 40), [library, query, category, at]);
  const exact = library.some(e => e.name.toLowerCase() === query.trim().toLowerCase());
  return <div className="workouts-picker" role="group" aria-label="Add an exercise">
    <div className="workouts-picker-filters">
      <label className="field"><span>Find an exercise</span><input type="search" value={query} maxLength={80} onChange={e => setQuery(e.target.value)} placeholder="Bench, squat, run…" autoFocus/></label>
      <label className="field"><span>Muscle group</span><select value={category} onChange={e => setCategory(e.target.value as typeof category)}><option value="">All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      {places && places.places.length > 0 && <label className="field"><span>Place</span><select value={placeId} onChange={e => setPlaceId(e.target.value)}><option value="">Any place</option>{places.places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    </div>
    {at && <p className="fine">Showing what {at.name} has, and your own exercises.</p>}
    <ul className="workouts-picker-list">{found.map(x => <li key={x.id}><button type="button" className="secondary" onClick={() => onPick(x)}><strong>{x.name}</strong><span>{x.category} · {MEASURE_WORDS[x.measure]}</span></button></li>)}</ul>
    {query.trim() && !exact && <div className="workouts-picker-new"><p>Not in the list? Add “{query.trim()}”.</p>
      <label className="field"><span>Muscle group</span><select value={newCategory} onChange={e => setNewCategory(e.target.value as typeof newCategory)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="field"><span>Each set records</span><select value={measure} onChange={e => setMeasure(e.target.value as Measure)}>{MEASURES.map(mm => <option key={mm} value={mm}>{MEASURE_WORDS[mm]}</option>)}</select></label>
      <button className="secondary" type="button" onClick={() => onCreate({name: query, category: newCategory, measure})}>Add “{query.trim().slice(0, 40)}”</button></div>}
    {onClose && <button className="text-link" type="button" onClick={onClose}>Close the list</button>}
  </div>;
}

function SaveRoutine({workout, onSave, compact = false}: {workout: Workout; onSave: (name: string) => void; compact?: boolean}) {
  const [name, setName] = useState(workout.name), [open, setOpen] = useState(!compact);
  if (!open) return <button className="secondary" type="button" onClick={() => setOpen(true)}>Save as routine</button>;
  return <form className="workouts-save-routine" onSubmit={e => { e.preventDefault(); onSave(name.trim()); if (compact) setOpen(false); }}>
    <label className="field"><span>Routine name</span><input value={name} maxLength={80} onChange={e => setName(e.target.value)}/></label>
    <button className="secondary" type="submit">Save as routine</button>
  </form>;
}

/**
 * Session AH (L1, as Multi's progression view): each session's best set, oldest to newest, as one line (estimated
 * one-rep max for weighted lifts; reps, time or distance otherwise), with the first and latest values written beside it
 * and the whole line described in words. Derived from the saved workouts; nothing is stored.
 */
// Session AV lane 2 (body; LEDGER #117, Hevy's per-exercise graphs): the same line for the heaviest set or the volume.
const METRIC_WORDS: Record<Exclude<SeriesMetric, 'reps'>, string> = {e1rm: 'Estimated 1-rep max', heaviest: 'Heaviest set', volume: 'Volume'};
function ProgressLine({h, unit, metric = 'e1rm'}: {h: NonNullable<ReturnType<typeof exerciseHistory>>; unit: 'kg' | 'lb'; metric?: Exclude<SeriesMetric, 'reps'>}) {
  if (h.measure === 'weight-reps' && metric !== 'e1rm') {
    const pts = exerciseSeries(h, metric).slice(-20);
    if (pts.length < 2) return <p className="fine">Two sessions with this exercise draw its line.</p>;
    const W = 300, H = 72, lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v)), span = hi - lo || 1, first = pts[0]!, last = pts.at(-1)!, label = METRIC_WORDS[metric].toLowerCase();
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1) * (W - 8) + 4).toFixed(1)} ${(H - 6 - (p.v - lo) / span * (H - 12)).toFixed(1)}`).join(' ');
    return <figure className="workouts-progress-line">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${METRIC_WORDS[metric]} over ${pts.length} sessions: ${weightShown(first.v, unit)} on ${formatDate(first.date)}, ${weightShown(last.v, unit)} on ${formatDate(last.date)}; highest ${weightShown(hi, unit)}.`}><path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/></svg>
      <figcaption className="fine">{`Progress, session by session (${label}): ${weightShown(first.v, unit)} on ${formatDate(first.date)} → ${weightShown(last.v, unit)} on ${formatDate(last.date)}`}</figcaption>
    </figure>;
  }
  const value = (s: (typeof h.sessions)[number]) => { const b = s.best; if (!b) return null; if (h.measure === 'weight-reps') return b.weightKg !== undefined && b.reps ? oneRepMax(b.weightKg, Math.min(b.reps, 12)) : null; if (h.measure === 'reps') return b.reps ?? null; if (h.measure === 'time') return b.seconds ?? null; return b.distanceKm ?? null; };
  const points = [...h.sessions].reverse().slice(-20).map(s => ({date: s.date, v: value(s)})).filter((p): p is {date: string; v: number} => typeof p.v === 'number' && p.v > 0);
  if (points.length < 2) return null;
  const shown = (v: number) => h.measure === 'weight-reps' ? estimateShown(v, unit) : h.measure === 'time' ? clock(v) : h.measure === 'reps' ? `${v} reps` : `${formatNumber(v, {maximumFractionDigits: 2})} km`;
  const W = 300, H = 72, lo = Math.min(...points.map(p => p.v)), hi = Math.max(...points.map(p => p.v)), span = hi - lo || 1;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${(i / (points.length - 1) * (W - 8) + 4).toFixed(1)} ${(H - 6 - (p.v - lo) / span * (H - 12)).toFixed(1)}`).join(' ');
  const first = points[0]!, last = points.at(-1)!;
  return <figure className="workouts-progress-line">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${h.measure === 'weight-reps' ? 'Estimated one-rep max' : 'Best set'} over ${points.length} sessions: ${shown(first.v)} on ${formatDate(first.date)}, ${shown(last.v)} on ${formatDate(last.date)}; highest ${shown(hi)}.`}><path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/></svg>
    <figcaption className="fine">{`Progress, session by session (${h.measure === 'weight-reps' ? 'estimated 1-rep max' : 'best set'}): ${shown(first.v)} on ${formatDate(first.date)} → ${shown(last.v)} on ${formatDate(last.date)}`}</figcaption>
  </figure>;
}
function ExerciseProgress({w, unit: pageUnit, library, value, onChange}: {w: Workouts; unit: 'kg' | 'lb'; library: LibraryExercise[]; value: string; onChange: (v: string) => void}) {
  const done = useMemo(() => [...new Set(finished(w).flatMap(x => x.exercises.map(e => e.exerciseId)))], [w]);
  const [metric, setMetric] = useState<Exclude<SeriesMetric, 'reps'>>('e1rm');
  if (!done.length) return null;
  const chosen = value && done.includes(value) ? value : done[0]!, h = exerciseHistory(w, chosen);
  // Session AV lane 2 (body; LEDGER #201): the chosen exercise in its own unit.
  const unit = unitFor(w, chosen, pageUnit);
  const name = (id: string) => library.find(e => e.id === id)?.name ?? finished(w).flatMap(x => x.exercises).find(e => e.exerciseId === id)?.name ?? id;
  return <section className="panel workouts-progress" aria-labelledby="workouts-progress-title">
    <h2 id="workouts-progress-title">Exercise history</h2>
    <label className="field"><span>Exercise</span><select value={chosen} onChange={e => onChange(e.target.value)}>{done.map(id => <option key={id} value={id}>{name(id)}</option>)}</select></label>
    {h && <><dl className="workouts-stats">
      {h.bestWeightKg !== null && <div><dt>Heaviest</dt><dd>{weightShown(h.bestWeightKg, unit)}</dd></div>}
      {h.bestOneRepMaxKg !== null && <div><dt>Estimated one-rep max</dt><dd>{/* Session AL fourth pass (N-MO-15): an estimate at the progress line's precision (79.2 kg, not 79.17 kg) */}{estimateShown(h.bestOneRepMaxKg, unit)}</dd><dd className="dd-note"><small>an estimate (Epley)</small></dd></div>}
      {h.mostReps !== null && <div><dt>Most reps</dt><dd>{h.mostReps}</dd></div>}
      {h.bestAddedKg !== null && <div><dt>Most weight added</dt><dd>{weightShown(h.bestAddedKg, unit)}</dd></div>}
      {h.leastAssistKg !== null && <div><dt>Least help</dt><dd>{weightShown(h.leastAssistKg, unit)}</dd><dd className="dd-note"><small>less is stronger</small></dd></div>}
      {h.longestSeconds !== null && <div><dt>Longest</dt><dd>{clock(h.longestSeconds)}</dd></div>}
      {h.farthestKm !== null && <div><dt>Farthest</dt><dd>{formatNumber(h.farthestKm, {maximumFractionDigits: 2})} km</dd></div>}
      <div><dt>Sessions</dt><dd>{h.sessions.length}</dd><dd className="dd-note"><small>last {formatDate(h.sessions[0]!.date)}</small></dd></div>
    </dl>
    {h.measure === 'weight-reps' && <div className="workouts-weeks-pick" role="group" aria-label="Line shows">{(Object.keys(METRIC_WORDS) as (keyof typeof METRIC_WORDS)[]).map(m => <button key={m} type="button" className="quiet" aria-pressed={metric === m} onClick={() => setMetric(m)}>{METRIC_WORDS[m]}</button>)}</div>}
    <ProgressLine h={h} unit={unit} metric={metric}/>
    <table className="workouts-history-table"><caption className="sr-only">{h.name}, last sessions</caption><thead><tr><th scope="col">Date</th><th scope="col">Best set</th><th scope="col">Sets</th>{h.measure === 'weight-reps' && <th scope="col">Volume</th>}</tr></thead>
      <tbody>{h.sessions.slice(0, 10).map(s => <tr key={s.workoutId}><th scope="row">{/* Session AV lane 2 (P-25): "Nov 21" (the year only when it is not this one) */}{formatDate(s.date, {year: s.date.slice(0, 4) === new Date().toISOString().slice(0, 4) ? false : undefined})}</th><td>{s.best ? setText(h.measure, s.best, unit) : '—'}</td><td>{s.sets.length}</td>{h.measure === 'weight-reps' && <td>{weightShown(s.volumeKg, unit)}</td>}</tr>)}</tbody></table></>}
  </section>;
}
