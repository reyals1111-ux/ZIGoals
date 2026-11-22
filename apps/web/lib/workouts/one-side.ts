import {plateLoad, WARMUP_STEPS, warmupRamp, type PlateLoad} from './depth';
import type {PlateSetup} from './schema';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #378, Bevel's single- and double-sided plate calculator): a plate set may be
 * "Loaded on one side" — a machine or a sled where every plate goes on one horn — with the machine's or sled's own weight
 * (`start`, 0 when not given) in the bar's place. The plates for the horn come from the same search as the bar's
 * (lib/workouts/depth.ts `plateLoad`: the nearest load the plates make, a tie to the lighter, the fewest plates), with every
 * plate of a pair free to go on the one horn. The warm-up ramp rounds to what that one horn can load. Pure.
 */
export const isOneSide = (s: PlateSetup) => s.oneSide === true;
/** What the load starts from: the machine's own weight on one side, else the bar. */
export const baseOf = (s: PlateSetup) => isOneSide(s) ? s.start ?? 0 : s.bar;
/** The search's view of one horn: the machine's weight as the "bar", each size's plates all on one side. */
const asTwoSided = (s: PlateSetup): PlateSetup => ({unit: s.unit, bar: s.start ?? 0, plates: s.plates.map(p => ({size: p.size, pairs: p.pairs * 2}))});
/** `perSide` is the plates on the horn; `total` is the machine's weight and those plates. */
export function oneSideLoad(target: number, setup: PlateSetup): PlateLoad {
  const base = setup.start ?? 0;
  if (!Number.isFinite(target) || target <= base) return {perSide: [], total: base, exact: Number.isFinite(target) && Math.abs(target - base) < 1e-9, belowBar: !(target >= base)};
  const r = plateLoad(base + 2 * (target - base), asTwoSided(setup)), side = r.perSide.reduce((t, x) => t + x, 0), total = Math.round((base + side) * 1000) / 1000;
  return {perSide: r.perSide, total, exact: Math.abs(total - target) < 1e-6, belowBar: false};
}
/** Plates for a set-up as it is kept: each side of a bar, or one horn. */
export const loadFor = (target: number, setup: PlateSetup): PlateLoad => isOneSide(setup) ? oneSideLoad(target, setup) : plateLoad(target, setup);
/** The warm-up ramp (bar × 10, 40 %, 60 %, 80 %) rounded to what the set-up loads; on one side the first step is the machine alone (left out at 0). */
export function rampFor(working: number, setup: PlateSetup): {weight: number; reps: number}[] {
  if (!isOneSide(setup)) return warmupRamp(working, setup);
  const base = setup.start ?? 0;
  if (!Number.isFinite(working) || working <= base) return [];
  const out: {weight: number; reps: number}[] = [];
  for (const {share, reps} of WARMUP_STEPS) {
    const weight = share === 0 ? base : oneSideLoad(working * share, setup).total;
    if ((share === 0 && base <= 0) || weight >= working || out.some(s => Math.abs(s.weight - weight) < 1e-9) || (share > 0 && weight <= base)) continue;
    out.push({weight, reps});
  }
  return out;
}
