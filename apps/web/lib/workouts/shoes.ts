import {finished} from './engine';
import {runBests, HALF_MARATHON_KM} from './run-bests';
import {workoutsSchema, type Shoe, type Workouts} from './schema';
import type {SplitsRecord} from './splits-schema';
import {distanceOf} from './weekly';

/**
 * Session AV lane 2 (body; LEDGER #203 Nike Run Club's shoe tagging, #204 its personal-record achievements): shoes with
 * the distance they had when added, a distance to retire them at, the runs they were picked on and a note near the limit;
 * and the running bests not yet marked, so a beaten best is marked once, quietly. Pure.
 */
export const MAX_SHOES = 30, NEAR_SHARE = 0.9, DEFAULT_RETIRE_KM = 700;
export function addShoe(w: Workouts, input: {name: string; startKm: number; retireKm: number}, now: Date): {workouts: Workouts; shoe: Shoe} {
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!name) throw Error('Name the shoes, such as “Blue trainers”.');
  if (!(input.startKm >= 0 && input.startKm <= 20_000)) throw Error('Enter the distance they already have, from 0 to 20,000 km.');
  if (!(input.retireKm >= 50 && input.retireKm <= 20_000)) throw Error('Enter a distance to retire them at, from 50 to 20,000 km.');
  const shoes = w.shoes ?? [];
  if (shoes.length >= MAX_SHOES) throw Error(`Up to ${MAX_SHOES} pairs fit. Remove a retired pair first.`);
  const shoe: Shoe = {id: `shoe-${crypto.randomUUID()}`, name, startKm: Math.round(input.startKm * 10) / 10, retireKm: Math.round(input.retireKm), createdAt: now.toISOString()};
  return {workouts: workoutsSchema.parse({...w, shoes: [...shoes, shoe]}), shoe};
}
export const retireShoe = (w: Workouts, id: string, now: Date, retired = true) => workoutsSchema.parse({...w, shoes: (w.shoes ?? []).map(s => { if (s.id !== id) return s; const {retiredAt: _r, ...rest} = s; void _r; return retired ? {...rest, retiredAt: now.toISOString()} : rest; })});
/** Removes a pair; the runs picked on it keep their distance and lose the pair. */
export function removeShoe(w: Workouts, id: string): Workouts {
  return workoutsSchema.parse({...w, shoes: (w.shoes ?? []).filter(s => s.id !== id), workouts: w.workouts.map(x => { if (x.shoeId !== id) return x; const {shoeId: _s, ...rest} = x; void _s; return rest; })});
}
/** Picks the shoes of a run (null: none). */
export function setRunShoe(w: Workouts, workoutId: string, shoeId: string | null): Workouts {
  if (shoeId && !(w.shoes ?? []).some(s => s.id === shoeId)) throw Error('These shoes are no longer here.');
  return workoutsSchema.parse({...w, workouts: w.workouts.map(x => { if (x.id !== workoutId) return x; const {shoeId: _s, ...rest} = x; void _s; return shoeId ? {...rest, shoeId} : rest; })});
}
export type ShoeState = {shoe: Shoe; runs: number; km: number; share: number; near: boolean; over: boolean; lastRun: string | null};
export function shoeStates(w: Workouts): ShoeState[] {
  const runs = finished(w);
  return (w.shoes ?? []).map(shoe => {
    const mine = runs.filter(x => x.shoeId === shoe.id), km = Math.round((shoe.startKm + mine.reduce((t, x) => t + distanceOf(x), 0)) * 10) / 10;
    return {shoe, runs: mine.length, km, share: Math.min(1, km / shoe.retireKm), near: km >= shoe.retireKm * NEAR_SHARE && km < shoe.retireKm, over: km >= shoe.retireKm, lastRun: mine[0]?.date ?? null};
  });
}
/** The pair picked on the latest run that is still in use: the one a new run most likely uses. */
export const usualShoe = (w: Workouts): Shoe | null => { const active = (w.shoes ?? []).filter(s => !s.retiredAt); const last = finished(w).find(x => x.shoeId && active.some(s => s.id === x.shoeId)); return active.find(s => s.id === last?.shoeId) ?? active[0] ?? null; };

/** A run just added takes the usual pair (the one on the latest run still in use) unless it has one; anything else is left. */
export function withUsualShoe(w: Workouts, workoutId: string): Workouts {
  const x = w.workouts.find(y => y.id === workoutId), shoe = usualShoe(w);
  return x && shoe && !x.shoeId && distanceOf(x, 'run') > 0 ? setRunShoe(w, workoutId, shoe.id) : w;
}

// ── Run bests marked once (LEDGER #204) ─────────────────────────────────────────────────────────────────────────────
export type BestKey = string;
const keyOf = (workoutId: string, km: number) => `${workoutId}:${km === HALF_MARATHON_KM ? '21.0975' : km}`;
/** The current running bests, each with its key ("<workout id>:<km>", the longest run as km 0). */
export function bestKeys(w: Workouts, splits: SplitsRecord | null): {key: BestKey; km: number; seconds: number | null; date: string; name: string}[] {
  const b = runBests(w, splits);
  return [...b.timed.map(t => ({key: keyOf(t.workoutId, t.km), km: t.km, seconds: t.seconds, date: t.date, name: t.name})), ...(b.longest ? [{key: keyOf(b.longest.workoutId, 0), km: b.longest.km, seconds: null, date: b.longest.date, name: b.longest.name}] : [])];
}
/**
 * The bests to mark: those not seen yet. Before the first run is added with this mark in place there is no `seenBests`,
 * so nothing is marked (bests from before it existed are never celebrated); `seedSeen` then keeps the bests as they were.
 */
export function freshBests(w: Workouts, splits: SplitsRecord | null): ReturnType<typeof bestKeys> {
  const seen = w.seenBests;
  return seen ? bestKeys(w, splits).filter(b => !seen.includes(b.key)) : [];
}
/** On adding a run: the first time, the bests as they were before it are kept as seen, so only a best it beats is marked. */
export function seedSeen(before: Workouts, after: Workouts, splits: SplitsRecord | null): Workouts {
  if (after.seenBests) return after;
  return workoutsSchema.parse({...after, seenBests: bestKeys(before, splits).map(b => b.key).slice(-100)});
}
/** "Noted": every current best is seen. */
export function markSeen(w: Workouts, splits: SplitsRecord | null): Workouts {
  return workoutsSchema.parse({...w, seenBests: [...new Set([...(w.seenBests ?? []), ...bestKeys(w, splits).map(b => b.key)])].slice(-100)});
}
