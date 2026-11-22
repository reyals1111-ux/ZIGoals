import {EXERCISES} from './library';
import {availableWith} from './equipment';
import type {Guide} from './routine-library';
import type {CATEGORIES} from './schema';

/**
 * Session AV lane 2 (health r3; LEDGER #288, Nike Training Club's workouts by length, muscle and place): filters on the
 * ready-made routines — up to 30, 45 or 60 minutes, a main muscle group, the level, and a place's equipment (every
 * exercise of the routine can be done there). Derived from the written routines; nothing stored. Pure.
 */
export type Muscle = (typeof CATEGORIES)[number];
export const LENGTHS = [30, 45, 60] as const;
export type LibraryFilter = {maxMinutes: number | null; muscle: Muscle | null; level: Guide['level'] | null; equipment: readonly string[] | null};
export const NO_FILTER: LibraryFilter = {maxMinutes: null, muscle: null, level: null, equipment: null};
export const MUSCLE_NL: Record<Muscle, string> = {Chest: 'Borst', Back: 'Rug', Legs: 'Benen', Shoulders: 'Schouders', Arms: 'Armen', Core: 'Romp', 'Full body': 'Heel lichaam', Cardio: 'Conditie', Mobility: 'Mobiliteit'};
const categoryOf = (id: string): Muscle | null => EXERCISES.find(e => e.id === id)?.category ?? null;
/** A routine's main muscle groups: those with at least a quarter of its sets, the most sets first. */
export function mainMuscles(g: Guide): Muscle[] {
  const sets = new Map<Muscle, number>(), total = g.exercises.reduce((n, x) => n + x.sets, 0);
  for (const x of g.exercises) { const c = categoryOf(x.exerciseId); if (c) sets.set(c, (sets.get(c) ?? 0) + x.sets); }
  return [...sets].filter(([, n]) => n * 4 >= total).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}
/** Whether every exercise of the routine can be done with this equipment (null: any place). */
export const fitsPlace = (g: Guide, equipment: readonly string[] | null) => g.exercises.every(x => availableWith(x.exerciseId, equipment));
export function filterGuides(guides: readonly Guide[], f: LibraryFilter): Guide[] {
  return guides.filter(g => (f.maxMinutes === null || g.minutes <= f.maxMinutes) && (f.muscle === null || mainMuscles(g).includes(f.muscle)) && (f.level === null || g.level === f.level) && fitsPlace(g, f.equipment));
}
/** The muscle groups some routine has as a main one, in the library's order. */
export function musclesInUse(guides: readonly Guide[]): Muscle[] {
  const used = new Set(guides.flatMap(mainMuscles)), order: readonly Muscle[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body', 'Cardio', 'Mobility'];
  return order.filter(m => used.has(m));
}
export const anyFilter = (f: LibraryFilter) => f.maxMinutes !== null || f.muscle !== null || f.level !== null || f.equipment !== null;
