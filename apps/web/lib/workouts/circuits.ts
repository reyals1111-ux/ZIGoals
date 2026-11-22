import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {EXERCISES} from './library';
import {workoutsSchema, type Workout, type Workouts} from './schema';

/**
 * Session AV lane 2 (health r3; LEDGER #289, Nike Training Club's self-guided timed workouts; TIER 3 (stored format), a new
 * device record): a circuit of timed moves from the library's own exercises — work seconds, rest seconds, rounds and a
 * longer rest between rounds — played with a countdown, the next move named and a bell, saved like a routine, and logged
 * as a workout with its minutes. Never calories. Its own key, loose and versioned (routines are sets × reps, a strict
 * shape older builds read). Device-only. Pure.
 */
export const CIRCUITS_KEY = 'zigoals:workout-circuits:v1';
export const MAX_CIRCUITS = 30, MAX_MOVES = 12, CIRCUIT_NAME_MAX = 60;
export const LIMITS = {work: [5, 600], rest: [0, 300], rounds: [1, 20], roundRest: [0, 600]} as const;
const moveSchema = z.looseObject({exerciseId: z.string().regex(/^[a-z0-9-]{1,80}$/)});
const circuitSchema = z.looseObject({
  id: z.string().regex(/^circuit-[a-z0-9-]{4,60}$/),
  name: z.string().trim().min(1).max(CIRCUIT_NAME_MAX),
  moves: z.array(moveSchema).min(1).max(MAX_MOVES),
  workSeconds: z.number().int().min(LIMITS.work[0]).max(LIMITS.work[1]),
  restSeconds: z.number().int().min(LIMITS.rest[0]).max(LIMITS.rest[1]),
  rounds: z.number().int().min(LIMITS.rounds[0]).max(LIMITS.rounds[1]),
  roundRestSeconds: z.number().int().min(LIMITS.roundRest[0]).max(LIMITS.roundRest[1]),
  createdAt: z.iso.datetime(),
});
export type Circuit = z.infer<typeof circuitSchema>;
const readable = z.preprocess(v => Array.isArray(v) ? v.filter(x => circuitSchema.safeParse(x).success).slice(0, MAX_CIRCUITS) : v, z.array(circuitSchema).max(MAX_CIRCUITS));
export const circuitsSchema = z.looseObject({version: z.literal(1), circuits: readable.default([])});
export type Circuits = z.infer<typeof circuitsSchema>;
export const emptyCircuits = (): Circuits => ({version: 1, circuits: []});
export const CIRCUITS: DeviceRecordSpec<Circuits> = {key: CIRCUITS_KEY, schema: circuitsSchema, empty: emptyCircuits};

/** The moves a circuit can use: the library's exercises done for a time or for reps (not distance cardio). */
export const CIRCUIT_MOVES = EXERCISES.filter(e => e.measure !== 'distance-time');
export const moveName = (id: string) => EXERCISES.find(e => e.id === id)?.name ?? id;

export type CircuitDraft = {name: string; moves: string[]; work: string; rest: string; rounds: string; roundRest: string};
export type CircuitIssue = {field: 'name' | 'moves' | 'work' | 'rest' | 'rounds' | 'roundRest'; message: string};
const whole = (raw: string, [lo, hi]: readonly [number, number]) => { const t = raw.trim(); return /^\d{1,4}$/.test(t) && Number(t) >= lo && Number(t) <= hi ? Number(t) : null; };
/** Saves a circuit from the form (new, or `id`'s), or says which field to fix. */
export function saveCircuit(rec: Circuits, d: CircuitDraft, now: string, id?: string): {ok: true; value: Circuits; circuit: Circuit} | {ok: false; issue: CircuitIssue} {
  const name = d.name.trim();
  if (!name || !/[\p{L}\p{N}]/u.test(name)) return {ok: false, issue: {field: 'name', message: 'Give the circuit a name, like “Twenty-minute legs”.'}};
  if (name.length > CIRCUIT_NAME_MAX) return {ok: false, issue: {field: 'name', message: `Keep the name to ${CIRCUIT_NAME_MAX} characters or fewer.`}};
  const moves = d.moves.filter(m => CIRCUIT_MOVES.some(e => e.id === m));
  if (!moves.length) return {ok: false, issue: {field: 'moves', message: 'Add at least one move.'}};
  if (moves.length > MAX_MOVES) return {ok: false, issue: {field: 'moves', message: `Up to ${MAX_MOVES} moves in a circuit.`}};
  const work = whole(d.work, LIMITS.work), rest = whole(d.rest, LIMITS.rest), rounds = whole(d.rounds, LIMITS.rounds), roundRest = whole(d.roundRest, LIMITS.roundRest);
  if (work === null) return {ok: false, issue: {field: 'work', message: `Work is ${LIMITS.work[0]} to ${LIMITS.work[1]} seconds.`}};
  if (rest === null) return {ok: false, issue: {field: 'rest', message: `Rest is 0 to ${LIMITS.rest[1]} seconds.`}};
  if (rounds === null) return {ok: false, issue: {field: 'rounds', message: `Rounds are 1 to ${LIMITS.rounds[1]}.`}};
  if (roundRest === null) return {ok: false, issue: {field: 'roundRest', message: `Rest between rounds is 0 to ${LIMITS.roundRest[1]} seconds.`}};
  if (!id && rec.circuits.length >= MAX_CIRCUITS) return {ok: false, issue: {field: 'name', message: `Up to ${MAX_CIRCUITS} circuits: remove one first.`}};
  const was = id ? rec.circuits.find(c => c.id === id) : undefined;
  const circuit: Circuit = {id: was?.id ?? `circuit-${now.replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`, name, moves: moves.map(exerciseId => ({exerciseId})), workSeconds: work, restSeconds: rest, rounds, roundRestSeconds: roundRest, createdAt: was?.createdAt ?? now};
  const circuits = was ? rec.circuits.map(c => c.id === was.id ? circuit : c) : [...rec.circuits, circuit];
  return {ok: true, value: circuitsSchema.parse({...rec, circuits}), circuit};
}
export const removeCircuit = (rec: Circuits, id: string): Circuits => circuitsSchema.parse({...rec, circuits: rec.circuits.filter(c => c.id !== id)});
export const restoreCircuit = (rec: Circuits, c: Circuit, at: number): Circuits => rec.circuits.some(x => x.id === c.id) ? rec : circuitsSchema.parse({...rec, circuits: [...rec.circuits.slice(0, at), c, ...rec.circuits.slice(at)]});

/** One stretch of the timeline: a move's work, the rest after it, or the rest between rounds. */
export type Phase = {kind: 'work' | 'rest' | 'round-rest'; seconds: number; round: number; move: number; exerciseId: string; startsAt: number};
/** Every phase in order. No rest after the very last move; the rest after a round's last move is the round rest when set. */
export function timeline(c: Pick<Circuit, 'moves' | 'workSeconds' | 'restSeconds' | 'rounds' | 'roundRestSeconds'>): Phase[] {
  const out: Phase[] = []; let t = 0;
  for (let r = 1; r <= c.rounds; r++) c.moves.forEach((m, i) => {
    out.push({kind: 'work', seconds: c.workSeconds, round: r, move: i, exerciseId: m.exerciseId, startsAt: t}); t += c.workSeconds;
    const lastMove = i === c.moves.length - 1, last = lastMove && r === c.rounds;
    if (last) return;
    const rest = lastMove && c.roundRestSeconds > 0 ? {kind: 'round-rest' as const, seconds: c.roundRestSeconds} : c.restSeconds > 0 ? {kind: 'rest' as const, seconds: c.restSeconds} : null;
    if (rest) { const next = lastMove ? c.moves[0]! : c.moves[i + 1]!; out.push({...rest, round: r, move: i, exerciseId: next.exerciseId, startsAt: t}); t += rest.seconds; }
  });
  return out;
}
export const totalSeconds = (c: Parameters<typeof timeline>[0]) => { const t = timeline(c); const last = t.at(-1); return last ? last.startsAt + last.seconds : 0; };
/** Where the player is after `elapsed` seconds: the phase, its seconds left, and the next work move (null at the end). */
export function positionAt(phases: readonly Phase[], elapsed: number): {index: number; phase: Phase; left: number; next: Phase | null} | null {
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i]!;
    if (elapsed < p.startsAt + p.seconds) return {index: i, phase: p, left: Math.ceil(p.startsAt + p.seconds - elapsed), next: phases.slice(i + 1).find(x => x.kind === 'work') ?? null};
  }
  return null;
}
/** "Squat, round 2 of 3" / "Rest: next is Push-up" — what a phase change says aloud. */
export function phaseWords(p: Phase, rounds: number, next: Phase | null): string {
  if (p.kind === 'work') return `${moveName(p.exerciseId)}, ${p.seconds} seconds, round ${p.round} of ${rounds}.${next ? ` Next: ${moveName(next.exerciseId)}.` : ' The last move.'}`;
  return `${p.kind === 'round-rest' ? 'Rest between rounds' : 'Rest'}, ${p.seconds} seconds. Next: ${moveName(p.exerciseId)}.`;
}
/** "8 moves × 3 rounds · 40 s on, 20 s off · about 24 min". */
export function circuitLine(c: Circuit): string {
  const m = Math.max(1, Math.round(totalSeconds(c) / 60));
  return `${c.moves.length} ${c.moves.length === 1 ? 'move' : 'moves'} × ${c.rounds} ${c.rounds === 1 ? 'round' : 'rounds'} · ${c.workSeconds} s on, ${c.restSeconds} s off${c.roundRestSeconds ? ` · ${c.roundRestSeconds} s between rounds` : ''} · about ${m} min`;
}
/**
 * The circuit done, as a finished workout: one exercise per move with one timed set per round it was reached in (each the
 * work seconds), from `startedAt` for the seconds played. No calories, no weights.
 */
export function circuitWorkout(w: Workouts, c: Circuit, input: {date: string; startedAt: Date; playedSeconds: number}): {workouts: Workouts; workout: Workout} {
  const phases = timeline(c).filter(p => p.kind === 'work' && p.startsAt < input.playedSeconds);
  if (!phases.length) throw Error('Play at least one move before logging the circuit.');
  const uid = (p: string) => `${p}-${crypto.randomUUID()}`;
  const exercises = c.moves.map((m, i) => ({m, sets: phases.filter(p => p.move === i)})).filter(x => x.sets.length).map(({m, sets}) => ({
    id: uid('ex'), exerciseId: m.exerciseId, name: moveName(m.exerciseId), measure: 'time' as const,
    sets: sets.map(p => ({id: uid('set'), kind: 'normal' as const, seconds: Math.min(p.seconds, Math.max(1, Math.round(input.playedSeconds - p.startsAt))), done: true})),
  }));
  const endedAt = new Date(input.startedAt.getTime() + Math.max(60, Math.round(input.playedSeconds)) * 1000);
  const workout = {id: uid('workout'), name: c.name, date: input.date, type: 'strength' as const, startedAt: input.startedAt.toISOString(), endedAt: endedAt.toISOString(), exercises, notes: `Timed circuit: ${circuitLine(c)}.`};
  const parsed = workoutsSchema.parse({...w, workouts: [...w.workouts, workout]});
  return {workouts: parsed, workout: parsed.workouts.at(-1)!};
}
/**
 * The player's buttons for its state (review B3B-12): once the run is logged (or done) it cannot be resumed or skipped on,
 * since that time would never be logged; Log only once something is played and not yet logged.
 */
export function playerControls(state: {done: boolean; logged: boolean; elapsed: number}): {pause: boolean; skip: boolean; log: boolean; close: 'Close' | 'Stop without logging'} {
  const ended = state.done || state.logged;
  return {pause: !ended, skip: !ended, log: !state.logged && state.elapsed > 0, close: ended ? 'Close' : 'Stop without logging'};
}
